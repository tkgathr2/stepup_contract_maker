const fs = require("fs")
const PizZip = require("pizzip")

const invoiceSource = "C:\\Users\\takag\\00_dev\\kazuko_departure_watch\\テンプレート\\送付状(★★★★★★★★★★様).docx"

console.log("送付状の▼プレースホルダーを解析します...\n")

const content = fs.readFileSync(invoiceSource, "binary")
const zip = new PizZip(content)
const documentXml = zip.file("word/document.xml")?.asText()

if (!documentXml) {
  throw new Error("document.xml not found")
}

// ▼を含む<w:t>タグを全て抽出
const regex = /<w:t[^>]*>[^<]*▼[^<]*<\/w:t>/g
const matches = documentXml.match(regex)

console.log("▼を含む<w:t>タグ:")
if (matches) {
  matches.forEach((match, i) => {
    const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
    if (textMatch) {
      const text = textMatch[1]
      console.log(`  [${i + 1}] "${text}" (長さ: ${text.length})`)
    }
  })
} else {
  console.log("  見つかりませんでした")
}

// 全体での▼のカウント
const allMatches = documentXml.match(/▼/g)
if (allMatches) {
  console.log(`\n▼の総数: ${allMatches.length}`)
}
