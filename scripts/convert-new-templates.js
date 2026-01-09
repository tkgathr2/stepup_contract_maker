const fs = require("fs")
const PizZip = require("pizzip")

// プレースホルダーのマッピング
const PLACEHOLDER_MAP = {
  "★★★★★★★★★★": "{companyName}",
  "■■■■■■■■■■": "{address}",
  "〇〇〇〇〇〇〇〇〇〇": "{representativeName}",
  "▲▲▲▲▲▲▲▲▲▲": "{postalCode}",
  "▼▼▼▼▼▼▼▼▼▼": "{currentDate}",
}

function convertTemplate(inputPath, outputPath, name) {
  console.log(`\nConverting: ${name}`)
  console.log(`  Input:  ${inputPath}`)
  console.log(`  Output: ${outputPath}`)

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
      documentXml = documentXml.split(oldPlaceholder).join(newPlaceholder)

      const afterCount = (documentXml.match(new RegExp(newPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
      console.log(`    ✓ ${oldPlaceholder} → ${newPlaceholder} (${beforeCount} times)`)
    }
  }

  // 修正したXMLを書き戻す
  zip.file("word/document.xml", documentXml)

  // 新しいDOCXファイルとして保存
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`  ✓ Saved: ${outputPath}`)
}

// 契約書を変換
convertTemplate(
  "C:\\Users\\takag\\Downloads\\人材紹介契約書(★★★★★★★★★★様).docx",
  "templates/contract_template.docx",
  "契約書"
)

// 送付状を変換
convertTemplate(
  "C:\\Users\\takag\\Downloads\\送付状(★★★★★★★★★★様).docx",
  "templates/invoice_template.docx",
  "送付状"
)

console.log("\n✓ All templates converted successfully!")
