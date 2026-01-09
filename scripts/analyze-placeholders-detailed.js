const fs = require("fs")
const PizZip = require("pizzip")

function analyzePlaceholders(filePath, name) {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`Analyzing: ${name}`)
  console.log("=".repeat(70))

  const content = fs.readFileSync(filePath, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("document.xml not found")
    return
  }

  // ★, ■, 〇, ▲ を含む部分を探す
  const symbols = ["★", "■", "〇", "▲"]

  symbols.forEach(symbol => {
    console.log(`\nSearching for symbol: ${symbol}`)

    // シンボルを含む<w:t>タグを全て抽出
    const regex = new RegExp(`<w:t[^>]*>[^<]*${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*</w:t>`, "g")
    const matches = documentXml.match(regex)

    if (matches) {
      console.log(`  Found ${matches.length} <w:t> tags containing "${symbol}":`)
      matches.forEach((match, i) => {
        // テキスト部分だけを抽出
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
        if (textMatch) {
          const text = textMatch[1]
          console.log(`    [${i + 1}] "${text}" (length: ${text.length}, charCodes: ${Array.from(text).map(c => c.charCodeAt(0)).join(', ')})`)
        }
      })
    } else {
      console.log(`  Not found in any <w:t> tag`)
    }

    // documentXml全体でシンボルの出現回数をカウント
    const allMatches = documentXml.match(new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))
    if (allMatches) {
      console.log(`  Total occurrences in XML: ${allMatches.length}`)
    }
  })
}

analyzePlaceholders("templates/cover_letter_template_original.docx", "送付状")
analyzePlaceholders("templates/contract_template_original.docx", "契約書")
