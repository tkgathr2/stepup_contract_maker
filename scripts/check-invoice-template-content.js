const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 送付状テンプレートの内容を詳細に確認
 */

function checkTemplateContent() {
  console.log("=".repeat(70))
  console.log("送付状テンプレートの内容確認")
  console.log("=".repeat(70))

  const templatePath = "templates/invoice_template.docx"
  const content = fs.readFileSync(templatePath, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xml not found")
    return
  }

  console.log(`\n【住所部分の検索】`)

  // 「大阪府大阪市中央区北浜東」を含むテキストを検索
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  const allTexts = []
  let foundAddress = false

  while ((match = textRegex.exec(documentXml)) !== null) {
    const text = match[1]
    allTexts.push(text)

    if (text.includes("大阪") || text.includes("北浜") || text.includes("4") || text.includes("33")) {
      console.log(`  テキスト: "${text}"`)
      foundAddress = true
    }
  }

  console.log(`\n【件名部分の検索】`)
  allTexts.forEach((text) => {
    if (text.includes("契約書") && text.includes("送付")) {
      console.log(`  テキスト: "${text}"`)
    }
  })

  // 現在の住所表示を検索
  console.log(`\n【住所の表示方法】`)
  const addressPatterns = [
    "4ｰ33",     // 半角カタカナのハイフン
    "4-33",     // 半角ハイフン
    "4‐33",     // 全角ハイフン
    "4－33",    // 全角マイナス
    "4ー33",    // 長音符
  ]

  addressPatterns.forEach((pattern) => {
    if (documentXml.includes(pattern)) {
      console.log(`  ✓ 見つかりました: "${pattern}"`)
    } else {
      console.log(`  ✗ 見つかりません: "${pattern}"`)
    }
  })

  // 住所部分の連続したテキストを表示
  console.log(`\n【連続したテキスト（住所周辺）】`)
  for (let i = 0; i < allTexts.length; i++) {
    if (allTexts[i].includes("北浜") || allTexts[i].includes("4")) {
      const context = allTexts.slice(Math.max(0, i - 2), i + 5)
      console.log(`  位置${i}: [${context.join("")}]`)
      console.log(`    各部分: ${JSON.stringify(context)}`)
      break
    }
  }
}

checkTemplateContent()
