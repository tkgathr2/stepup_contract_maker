/**
 * zipcloud APIの動作確認
 */

async function testZipcloudAPI() {
  console.log("=".repeat(70))
  console.log("zipcloud API動作確認")
  console.log("=".repeat(70))

  // テスト1: 郵便番号から住所を検索（これは動作するはず）
  console.log("\n【テスト1】郵便番号から住所を検索")
  const zipcode = "1000005"
  const url1 = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`
  console.log(`URL: ${url1}`)

  try {
    const response1 = await fetch(url1)
    const data1 = await response1.json()
    console.log(`結果:`, JSON.stringify(data1, null, 2))
  } catch (error) {
    console.error(`エラー: ${error}`)
  }

  // テスト2: 住所から郵便番号を検索
  console.log("\n【テスト2】住所から郵便番号を検索")
  const address = "東京都千代田区丸の内"
  const url2 = `https://zipcloud.ibsnet.co.jp/api/search?address=${encodeURIComponent(address)}`
  console.log(`URL: ${url2}`)

  try {
    const response2 = await fetch(url2)
    const data2 = await response2.json()
    console.log(`結果:`, JSON.stringify(data2, null, 2))
  } catch (error) {
    console.error(`エラー: ${error}`)
  }

  // テスト3: より詳細な住所で検索
  console.log("\n【テスト3】詳細な住所で検索")
  const address2 = "神奈川県横浜市西区"
  const url3 = `https://zipcloud.ibsnet.co.jp/api/search?address=${encodeURIComponent(address2)}`
  console.log(`URL: ${url3}`)

  try {
    const response3 = await fetch(url3)
    const data3 = await response3.json()
    console.log(`結果:`, JSON.stringify(data3, null, 2))
  } catch (error) {
    console.error(`エラー: ${error}`)
  }

  console.log("\n" + "=".repeat(70))
}

testZipcloudAPI()
