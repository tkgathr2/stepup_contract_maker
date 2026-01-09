const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 郵便番号が正しく埋め込まれているか完全テスト
 */

async function completeTest() {
  console.log("=".repeat(70))
  console.log("郵便番号埋め込み完全テスト")
  console.log("=".repeat(70))

  // テストデータ
  const testData = {
    companyName: "郵便番号確認テスト株式会社",
    address: "神奈川県横浜市西区みなとみらい2-2-1",
    representativeName: "郵便 花子",
    postalCode: "", // 空にして自動検索させる
  }

  console.log("\n【テストデータ】")
  console.log(`  会社名: ${testData.companyName}`)
  console.log(`  住所: ${testData.address}`)
  console.log(`  代表者名: ${testData.representativeName}`)
  console.log(`  郵便番号: （住所から自動検索）`)

  console.log("\n【API呼び出し中...】")

  try {
    const response = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(testData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`\n✗ API呼び出し失敗: ${errorData.error || response.statusText}`)
      return
    }

    const result = await response.json()
    console.log(`\n✓ API呼び出し成功`)
    console.log(`  返却された郵便番号: ${result.postalCode || "(なし)"}`)

    // 送付状DOCXを確認
    const invoiceDocxPath = `public${result.invoiceDocxUrl.replace(/\.pdf$/, ".docx")}`

    if (!fs.existsSync(invoiceDocxPath)) {
      console.error(`\n✗ 送付状DOCXファイルが見つかりません: ${invoiceDocxPath}`)
      return
    }

    const content = fs.readFileSync(invoiceDocxPath, "binary")
    const zip = new PizZip(content)
    const documentXml = zip.file("word/document.xml")?.asText()

    if (!documentXml) {
      console.error("✗ document.xml not found")
      return
    }

    // テキスト抽出
    console.log("\n" + "=".repeat(70))
    console.log("【生成された送付状の内容（最初の10行）】")
    console.log("=".repeat(70))

    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let match
    let index = 0
    const allTexts = []

    while ((match = textRegex.exec(documentXml)) !== null && index < 10) {
      const text = match[1]
      if (text.trim()) {
        allTexts.push(text)

        let marker = "  "
        if (text.includes("〒")) marker = "📮"
        else if (text.includes("/")) marker = "📅"
        else if (text.includes(testData.address)) marker = "📍"
        else if (text.includes(testData.companyName)) marker = "🏢"
        else if (text.includes(testData.representativeName)) marker = "👤"

        console.log(`  ${marker} [${index + 1}] ${text}`)
        index++
      }
    }

    // 郵便番号チェック
    console.log("\n" + "=".repeat(70))
    console.log("【郵便番号の検証】")
    console.log("=".repeat(70))

    const postalCodePattern = /〒(\d{3}-\d{4})/
    let foundPostalCode = null
    let postalCodePosition = -1

    allTexts.forEach((text, idx) => {
      const match = text.match(postalCodePattern)
      if (match) {
        foundPostalCode = match[1]
        postalCodePosition = idx + 1
      }
    })

    if (foundPostalCode) {
      console.log(`\n✓ 郵便番号が見つかりました: 〒${foundPostalCode}`)
      console.log(`✓ 位置: [${postalCodePosition}]`)

      // 順序確認
      const dateIndex = allTexts.findIndex(t => t.includes("/"))
      const postalIndex = allTexts.findIndex(t => t.includes("〒"))
      const addressIndex = allTexts.findIndex(t => t.includes(testData.address))
      const companyIndex = allTexts.findIndex(t => t.includes(testData.companyName))

      console.log(`\n【表示順序の確認】`)
      console.log(`  日付の位置: [${dateIndex + 1}]`)
      console.log(`  郵便番号の位置: [${postalIndex + 1}]`)
      console.log(`  住所の位置: [${addressIndex + 1}]`)
      console.log(`  会社名の位置: [${companyIndex + 1}]`)

      if (dateIndex < postalIndex && postalIndex < addressIndex && addressIndex < companyIndex) {
        console.log(`\n✓ 順序が正しいです: 日付 → 郵便番号 → 住所 → 会社名`)
      } else {
        console.log(`\n⚠ 順序に問題がある可能性があります`)
      }

      // PDFも確認
      const pdfPath = `public${result.invoicePdfUrl}`
      if (fs.existsSync(pdfPath)) {
        const pdfSize = fs.statSync(pdfPath).size
        console.log(`\n✓ PDFファイルも生成されています: ${pdfPath} (${pdfSize} bytes)`)
      }

      console.log(`\n【結論】`)
      console.log(`✓ 相手先会社の郵便番号が正しく埋め込まれています`)
      console.log(`✓ 送付状に〒${foundPostalCode}が表示されます`)
      console.log(`\n生成されたファイル:`)
      console.log(`  送付状PDF: http://localhost:3000${result.invoicePdfUrl}`)
      console.log(`\nブラウザで確認してください。`)

    } else {
      console.log(`\n✗ 郵便番号が見つかりませんでした`)
      console.log(`✗ テンプレートまたは処理に問題がある可能性があります`)

      // デバッグ情報
      console.log(`\nデバッグ情報:`)
      console.log(`  APIから返された郵便番号: ${result.postalCode || "(なし)"}`)
      console.log(`  ドキュメントXMLに"postalCode"が含まれているか: ${documentXml.includes("postalCode")}`)
      console.log(`  ドキュメントXMLに"〒"が含まれているか: ${documentXml.includes("〒")}`)
    }

  } catch (error) {
    console.error(`\n✗ エラー: ${error.message}`)
    if (error.code === "ECONNREFUSED") {
      console.log(`\nサーバーが起動していません。以下を実行してください:`)
      console.log(`  npm run dev`)
    }
  }
}

completeTest()
