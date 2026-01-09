const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 生成された送付状ファイルの内容を確認するスクリプト
 */

function checkGeneratedInvoice(filePath) {
  console.log("=".repeat(70))
  console.log("生成された送付状の内容確認")
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

  // プレースホルダーが残っているか確認
  const placeholders = ["{companyName}", "{postalCode}", "{address}", "{representativeName}", "{currentDate}"]
  console.log("\n【プレースホルダーの確認（残っている場合は置換失敗）】")

  let hasUnreplacedPlaceholder = false
  placeholders.forEach(placeholder => {
    if (documentXml.includes(placeholder)) {
      console.log(`  ✗ ${placeholder}: 置換されていません`)
      hasUnreplacedPlaceholder = true
    }
  })

  if (!hasUnreplacedPlaceholder) {
    console.log("  ✓ すべてのプレースホルダーが置換されています")
  }

  // テストデータの確認
  const testData = [
    "テスト会社ABC",
    "〒530-0001",
    "大阪府大阪市北区梅田1-1-1",
    "佐藤 花子",
    "2026"
  ]

  console.log("\n【テストデータの確認】")
  testData.forEach(data => {
    if (documentXml.includes(data)) {
      console.log(`  ✓ ${data}: 見つかりました`)
    } else {
      console.log(`  ✗ ${data}: 見つかりませんでした`)
    }
  })

  // <w:t>タグ内のテキストを順番に抽出（最初の50個）
  console.log("\n" + "=".repeat(70))
  console.log("【<w:t>タグのテキスト順序（最初の50個）】")
  console.log("=".repeat(70))

  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  let index = 0
  const texts = []

  while ((match = textRegex.exec(documentXml)) !== null && index < 50) {
    const text = match[1]
    if (text.trim()) {
      texts.push({ index, text })
      index++
    }
  }

  texts.forEach(({ index, text }) => {
    const displayText = text.length > 100 ? text.substring(0, 100) + "..." : text
    console.log(`  [${index}] ${displayText}`)
  })

  console.log("\n" + "=".repeat(70))
  console.log("確認完了")
  console.log("=".repeat(70))
}

// 最新の送付状ファイルを探す
const generatedDir = "public/generated"
const files = fs.readdirSync(generatedDir)
  .filter(f => f.startsWith("invoice_") && f.endsWith(".docx"))
  .map(f => ({
    name: f,
    path: `${generatedDir}/${f}`,
    mtime: fs.statSync(`${generatedDir}/${f}`).mtime,
  }))
  .sort((a, b) => b.mtime - a.mtime)

if (files.length === 0) {
  console.error("送付状ファイルが見つかりません")
  process.exit(1)
}

console.log(`\n最新の送付状ファイル: ${files[0].name}\n`)
checkGeneratedInvoice(files[0].path)
