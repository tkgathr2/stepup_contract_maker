const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 契約書テンプレート内の固定日付を探す
 */

function findDateInContract() {
  console.log("=".repeat(70))
  console.log("契約書テンプレート内の日付検索")
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

  console.log(`\n総テキスト数: ${allTexts.length}`)

  // 「令和7年12月16日」を検索
  console.log("\n【令和7年12月16日の検索】")
  const target = "令和7年12月16日"
  const foundIndex = allTexts.findIndex(t => t.includes(target))

  if (foundIndex !== -1) {
    console.log(`  ✓ 見つかりました: 位置 [${foundIndex}]`)
    console.log(`\n  周辺のテキスト:`)
    for (let i = Math.max(0, foundIndex - 5); i <= Math.min(allTexts.length - 1, foundIndex + 5); i++) {
      const marker = i === foundIndex ? "📅" : "  "
      console.log(`    ${marker} [${i}] ${allTexts[i]}`)
    }
  } else {
    console.log(`  ✗ 見つかりません`)

    // 「令和」を含むテキストを検索
    console.log("\n  「令和」を含むテキストを検索:")
    allTexts.forEach((text, index) => {
      if (text.includes("令和")) {
        console.log(`    [${index}] ${text}`)
      }
    })

    // 「12月16日」を検索
    console.log("\n  「12月16日」を検索:")
    allTexts.forEach((text, index) => {
      if (text.includes("12月16日")) {
        console.log(`    [${index}] ${text}`)
      }
    })

    // 「年」「月」「日」を含むテキストを検索
    console.log("\n  日付らしきテキストを検索:")
    allTexts.forEach((text, index) => {
      if (text.includes("年") && text.includes("月") && text.includes("日")) {
        console.log(`    [${index}] ${text}`)
      }
    })
  }

  // 署名欄周辺を検索（「甲」「乙」「印」などを含む）
  console.log("\n【署名欄周辺の検索】")
  const signatureKeywords = ["甲", "乙", "印", "住所", "氏名", "代表"]

  console.log("\n  署名欄らしき箇所:")
  for (let i = allTexts.length - 50; i < allTexts.length; i++) {
    if (i < 0) continue
    const text = allTexts[i]

    // 署名欄のキーワードを含むか
    const isSignature = signatureKeywords.some(keyword => text.includes(keyword))

    // 日付らしきテキストか
    const isDate = (text.includes("令和") || text.includes("年")) && (text.includes("月") || text.includes("日"))

    if (isSignature || isDate) {
      const marker = isDate ? "📅" : isSignature ? "✍️" : "  "
      console.log(`    ${marker} [${i}] ${text}`)
    }
  }

  console.log("\n" + "=".repeat(70))
}

findDateInContract()
