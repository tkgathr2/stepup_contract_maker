const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 元のkazuko送付状テンプレートの構造を分析するスクリプト
 */

function analyzeKazukoInvoice() {
  console.log("=".repeat(70))
  console.log("元のkazuko送付状テンプレートの構造分析")
  console.log("=".repeat(70))

  const filePath = "C:\\Users\\takag\\00_dev\\kazuko_departure_watch\\テンプレート\\送付状(★★★★★★★★★★様).docx"

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

  // 特殊文字とその周辺テキストを抽出
  const specialChars = [
    "★★★★★★★★★★",
    "■■■■■■■■■■",
    "〇〇〇〇〇〇〇〇〇〇",
    "▲▲▲▲▲▲▲▲▲▲",
    "▼▼▼▼▼▼▼▼▼▼",
  ]

  console.log("\n【特殊文字とその周辺テキスト】")

  specialChars.forEach(char => {
    const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`(.{0,100})${escapedChar}(.{0,100})`, "s")
    const match = documentXml.match(regex)

    if (match) {
      const before = match[1].replace(/<[^>]+>/g, "").slice(-50)
      const after = match[2].replace(/<[^>]+>/g, "").slice(0, 50)
      console.log(`\n${char}:`)
      console.log(`  前: "${before}"`)
      console.log(`  後: "${after}"`)
    } else {
      console.log(`\n${char}: 見つかりませんでした`)
    }
  })

  // <w:t>タグ内のテキストを順番に抽出
  console.log("\n" + "=".repeat(70))
  console.log("【<w:t>タグのテキスト順序（特殊文字周辺のみ）】")
  console.log("=".repeat(70))

  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  let index = 0
  let foundSpecialChar = false
  const relevantTexts = []

  while ((match = textRegex.exec(documentXml)) !== null) {
    const text = match[1]
    if (text.trim()) {
      // 特殊文字またはその周辺のテキストを収集
      const hasSpecialChar = specialChars.some(char => text.includes(char) || text.includes(char[0]))
      if (hasSpecialChar || foundSpecialChar) {
        relevantTexts.push({ index, text })
        foundSpecialChar = hasSpecialChar

        if (relevantTexts.length > 30 && !hasSpecialChar) {
          break
        }
      }
      index++
    }
  }

  relevantTexts.forEach(({ index, text }) => {
    const hasSpecialChar = specialChars.some(char => text.includes(char) || text.includes(char[0]))
    const marker = hasSpecialChar ? "★" : " "
    // テキストが長すぎる場合は短縮
    const displayText = text.length > 50 ? text.substring(0, 50) + "..." : text
    console.log(`  ${marker} [${index}] ${displayText}`)
  })

  console.log("\n" + "=".repeat(70))
  console.log("分析完了")
  console.log("=".repeat(70))
}

analyzeKazukoInvoice()
