const fs = require("fs")
const PizZip = require("pizzip")

const filePath = "C:\\Users\\takag\\Downloads\\送付状(★★★★★★★★★★様).docx"

console.log("Analyzing date placeholder in 送付状...\n")

const content = fs.readFileSync(filePath, "binary")
const zip = new PizZip(content)
const documentXml = zip.file("word/document.xml")?.asText()

if (!documentXml) {
  throw new Error("document.xml not found")
}

// ▼を含む<w:t>タグを全て抽出
const regex = /<w:t[^>]*>[^<]*▼[^<]*<\/w:t>/g
const matches = documentXml.match(regex)

console.log("Found <w:t> tags containing ▼:")
if (matches) {
  matches.forEach((match, i) => {
    const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
    if (textMatch) {
      const text = textMatch[1]
      console.log(`  [${i + 1}] "${text}" (length: ${text.length})`)
    }
  })
} else {
  console.log("  None found")
}

// documentXml全体で▼の出現回数をカウント
const allMatches = documentXml.match(/▼/g)
if (allMatches) {
  console.log(`\nTotal ▼ count in XML: ${allMatches.length}`)
}

// 前後100文字を含めて▼の部分を表示
const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
const texts = []
let match
while ((match = textRegex.exec(documentXml)) !== null) {
  texts.push(match[1])
}
const fullText = texts.join("")

const dateIndex = fullText.indexOf("▼")
if (dateIndex !== -1) {
  const start = Math.max(0, dateIndex - 50)
  const end = Math.min(fullText.length, dateIndex + 60)
  console.log("\nContext around ▼:")
  console.log(`  "${fullText.substring(start, end)}"`)
}
