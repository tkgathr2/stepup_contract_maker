/**
 * APIの統合テスト
 * 実際に書類生成APIを呼び出してテストします
 */

const API_URL = "http://localhost:3000/api/generate"

async function testAPIIntegration() {
  console.log("APIの統合テストを開始します...\n")

  const testData = {
    companyName: "株式会社テスト",
    address: "東京都渋谷区渋谷1-2-3",
    representativeName: "田中太郎",
  }

  console.log("テストデータ:")
  console.log(JSON.stringify(testData, null, 2))
  console.log()

  try {
    console.log(`APIにリクエストを送信中: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    })

    console.log(`レスポンスステータス: ${response.status}`)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("✗ APIエラー:", errorData)
      process.exit(1)
    }

    const result = await response.json()

    console.log("\n✓ API呼び出し成功！")
    console.log("\n生成結果:")
    console.log("=".repeat(60))
    console.log(`  郵便番号: ${result.postalCode || "見つかりませんでした"}`)
    console.log(`  契約書PDF: ${result.contractPdfUrl}`)
    console.log(`  契約書Word: ${result.contractDocxUrl}`)
    console.log(`  送付状PDF: ${result.invoicePdfUrl}`)
    console.log(`  送付状Word: ${result.invoiceDocxUrl}`)
    console.log("=".repeat(60))

    console.log("\n✓ 統合テスト完了！")
    console.log("\nブラウザで確認してください:")
    console.log(`  http://localhost:3000${result.contractPdfUrl}`)
    console.log(`  http://localhost:3000${result.invoicePdfUrl}`)
    console.log("\nアプリケーションURL:")
    console.log(`  http://localhost:3000`)
  } catch (error) {
    console.error("✗ エラーが発生しました:", error)
    console.error("\n注意: 開発サーバーが起動していることを確認してください")
    console.error("     npm run dev")
    process.exit(1)
  }
}

testAPIIntegration()
