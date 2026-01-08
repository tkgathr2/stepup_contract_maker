import { lookupPostalCode } from "../lib/postal-code-lookup"

/**
 * 郵便番号検索機能のテスト
 */

async function testPostalLookup() {
  console.log("=".repeat(70))
  console.log("郵便番号検索機能テスト")
  console.log("=".repeat(70))

  const testAddresses = [
    "東京都千代田区丸の内1-1-1",
    "神奈川県横浜市西区みなとみらい2-2-1",
    "大阪府大阪市中央区北浜東4-33",
    "東京都渋谷区渋谷1-1-1",
  ]

  for (const address of testAddresses) {
    console.log(`\n【テスト】 ${address}`)
    try {
      const postalCode = await lookupPostalCode(address)
      if (postalCode) {
        console.log(`  ✓ 郵便番号: ${postalCode}`)
      } else {
        console.log(`  ✗ 郵便番号が見つかりませんでした`)
      }
    } catch (error) {
      console.error(`  ✗ エラー: ${error}`)
    }
  }

  console.log("\n" + "=".repeat(70))
}

testPostalLookup()
