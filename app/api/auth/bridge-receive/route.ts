import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"

// セッションブリッジ受信: 旧ドメインから転送されたセッショントークンを
// rakurakuドメインのCookieとして設定するエンドポイント

const PRIMARY_DOMAIN = "rakuraku.up.railway.app"
const MAX_AGE_SECONDS = 60 // 署名の有効期限（60秒）

function verifyToken(
  signed: string,
  secret: string
): string | null {
  const parts = signed.split(":")
  if (parts.length < 3) return null

  const timestamp = parseInt(parts[0], 10)
  const signature = parts[1]
  const token = parts.slice(2).join(":")

  // タイムスタンプ検証（60秒以内）
  const now = Math.floor(Date.now() / 1000)
  if (now - timestamp > MAX_AGE_SECONDS) return null

  // 署名検証
  const payload = `${timestamp}:${token}`
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex")

  if (signature !== expected) return null

  return token
}

export async function GET(req: NextRequest) {
  const encoded = req.nextUrl.searchParams.get("t")
  const dest = req.nextUrl.searchParams.get("dest") || "/dashboard"
  const secret = process.env.NEXTAUTH_SECRET

  if (!encoded || !secret) {
    return NextResponse.redirect(`https://${PRIMARY_DOMAIN}/login`)
  }

  const signed = decodeURIComponent(encoded)
  const sessionToken = verifyToken(signed, secret)

  if (!sessionToken) {
    // 無効なトークン → ログインページへ
    return NextResponse.redirect(`https://${PRIMARY_DOMAIN}/login`)
  }

  // rakurakuドメインにセッションCookieを設定してリダイレクト
  const response = NextResponse.redirect(`https://${PRIMARY_DOMAIN}${dest}`)

  // NextAuthと同じCookie設定（HTTPS環境用）
  const isSecure = true
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token"

  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30日（NextAuthデフォルト）
  })

  return response
}
