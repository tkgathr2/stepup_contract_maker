const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 生成された送付状に郵便番号が含まれているか確認
 */

async function verifyPostalCode() {
  console.log("=".repeat(70))
  console.log("生成済み送付状の郵便番号確認")
  console.log("=".repeat(70))

  // 最新の送付状ファイルを取得
  const generatedDir = "public/generated"

  if (!fs.existsSync(generatedDir)) {
    console.error("✗ public/generatedディレクトリが見つかりません")
    console.log("\n先にAPIを実行して送付状を生成してください:")
    console.log("  npm run dev")
    console.log("  http://localhost:3000 でフォームから生成")
    return
  }

  const files = fs.readdirSync(generatedDir)
    .filter(f => f.startsWith("invoice_") && f.endsWith(".docx"))
    .map(f => ({
      name: f,
      path: `${generatedDir}/${f}`,
      mtime: fs.statSync(`${generatedDir}/${f}`).mtime,
    }))
    .sort((a, b) => b.mtime - a.mtime)

  if (files.length === 0) {
    console.error("✗ 送付状ファイルが見つかりません")
    console.log("\n先にAPIを実行して送付状を生成してください:")
    console.log("  npm run dev")
    console.log("  http://localhost:3000 でフォームから生成")
    return
  }

  console.log(`\n最新の送付状: ${files[0].name}`)
  console.log(`生成日時: ${files[0].mtime.toLocaleString("ja-JP")}`)

  // ファイルを読み込み
  const content = fs.readFileSync(files[0].path, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xml not found")
    return
  }

  // テキストを抽出
  console.log("\n" + "=".repeat(70))
  console.log("【送付状の内容（最初の15行）】")
  console.log("=".repeat(70))

  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  let index = 0
  const allTexts = []

  while ((match = textRegex.exec(documentXml)) !== null && index < 15) {
    const text = match[1]
    if (text.trim()) {
      allTexts.push(text)

      let marker = "  "
      if (text.includes("〒")) marker = "📮"
      else if (text.includes("/")) marker = "📅"
      else if (text.includes("都") || text.includes("府") || text.includes("県")) marker = "📍"
      else if (text.includes("御中")) marker = "🏢"
      else if (text.includes("様")) marker = "👤"

      console.log(`  ${marker} [${index + 1}] ${text}`)
      index++
    }
  }

  // 郵便番号が含まれているか確認
  console.log("\n" + "=".repeat(70))
  console.log("【郵便番号の確認】")
  console.log("=".repeat(70))

  const hasPostalSymbol = allTexts.some(t => t.includes("〒"))
  const postalCodePattern = /〒?\d{3}-?\d{4}/
  const hasPostalCode = allTexts.some(t => postalCodePattern.test(t))

  if (hasPostalSymbol && hasPostalCode) {
    const postalText = allTexts.find(t => t.includes("〒") || postalCodePattern.test(t))
    console.log(`\n✓ 郵便番号が含まれています: ${postalText}`)
    console.log("✓ 相手先会社の郵便番号が正しく表示されています")
  } else if (hasPostalSymbol) {
    console.log(`\n⚠ 〒マークはありますが、郵便番号が見つかりません`)
    console.log("✗ 郵便番号が正しく埋め込まれていない可能性があります")
  } else {
    console.log(`\n✗ 郵便番号（〒）が見つかりません`)
    console.log("✗ テンプレートまたはデータ処理に問題がある可能性があります")
  }

  console.log("\n" + "=".repeat(70))
}

verifyPostalCode()
