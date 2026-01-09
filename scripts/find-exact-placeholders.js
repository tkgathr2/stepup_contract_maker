const fs = require("fs")
const PizZip = require("pizzip")

function findPlaceholders(filePath, name) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`Analyzing: ${name}`)
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

  console.log("\nFull extracted text:")
  console.log(fullText)

  // 特殊文字のパターンを検索
  const patterns = [
    { name: "★ pattern", regex: /★+/g },
    { name: "■ pattern", regex: /■+/g },
    { name: "〇 pattern", regex: /〇+/g },
    { name: "▲ pattern", regex: /▲+/g },
  ]

  console.log("\n\nFound patterns:")
  patterns.forEach(({ name, regex }) => {
    const matches = fullText.match(regex)
    if (matches) {
      console.log(`\n${name}:`)
      matches.forEach((m, i) => {
        console.log(`  [${i + 1}] "${m}" (length: ${m.length})`)
      })
    }
  })
}

// 両方のテンプレートを解析
findPlaceholders(
  "templates/cover_letter_template_original.docx",
  "送付状 (Cover Letter)"
)

findPlaceholders(
  "templates/contract_template_original.docx",
  "契約書 (Contract)"
)
