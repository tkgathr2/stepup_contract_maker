const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 「令和」周辺のテキストを詳細確認
 */

function checkAroundReiwa() {
  console.log("=".repeat(70))
  console.log("「令和」周辺のテキスト確認")
  console.log("=".repeat(70))

  const templatePath = "templates/contract_template.docx"
  const content = fs.readFileSync(templatePath, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xml not found")
    return
  }

  // テキストを抽出
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  const allTexts = []

  while ((match = textRegex.exec(documentXml)) !== null) {
    const text = match[1]
    if (text.trim()) {
      allTexts.push(text)
    }
  }

  // 「令和」を含むテキストの位置を探す
  const reiwaIndex = allTexts.findIndex(t => t.includes("令和"))

  if (reiwaIndex === -1) {
    console.error("✗ 令和が見つかりません")
    return
  }

  console.log(`\n「令和」の位置: [${reiwaIndex}]`)
  console.log(`\n周辺20行のテキスト（前後10行）:`)

  for (let i = Math.max(0, reiwaIndex - 10); i <= Math.min(allTexts.length - 1, reiwaIndex + 10); i++) {
    const marker = i === reiwaIndex ? "📅" : "  "
    console.log(`  ${marker} [${i}] ${allTexts[i]}`)
  }

  // 日付が分割されている可能性を確認
  console.log(`\n【日付の分割パターン確認】`)
  const datePattern = allTexts.slice(reiwaIndex, reiwaIndex + 10).join("")
  console.log(`  連結したテキスト: "${datePattern}"`)

  // 「7」「12」「16」などの数字を探す
  console.log(`\n【数字を含むテキスト（令和の後10行）】`)
  for (let i = reiwaIndex; i <= Math.min(allTexts.length - 1, reiwaIndex + 10); i++) {
    const text = allTexts[i]
    if (/\d/.test(text) || text.includes("年") || text.includes("月") || text.includes("日")) {
      console.log(`    [${i}] ${text}`)
    }
  }

  console.log("\n" + "=".repeat(70))
}

checkAroundReiwa()
