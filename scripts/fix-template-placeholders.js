const fs = require("fs")
const PizZip = require("pizzip")
const path = require("path")

/**
 * テンプレートファイルのプレースホルダーを修正するスクリプト
 * 特殊文字を正しいプレースホルダーに置換します
 */

// プレースホルダーのマッピング
const PLACEHOLDER_MAP = {
  "★★★★★★★★★★": "{companyName}",
  "■■■■■■■■■■": "{address}",
  "〇〇〇〇〇〇〇〇〇〇": "{representativeName}",
  "▲▲▲▲▲▲▲▲▲▲": "{postalCode}",
  "▼▼▼▼▼▼▼▼▼▼": "{currentDate}",
}

function createBackup(filePath) {
  const backupPath = filePath.replace(".docx", ".backup.docx")
  if (fs.existsSync(backupPath)) {
    console.log(`  ℹ バックアップファイルは既に存在します: ${backupPath}`)
  } else {
    fs.copyFileSync(filePath, backupPath)
    console.log(`  ✓ バックアップを作成しました: ${backupPath}`)
  }
}

function fixTemplate(filePath, name) {
  console.log("\n" + "=".repeat(70))
  console.log(`修正中: ${name}`)
  console.log(`ファイル: ${filePath}`)
  console.log("=".repeat(70))

  if (!fs.existsSync(filePath)) {
    console.error(`✗ ファイルが見つかりません: ${filePath}`)
    return false
  }

  // バックアップを作成
  createBackup(filePath)

  // ファイルを読み込み
  const content = fs.readFileSync(filePath, "binary")
  const zip = new PizZip(content)
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xml not found")
    return false
  }

  console.log("\n【プレースホルダーの置換】")

  let modified = false

  // 各プレースホルダーを置換
  for (const [oldPlaceholder, newPlaceholder] of Object.entries(PLACEHOLDER_MAP)) {
    // まずは完全一致を探す
    const regex = new RegExp(oldPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
    const beforeCount = (documentXml.match(regex) || []).length

    if (beforeCount > 0) {
      documentXml = documentXml.split(oldPlaceholder).join(newPlaceholder)
      console.log(`  ✓ ${oldPlaceholder} → ${newPlaceholder} (${beforeCount}箇所)`)
      modified = true
    } else {
      // 分割されている可能性を確認（9個+1個のパターン）
      const partial9 = oldPlaceholder.substring(0, 9)
      const single = oldPlaceholder[0]

      // 9個のシンボルが存在するか確認
      const partial9Regex = new RegExp(partial9.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
      const partial9Count = (documentXml.match(partial9Regex) || []).length

      if (partial9Count > 0) {
        // 分割パターンを処理
        const tempPlaceholder1 = `__TEMP_${newPlaceholder}_PART1__`
        const tempPlaceholder2 = `__TEMP_${newPlaceholder}_PART2__`

        // 9個のシンボルを一時的なプレースホルダーに置換
        documentXml = documentXml.replace(partial9Regex, tempPlaceholder1)

        // 残りの1個のシンボルを探して一時的なプレースホルダーに置換
        const singleRegex = new RegExp(single.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        documentXml = documentXml.replace(singleRegex, tempPlaceholder2)

        // 一時的なプレースホルダーを結合
        documentXml = documentXml.replace(tempPlaceholder1, newPlaceholder)
        documentXml = documentXml.replace(tempPlaceholder2, "")

        console.log(`  ✓ ${oldPlaceholder} → ${newPlaceholder} (分割パターン)`)
        modified = true
      }
    }
  }

  if (!modified) {
    console.log("  ℹ 置換するプレースホルダーが見つかりませんでした")
    return true
  }

  // 修正したXMLを書き戻す
  zip.file("word/document.xml", documentXml)

  // 新しいDOCXファイルとして保存
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(filePath, outputBuffer)
  console.log(`\n  ✓ 修正を保存しました: ${filePath}`)

  return true
}

// メイン処理
console.log("=".repeat(70))
console.log("テンプレートファイルのプレースホルダー修正")
console.log("=".repeat(70))

const contractResult = fixTemplate("templates/contract_template.docx", "契約書")
const invoiceResult = fixTemplate("templates/invoice_template.docx", "送付状")

console.log("\n" + "=".repeat(70))
console.log("【総合結果】")
console.log("=".repeat(70))
console.log(`契約書: ${contractResult ? "✓ 修正完了" : "✗ 修正失敗"}`)
console.log(`送付状: ${invoiceResult ? "✓ 修正完了" : "✗ 修正失敗"}`)

if (contractResult && invoiceResult) {
  console.log("\n✓ すべてのテンプレートの修正が完了しました！")
  console.log("\n次のステップ:")
  console.log("  1. node scripts/verify-template-placeholders.js を実行して修正を確認")
  console.log("  2. 実際にPDFを生成して動作確認")
  process.exit(0)
} else {
  console.log("\n✗ 一部のテンプレートの修正に失敗しました")
  process.exit(1)
}
