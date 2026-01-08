const fs = require("fs")
const PizZip = require("pizzip")

// プレースホルダーのマッピング
const PLACEHOLDER_MAP = {
  "★★★★★★★★★★": "{companyName}",
  "■■■■■■■■■■": "{address}",
  "〇〇〇〇〇〇〇〇〇〇": "{representativeName}",
  "▲▲▲▲▲▲▲▲▲▲": "{postalCode}",
}

function convertPlaceholders(inputPath, outputPath) {
  console.log(`Converting: ${inputPath}`)
  console.log(`Output to: ${outputPath}`)

  // テンプレートファイルを読み込む
  const content = fs.readFileSync(inputPath, "binary")
  const zip = new PizZip(content)

  // document.xmlを取得
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found")
  }

  console.log(`  Original XML length: ${documentXml.length}`)

  // シンプルに文字列置換
  for (const [oldPlaceholder, newPlaceholder] of Object.entries(PLACEHOLDER_MAP)) {
    const beforeLength = documentXml.length
    const beforeCount = (documentXml.match(new RegExp(oldPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length

    // グローバル置換
    documentXml = documentXml.split(oldPlaceholder).join(newPlaceholder)

    const afterLength = documentXml.length
    const afterCount = (documentXml.match(new RegExp(newPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length

    console.log(`  ${oldPlaceholder}: found ${beforeCount} occurrences, replaced ${afterCount} times`)
  }

  console.log(`  Modified XML length: ${documentXml.length}`)

  // 修正したXMLを書き戻す
  zip.file("word/document.xml", documentXml)

  // 新しいDOCXファイルとして保存
  const outputBuffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  })

  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`✓ Conversion completed: ${outputPath}\n`)
}

// 送付状を変換
convertPlaceholders(
  "templates/cover_letter_template_original.docx",
  "templates/invoice_template.docx"
)

// 契約書を変換
convertPlaceholders(
  "templates/contract_template_original.docx",
  "templates/contract_template.docx"
)

console.log("All templates converted successfully!")
