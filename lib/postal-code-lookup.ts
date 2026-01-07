/**
 * 住所から郵便番号を推定する
 * 郵便番号APIを使用して住所から郵便番号を検索
 */

interface PostalCodeResult {
  postalCode: string
  prefecture: string
  city: string
  town: string
}

/**
 * 住所から郵便番号を検索
 * @param address 住所（例: "東京都渋谷区..."）
 * @returns 郵便番号（見つからない場合は空文字列）
 */
export async function lookupPostalCode(address: string): Promise<string> {
  try {
    // 住所から都道府県と市区町村を抽出
    const addressParts = extractAddressParts(address)

    if (!addressParts.prefecture || !addressParts.city) {
      return ""
    }

    // 郵便番号検索API（zipcloud）を使用
    const searchQuery = encodeURIComponent(`${addressParts.prefecture}${addressParts.city}`)
    const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?address=${searchQuery}`

    const response = await fetch(apiUrl)

    if (!response.ok) {
      console.warn("郵便番号検索APIのリクエストに失敗しました")
      return ""
    }

    const data = await response.json()

    if (data.status === 200 && data.results && data.results.length > 0) {
      // 最初の結果を使用
      return data.results[0].zipcode || ""
    }

    return ""
  } catch (error) {
    console.error("郵便番号の検索中にエラーが発生しました:", error)
    return ""
  }
}

/**
 * 住所から都道府県と市区町村を抽出
 */
function extractAddressParts(address: string): {
  prefecture: string
  city: string
  town: string
} {
  const prefectures = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
  ]

  let prefecture = ""
  let remainingAddress = address

  // 都道府県を検索
  for (const pref of prefectures) {
    if (address.startsWith(pref)) {
      prefecture = pref
      remainingAddress = address.substring(pref.length)
      break
    }
  }

  // 市区町村を抽出（最初の「市」「区」「町」「村」まで）
  const cityMatch = remainingAddress.match(/^([^0-9]*?[市区町村])/)
  const city = cityMatch ? cityMatch[1] : ""
  const town = city ? remainingAddress.substring(city.length) : remainingAddress

  return { prefecture, city, town }
}

/**
 * 郵便番号から住所を検索（逆引き）
 * @param postalCode 郵便番号（ハイフンあり・なし両対応）
 * @returns 住所情報
 */
export async function lookupAddress(postalCode: string): Promise<PostalCodeResult | null> {
  try {
    // ハイフンを除去
    const cleanedPostalCode = postalCode.replace(/-/g, "")

    const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedPostalCode}`
    const response = await fetch(apiUrl)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.status === 200 && data.results && data.results.length > 0) {
      const result = data.results[0]
      return {
        postalCode: result.zipcode,
        prefecture: result.address1,
        city: result.address2,
        town: result.address3,
      }
    }

    return null
  } catch (error) {
    console.error("住所の検索中にエラーが発生しました:", error)
    return null
  }
}
