import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[Shorten] API called")

  try {
    const body = await request.json()
    const { url } = body

    console.log("[Shorten] Input URL:", url)

    if (!url || typeof url !== "string") {
      console.log("[Shorten] Invalid URL")
      return NextResponse.json(
        { error: "URLは必須です" },
        { status: 400 }
      )
    }

    // is.gd APIを使用してURLを短縮（無料、APIキー不要）
    const apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`
    console.log("[Shorten] Calling is.gd API:", apiUrl)

    const response = await fetch(apiUrl)
    const data = await response.json()

    console.log("[Shorten] is.gd response:", JSON.stringify(data))

    if (!data.shorturl) {
      const errorMessage = data.errormessage || "URL短縮に失敗しました"
      console.error("[Shorten] is.gd error:", errorMessage)
      throw new Error(errorMessage)
    }

    console.log("[Shorten] Short URL:", data.shorturl)

    return NextResponse.json({
      success: true,
      shortUrl: data.shorturl,
    })
  } catch (error) {
    console.error("[Shorten] Error:", error)
    return NextResponse.json(
      { error: "URL短縮に失敗しました" },
      { status: 500 }
    )
  }
}
