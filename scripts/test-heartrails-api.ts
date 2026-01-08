/**
 * HeartRails Geo APIの動作確認
 */

async function testHeartRailsAPI() {
  console.log("=".repeat(70))
  console.log("HeartRails Geo API動作確認")
  console.log("=".repeat(70))

  const testAddresses = [
    "東京都千代田区丸の内",
    "神奈川県横浜市西区",
    "横浜市西区",
    "渋谷",
  ]

  for (const address of testAddresses) {
    console.log(`\n【テスト】 ${address}`)
    const url = `https://geoapi.heartrails.com/api/json?method=suggest&keyword=${encodeURIComponent(address)}`
    console.log(`URL: ${url}`)

    try {
      const response = await fetch(url)
      const data = await response.json()
      console.log(`結果:`, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error(`エラー: ${error}`)
    }
  }

  console.log("\n" + "=".repeat(70))
}

testHeartRailsAPI()
