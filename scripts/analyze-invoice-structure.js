const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 送付状テンプレートの詳細構造を分析するスクリプト
 */

function analyzeInvoiceStructure() {
  console.log("=".repeat(70))
  console.log("送付状テンプレートの構造分析")
  console.log("=".repeat(70))

  const filePath = "templates/invoice_template.docx"

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

  // プレースホルダーとその周辺テキストを抽出
  const placeholders = [
    "{companyName}",
    "{postalCode}",
    "{address}",
    "{representativeName}",
    "{currentDate}",
  ]

  console.log("\n【プレースホルダーとその周辺テキスト】")

  placeholders.forEach(placeholder => {
    const escapedPlaceholder = placeholder.replace(/[{}]/g, "\\$&")
    const regex = new RegExp(`(.{0,100})${escapedPlaceholder}(.{0,100})`, "s")
    const match = documentXml.match(regex)

    if (match) {
      const before = match[1].replace(/<[^>]+>/g, "").slice(-50)
      const after = match[2].replace(/<[^>]+>/g, "").slice(0, 50)
      console.log(`\n${placeholder}:`)
      console.log(`  前: "${before}"`)
      console.log(`  後: "${after}"`)
    } else {
      console.log(`\n${placeholder}: 見つかりませんでした`)
    }
  })

  // <w:t>タグ内のテキストを順番に抽出（最初の100個）
  console.log("\n" + "=".repeat(70))
  console.log("【<w:t>タグのテキスト順序（プレースホルダー周辺のみ）】")
  console.log("=".repeat(70))

  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  let index = 0
  let foundPlaceholder = false
  const relevantTexts = []

  while ((match = textRegex.exec(documentXml)) !== null) {
    const text = match[1]
    if (text.trim()) {
      // プレースホルダーまたはその周辺のテキストを収集
      if (text.includes("{") || text.includes("}") || foundPlaceholder) {
        relevantTexts.push({ index, text })
        foundPlaceholder = text.includes("{") || text.includes("}")

        if (relevantTexts.length > 30) {
          break
        }
      }
      index++
    }
  }

  relevantTexts.forEach(({ index, text }) => {
    const isPlaceholder = text.includes("{") && text.includes("}")
    const marker = isPlaceholder ? "★" : " "
    console.log(`  ${marker} [${index}] ${text}`)
  })

  // 「送付先」セクションを探す
  console.log("\n" + "=".repeat(70))
  console.log("【「送付先」セクション周辺のテキスト】")
  console.log("=".repeat(70))

  const sectionRegex = /送付先(.{0,500})/s
  const sectionMatch = documentXml.match(sectionRegex)

  if (sectionMatch) {
    const sectionText = sectionMatch[1]
    const textInSection = []
    const sectionTextRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g

    while ((match = sectionTextRegex.exec(sectionText)) !== null) {
      const text = match[1]
      if (text.trim()) {
        textInSection.push(text)
        if (textInSection.length > 20) break
      }
    }

    console.log("\n送付先セクションのテキスト順序:")
    textInSection.forEach((text, i) => {
      const isPlaceholder = text.includes("{") && text.includes("}")
      const marker = isPlaceholder ? "★" : " "
      console.log(`  ${marker} [${i}] ${text}`)
    })
  } else {
    console.log("\n「送付先」セクションが見つかりませんでした")
  }

  console.log("\n" + "=".repeat(70))
  console.log("分析完了")
  console.log("=".repeat(70))
}

analyzeInvoiceStructure()
