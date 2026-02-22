import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"

// セッションブリッジ: 旧ドメインのセッションCookieを読み取り、
// rakurakuドメインへ転送するためのエンドポイント
// OAuth callback後に呼ばれる（旧ドメイン上で実行される）

const PRIMARY_DOMAIN = "rakuraku.up.railway.app"

function signToken(token: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = `${timestamp}:${token}`
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
  return `${timestamp}:${signature}:${token}`
}

export async function GET(req: NextRequest) {
  const dest = req.nextUrl.searchParams.get("dest") || "/dashboard"
  const secret = process.env.NEXTAUTH_SECRET

  if (!secret) {
    return NextResponse.redirect(`https://${PRIMARY_DOMAIN}/login`)
  }

  // NextAuthのセッションCookieを読み取る（HTTPS環境）
  const sessionToken =
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value

  if (!sessionToken) {
    // セッションが無い場合はログインページへ
    return NextResponse.redirect(`https://${PRIMARY_DOMAIN}/login`)
  }

  // トークンに署名してrakurakuドメインへ転送
  const signed = signToken(sessionToken, secret)
  const encoded = encodeURIComponent(signed)
  const redirectUrl = `https://${PRIMARY_DOMAIN}/api/auth/bridge-receive?t=${encoded}&dest=${encodeURIComponent(dest)}`

  return NextResponse.redirect(redirectUrl)
}
