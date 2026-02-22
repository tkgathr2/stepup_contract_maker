import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// メインドメイン（Google OAuthのリダイレクトURIが登録済み）
const PRIMARY_DOMAIN = "stepupcontractmaker-production.up.railway.app"

// 認証が必要なパス
const PROTECTED_PATHS = [
  "/dashboard",
  "/generate",
  "/templates",
  "/history",
  "/batch",
  "/api/generate",
  "/api/templates",
  "/api/history",
]

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || ""
  const pathname = req.nextUrl.pathname

  // rakuraku.up.railway.app → メインドメインにリダイレクト
  // Google OAuthのredirect_uriがメインドメインで登録されているため
  if (
    host !== PRIMARY_DOMAIN &&
    host.endsWith(".railway.app") &&
    host !== "localhost:3000"
  ) {
    const url = req.nextUrl.clone()
    url.host = PRIMARY_DOMAIN
    url.protocol = "https:"
    url.port = ""
    return NextResponse.redirect(url.toString(), 302)
  }

  // 認証保護：ログインしていない場合はログインページへ
  const isProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  )
  if (isProtected) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.svg|manifest\\.json).*)",
  ],
}
