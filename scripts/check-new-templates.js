const fs = require("fs")
const PizZip = require("pizzip")

const files = [
  "C:\\Users\\takag\\Downloads\\人材紹介契約書(★★★★★★★★★★様).docx",
  "C:\\Users\\takag\\Downloads\\送付状(★★★★★★★★★★様).docx"
]

files.forEach(filePath => {
  console.log(`\nChecking: ${filePath}`)

  if (fs.existsSync(filePath)) {
    console.log("  ✓ File exists")

    const content = fs.readFileSync(filePath, "binary")
    const zip = new PizZip(content)
    const documentXml = zip.file("word/document.xml")?.asText()

    if (documentXml) {
      // テキスト抽出
      const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
      const texts = []
      let match
      while ((match = textRegex.exec(documentXml)) !== null) {
        texts.push(match[1])
      }
      const fullText = texts.join("")

      console.log("  Sample text (first 300 chars):")
      console.log("  " + fullText.substring(0, 300))

      // プレースホルダーを検索
      const placeholders = {
        "★★★★★★★★★★": "companyName",
        "■■■■■■■■■■": "address",
        "〇〇〇〇〇〇〇〇〇〇": "representativeName",
        "▲▲▲▲▲▲▲▲▲▲": "postalCode",
        "▼▼▼▼▼▼▼▼▼▼": "currentDate"
      }

      console.log("\n  Placeholders found:")
      for (const [placeholder, name] of Object.entries(placeholders)) {
        const count = (fullText.match(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
        if (count > 0) {
          console.log(`    ✓ ${placeholder} (${name}): ${count} times`)
        }
      }
    }
  } else {
    console.log("  ✗ File not found")
  }
})
