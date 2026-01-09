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
    let postalData: Record<string, string>

    // Node.js環境かブラウザ環境かを判定
    if (typeof window === "undefined") {
      // Node.js環境: ファイルシステムから読み込み
      const fs = await import("fs")
      const path = await import("path")
      const dataPath = path.join(process.cwd(), "public", "data", "postal-codes.json")
      const fileContent = fs.readFileSync(dataPath, "utf-8")
      postalData = JSON.parse(fileContent)
    } else {
      // ブラウザ環境: fetchで取得
      const response = await fetch("/data/postal-codes.json")
      if (!response.ok) {
        console.warn("郵便番号データの読み込みに失敗しました")
        return ""
      }
      postalData = await response.json()
    }

    // 住所から最も長い一致を探す（前方一致優先）
    // 例: "東京都渋谷区渋谷1-1-1" → "東京都渋谷区渋谷" → "東京都渋谷区"
    let bestMatch = ""
    let bestMatchLength = 0

    for (const key in postalData) {
      if (address.startsWith(key) && key.length > bestMatchLength) {
        bestMatch = postalData[key]
        bestMatchLength = key.length
      }
    }

    if (bestMatch) {
      return bestMatch
    }

    // 完全一致がない場合、部分一致を試す
    // 例: "横浜市西区みなとみらい2-2-1" → "横浜市西区みなとみらい"
    for (const key in postalData) {
      if (address.includes(key) && key.length > 5) {
        // 5文字以上の部分一致のみ有効
        if (key.length > bestMatchLength) {
          bestMatch = postalData[key]
          bestMatchLength = key.length
        }
      }
    }

    return bestMatch
  } catch (error) {
    console.error("郵便番号の検索中にエラーが発生しました:", error)
    return ""
  }
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
