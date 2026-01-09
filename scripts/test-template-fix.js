const fetch = require("node-fetch")

/**
 * テンプレート修正後のPDF生成テスト
 */

const TEST_DATA = {
  companyName: "テスト株式会社",
  address: "東京都渋谷区テスト1-2-3",
  representativeName: "山田 太郎",
  postalCode: "150-0001",
}

async function testPdfGeneration() {
  console.log("=".repeat(70))
  console.log("PDF生成テスト")
  console.log("=".repeat(70))
  console.log("\n【テストデータ】")
  console.log(`  会社名: ${TEST_DATA.companyName}`)
  console.log(`  住所: ${TEST_DATA.address}`)
  console.log(`  代表者名: ${TEST_DATA.representativeName}`)
  console.log(`  郵便番号: ${TEST_DATA.postalCode}`)

  console.log("\n【PDF生成リクエスト送信中...】")

  try {
    const response = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(TEST_DATA),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`\n✗ エラー: ${data.error}`)
      console.error(`  HTTPステータス: ${response.status}`)
      process.exit(1)
    }

    console.log("\n✓ PDF生成成功！")
    console.log("\n【生成されたファイル】")
    console.log(`  契約書PDF: ${data.contractPdfUrl}`)
    console.log(`  契約書Word: ${data.contractDocxUrl}`)
    console.log(`  送付状PDF: ${data.invoicePdfUrl}`)
    console.log(`  送付状Word: ${data.invoiceDocxUrl}`)
    console.log(`  郵便番号: ${data.postalCode}`)

    console.log("\n【確認事項】")
    console.log("  以下のURLをブラウザで開いて、データが正しく反映されているか確認してください:")
    console.log(`  - http://localhost:3000${data.contractPdfUrl}`)
    console.log(`  - http://localhost:3000${data.invoicePdfUrl}`)
    console.log("\n  特に以下の項目を確認:")
    console.log("  - 契約書に「住所」と「代表者名」が表示されているか")
    console.log("  - 送付状に「今日の日付」「住所」「郵便番号」が表示されているか")

    console.log("\n✓ テスト完了")
    process.exit(0)
  } catch (error) {
    console.error(`\n✗ エラーが発生しました: ${error.message}`)
    console.error("\n確認事項:")
    console.error("  - 開発サーバーが起動しているか確認してください（npm run dev）")
    console.error("  - http://localhost:3000 にアクセスできるか確認してください")
    process.exit(1)
  }
}

testPdfGeneration()
