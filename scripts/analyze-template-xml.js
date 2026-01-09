const fs = require("fs")
const PizZip = require("pizzip")

/**
 * テンプレートファイルのXML構造を詳細分析するスクリプト
 */

function analyzeTemplateXML(filePath) {
  console.log("=".repeat(70))
  console.log("テンプレートファイルのXML構造分析")
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

  // Paragraph構造を確認（プレースホルダーを含むもののみ）
  console.log("\n【Paragraph構造（プレースホルダーを含むもののみ）】")
  const paragraphRegex = /<w:p[^>]*>(.*?)<\/w:p>/gs
  let pMatch
  let pIndex = 0

  while ((pMatch = paragraphRegex.exec(documentXml)) !== null) {
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

    const combinedText = textInPara.join("")

    // プレースホルダーまたは特殊文字を含む場合のみ表示
    if (combinedText.includes("{") || combinedText.includes("}")) {
      console.log(`\n  Paragraph ${pIndex}:`)
      console.log(`    内容: ${combinedText}`)

      // プレースホルダーの種類を特定
      if (combinedText.includes("{currentDate}")) console.log(`    → 日付プレースホルダー`)
      if (combinedText.includes("{postalCode}")) console.log(`    → 郵便番号プレースホルダー`)
      if (combinedText.includes("{address}")) console.log(`    → 住所プレースホルダー`)
      if (combinedText.includes("{companyName}")) console.log(`    → 会社名プレースホルダー`)
      if (combinedText.includes("{representativeName}")) console.log(`    → 代表者名プレースホルダー`)
    }

    pIndex++
  }

  // 期待される順序と実際の順序を比較
  console.log("\n" + "=".repeat(70))
  console.log("【プレースホルダーの出現順序】")
  console.log("=".repeat(70))

  const placeholders = [
    "{currentDate}",
    "{postalCode}",
    "{address}",
    "{companyName}",
    "{representativeName}",
  ]

  placeholders.forEach((ph, index) => {
    const position = documentXml.indexOf(ph)
    if (position !== -1) {
      console.log(`  ${index + 1}. ${ph}: 位置 ${position}`)
    } else {
      console.log(`  ${index + 1}. ${ph}: ✗ 見つかりません`)
    }
  })

  console.log("\n" + "=".repeat(70))
  console.log("【期待される順序】")
  console.log("=".repeat(70))
  console.log("  1. {currentDate} - 日付")
  console.log("  2. {postalCode} - 郵便番号")
  console.log("  3. {address} - 住所")
  console.log("  4. {companyName} - 会社名")
  console.log("  5. {representativeName} - 代表者名（オプション）")
  console.log("\n※ 郵便番号は住所の前に配置される必要があります")
}

analyzeTemplateXML("templates/invoice_template.docx")
