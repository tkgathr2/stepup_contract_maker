const fs = require("fs")
const PizZip = require("pizzip")

function verifyTemplate(filePath, name) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`Verifying: ${name}`)
  console.log("=".repeat(60))

  const content = fs.readFileSync(filePath, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("document.xml not found")
    return
  }

  // テキストを抽出
  const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
  const texts = []
  let match
  while ((match = textRegex.exec(documentXml)) !== null) {
    texts.push(match[1])
  }

  const fullText = texts.join("")

  console.log("\nSearching for placeholders:")

  // docxtemplater形式のプレースホルダー
  const templatePlaceholders = ["{companyName}", "{address}", "{representativeName}", "{postalCode}"]
  templatePlaceholders.forEach(placeholder => {
    const found = fullText.includes(placeholder)
    const status = found ? "✓" : "✗"
    console.log(`  ${status} ${placeholder}`)
  })

  // 元のプレースホルダーが残っているか確認
  console.log("\nSearching for old placeholders (should not exist):")
  const oldPlaceholders = ["★★★★★★★★★★", "■■■■■■■■■■", "〇〇〇〇〇〇〇〇〇〇", "▲▲▲▲▲▲▲▲▲▲"]
  oldPlaceholders.forEach(placeholder => {
    const found = fullText.includes(placeholder)
    const status = found ? "✗ FOUND (should be replaced!)" : "✓ Not found"
    console.log(`  ${status} ${placeholder}`)
  })

  // 一部のテキストを表示
  console.log("\nSample text (first 300 chars):")
  console.log(fullText.substring(0, 300))
}

verifyTemplate("templates/invoice_template.docx", "Converted Cover Letter Template")
verifyTemplate("templates/contract_template.docx", "Converted Contract Template")
