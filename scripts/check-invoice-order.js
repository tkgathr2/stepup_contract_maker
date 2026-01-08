const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 送付状の表示順序を詳細確認するスクリプト
 */

function checkInvoiceOrder(filePath) {
  console.log("=".repeat(70))
  console.log("送付状の表示順序確認")
  console.log(`ファイル: ${filePath}`)
  console.log("=".repeat(70))

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

  // <w:t>タグのテキストを抽出（最初の20個）
  console.log("\n【送付状の表示順序（最初の20行）】")
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  let index = 0

  while ((match = textRegex.exec(documentXml)) !== null && index < 20) {
    const text = match[1]
    if (text.trim()) {
      const displayText = text.length > 100 ? text.substring(0, 100) + "..." : text

      // 重要な項目をハイライト
      let marker = " "
      if (text.includes("〒")) marker = "📮"
      else if (text.includes("都") || text.includes("府") || text.includes("県")) marker = "📍"
      else if (text.includes("御中")) marker = "🏢"
      else if (text.includes("/")) marker = "📅"

      console.log(`  ${marker} [${index}] ${displayText}`)
      index++
    }
  }

  // Paragraph構造を確認
  console.log("\n" + "=".repeat(70))
  console.log("【Paragraph構造の確認】")
  console.log("=".repeat(70))

  const paragraphRegex = /<w:p[^>]*>(.*?)<\/w:p>/gs
  let pMatch
  let pIndex = 0

  while ((pMatch = paragraphRegex.exec(documentXml)) !== null && pIndex < 10) {
    const paragraphContent = pMatch[1]
    const textInPara = []
    const textInParaRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let tMatch

    while ((tMatch = textInParaRegex.exec(paragraphContent)) !== null) {
      const text = tMatch[1]
      if (text.trim()) {
        textInPara.push(text)
      }
    }

    if (textInPara.length > 0) {
      const combinedText = textInPara.join("")
      if (combinedText.trim()) {
        console.log(`\n  Paragraph ${pIndex}:`)
        console.log(`    内容: ${combinedText}`)

        // プレースホルダーがあるか確認
        if (combinedText.includes("〒")) console.log(`    → 郵便番号`)
        if (combinedText.includes("都") || combinedText.includes("府") || combinedText.includes("県")) console.log(`    → 住所`)
        if (combinedText.includes("御中")) console.log(`    → 会社名`)
        if (combinedText.includes("/")) console.log(`    → 日付`)

        pIndex++
      }
    }
  }

  console.log("\n" + "=".repeat(70))
  console.log("【結論】")
  console.log("=".repeat(70))
  console.log("\n期待される順序:")
  console.log("  1. 📅 日付")
  console.log("  2. 📮 郵便番号（〒xxx-xxxx）")
  console.log("  3. 📍 住所")
  console.log("  4. 🏢 会社名 御中")
  console.log("\n上記の表示順序と一致しているか確認してください。")
}

// 最新の送付状ファイルを確認
const generatedDir = "public/generated"
const files = fs.readdirSync(generatedDir)
  .filter(f => f.startsWith("invoice_") && f.endsWith(".docx"))
  .map(f => ({
    name: f,
    path: `${generatedDir}/${f}`,
    mtime: fs.statSync(`${generatedDir}/${f}`).mtime,
  }))
  .sort((a, b) => b.mtime - a.mtime)

if (files.length === 0) {
  console.error("送付状ファイルが見つかりません")
  process.exit(1)
}

console.log(`\n最新の送付状ファイル: ${files[0].name}\n`)
checkInvoiceOrder(files[0].path)
