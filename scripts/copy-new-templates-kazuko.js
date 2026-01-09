const fs = require("fs")
const PizZip = require("pizzip")

const sourceDir = "C:\\Users\\takag\\00_dev\\kazuko_departure_watch\\テンプレート"

console.log("テンプレートファイルをコピーして変換します...\n")

// ソースファイルの確認
const contractSource = `${sourceDir}\\人材紹介契約書(★★★★★★★★★★様).docx`
const invoiceSource = `${sourceDir}\\送付状(★★★★★★★★★★様).docx`

console.log("ソースファイル:")
console.log(`  契約書: ${contractSource}`)
console.log(`  送付状: ${invoiceSource}`)
console.log()

// ファイルの存在確認
if (!fs.existsSync(contractSource)) {
  console.error(`✗ 契約書ファイルが見つかりません: ${contractSource}`)
  process.exit(1)
}

if (!fs.existsSync(invoiceSource)) {
  console.error(`✗ 送付状ファイルが見つかりません: ${invoiceSource}`)
  process.exit(1)
}

console.log("✓ ソースファイルを確認しました\n")

// プレースホルダーのマッピング
const PLACEHOLDER_MAP = {
  "★★★★★★★★★★": "{companyName}",
  "■■■■■■■■■■": "{address}",
  "〇〇〇〇〇〇〇〇〇〇": "{representativeName}",
  "▲▲▲▲▲▲▲▲▲▲": "{postalCode}",
  "▼▼▼▼▼▼▼▼▼▼": "{currentDate}",
}

function convertTemplate(inputPath, outputPath, name) {
  console.log(`変換中: ${name}`)
  console.log(`  入力: ${inputPath}`)
  console.log(`  出力: ${outputPath}`)

  const content = fs.readFileSync(inputPath, "binary")
  const zip = new PizZip(content)
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found")
  }

  // プレースホルダーを置換
  for (const [oldPlaceholder, newPlaceholder] of Object.entries(PLACEHOLDER_MAP)) {
    const beforeCount = (documentXml.match(new RegExp(oldPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length

    if (beforeCount > 0) {
      // 分割されている可能性を考慮
      if (beforeCount === 0) {
        // 9個+1個のパターンを探す
        const partial = oldPlaceholder.substring(0, 9)
        const single = oldPlaceholder[0]

        documentXml = documentXml.replace(partial, `${newPlaceholder}_part1`)
        documentXml = documentXml.replace(single, `${newPlaceholder}_part2`)
        documentXml = documentXml.replace(`${newPlaceholder}_part1`, newPlaceholder)
        documentXml = documentXml.replace(`${newPlaceholder}_part2`, "")

        console.log(`    ✓ ${oldPlaceholder} → ${newPlaceholder} (分割パターン)`)
      } else {
        documentXml = documentXml.split(oldPlaceholder).join(newPlaceholder)
        console.log(`    ✓ ${oldPlaceholder} → ${newPlaceholder} (${beforeCount}回)`)
      }
    }
  }

  // 修正したXMLを書き戻す
  zip.file("word/document.xml", documentXml)

  // 新しいDOCXファイルとして保存
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`  ✓ 保存完了\n`)
}

// 契約書を変換
convertTemplate(contractSource, "templates/contract_template.docx", "契約書")

// 送付状を変換
convertTemplate(invoiceSource, "templates/invoice_template.docx", "送付状")

console.log("✓ すべてのテンプレートの変換が完了しました！")
