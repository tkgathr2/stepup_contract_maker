import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URLは必須です" },
        { status: 400 }
      )
    }

    // is.gd APIを使用してURLを短縮（無料、APIキー不要）
    const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`)
    const data = await response.json()

    if (!response.ok || !data.shorturl) {
      throw new Error(data.errormessage || "URL短縮に失敗しました")
    }

    return NextResponse.json({
      success: true,
      shortUrl: data.shorturl,
    })
  } catch (error) {
    console.error("URL短縮エラー:", error)
    return NextResponse.json(
      { error: "URL短縮に失敗しました" },
      { status: 500 }
    )
  }
}
