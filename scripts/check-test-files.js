const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 生成されたテストファイルの内容を詳細確認するスクリプト
 */

function checkFile(filePath, name) {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`確認中: ${name}`)
  console.log(`ファイル: ${filePath}`)
  console.log("=".repeat(70))

  if (!fs.existsSync(filePath)) {
    console.error(`✗ ファイルが見つかりません: ${filePath}`)
    return
  }

  const content = fs.readFileSync(filePath, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xml not found")
    return
  }

  // <w:t>タグのテキストを抽出（最初の30個）
  console.log("\n【<w:t>タグのテキスト順序】")
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  let index = 0

  while ((match = textRegex.exec(documentXml)) !== null && index < 30) {
    const text = match[1]
    if (text.trim()) {
      const displayText = text.length > 100 ? text.substring(0, 100) + "..." : text
      console.log(`  [${index}] ${displayText}`)
      index++
    }
  }

  // 文字化けチェック
  console.log("\n【文字化けチェック】")
  const garbledPatterns = [/�/g, /\?{3,}/g]
  let hasGarbled = false

  garbledPatterns.forEach(pattern => {
    const matches = documentXml.match(pattern)
    if (matches) {
      console.log(`  ⚠ 文字化けパターンが検出されました: ${pattern} (${matches.length}箇所)`)
      hasGarbled = true
    }
  })

  if (!hasGarbled) {
    console.log("  ✓ 文字化けは検出されませんでした")
  }
}

console.log("=".repeat(70))
console.log("生成されたテストファイルの詳細確認")
console.log("=".repeat(70))

checkFile("public/generated/test_old_template.docx", "正常動作時のテンプレートで生成")
checkFile("public/generated/test_new_template.docx", "現在のテンプレートで生成")

console.log("\n" + "=".repeat(70))
console.log("確認完了")
console.log("=".repeat(70))
