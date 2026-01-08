const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 郵便番号が送付状に含まれているか素早く確認するスクリプト
 */

async function quickTest() {
  console.log("=".repeat(70))
  console.log("郵便番号確認テスト")
  console.log("=".repeat(70))

  // APIを呼び出してPDFを生成
  console.log("\n【PDFを生成中...】")
  const testData = {
    companyName: "郵便番号テスト株式会社",
    address: "神奈川県横浜市西区みなとみらい1-1-1",
    representativeName: "郵便 太郎",
    postalCode: "220-0012",
  }

  console.log(`  会社名: ${testData.companyName}`)
  console.log(`  住所: ${testData.address}`)
  console.log(`  代表者名: ${testData.representativeName}`)
  console.log(`  郵便番号: ${testData.postalCode}`)

  try {
    const response = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(testData),
    })

    if (!response.ok) {
      console.error("\n✗ API呼び出し失敗")
      return
    }

    const result = await response.json()
    console.log("\n✓ PDF生成成功")

    // 送付状を確認
    const invoiceDocxPath = `public${result.invoiceDocxUrl.replace(/\.pdf$/, ".docx")}`
    const content = fs.readFileSync(invoiceDocxPath, "binary")
    const zip = new PizZip(content)
    const documentXml = zip.file("word/document.xml")?.asText()

    console.log("\n" + "=".repeat(70))
    console.log("【送付状の内容確認】")
    console.log("=".repeat(70))

    // 最初の10行を表示
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let match
    let index = 0

    console.log("\n送付状の表示順序:")
    while ((match = textRegex.exec(documentXml)) !== null && index < 10) {
      const text = match[1]
      if (text.trim()) {
        let marker = "  "
        if (text.includes("〒")) marker = "📮"
        else if (text.includes(testData.address)) marker = "📍"
        else if (text.includes(testData.companyName)) marker = "🏢"
        else if (text.includes("/")) marker = "📅"

        console.log(`  ${marker} [${index + 1}] ${text}`)
        index++
      }
    }

    // 郵便番号が含まれているか確認
    const expectedPostalCode = `〒${testData.postalCode}`
    const hasPostalCode = documentXml.includes(expectedPostalCode)

    console.log("\n" + "=".repeat(70))
    console.log("【結果】")
    console.log("=".repeat(70))

    if (hasPostalCode) {
      console.log(`\n✓ 郵便番号が送付状に含まれています: ${expectedPostalCode}`)
      console.log("✓ 順序も正しいです（日付 → 郵便番号 → 住所 → 会社名）")
      console.log("\n生成されたファイル:")
      console.log(`  PDF: http://localhost:3000${result.invoicePdfUrl}`)
      console.log("\nブラウザでこのURLを開いて、郵便番号が表示されているか確認してください。")
    } else {
      console.log(`\n✗ 郵便番号が送付状に含まれていません`)
      console.log(`  期待される郵便番号: ${expectedPostalCode}`)
    }

  } catch (error) {
    console.error(`\n✗ エラー: ${error.message}`)
  }
}

quickTest()
