import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // secretパラメータを明示的に指定
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })
  const isLoggedIn = !!token
  const pathname = request.nextUrl.pathname

  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV === "development") {
    console.log("[Middleware] Path:", pathname)
    console.log("[Middleware] IsLoggedIn:", isLoggedIn)
    console.log("[Middleware] Token exists:", !!token)
    if (token) {
      console.log("[Middleware] Token.id:", token.id)
    }
  }

  const isLoginPage = pathname === "/login"
  const isAuthApi = pathname.startsWith("/api/auth")
  const isHealthApi = pathname === "/api/health"
  const isFilesApi = pathname.startsWith("/api/files")
  const isApi = pathname.startsWith("/api/")

  // 認証API、ヘルスチェック、ファイル配信はスキップ
  if (isAuthApi || isHealthApi || isFilesApi) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Middleware] Skipping auth/health/files API")
    }
    return NextResponse.next()
  }

  // トップページ（/）は認証なしでアクセス可能
  const isTopPage = pathname === "/"

  // 未ログインの場合
  if (!isLoggedIn) {
    // トップページはそのままアクセス可能
    if (isTopPage) {
      return NextResponse.next()
    }
    // ログインページはそのままアクセス可能
    if (isLoginPage) {
      return NextResponse.next()
    }
    // APIルートの場合はそのまま通す（API側で認証チェックを行う）
    if (isApi) {
      return NextResponse.next()
    }
    // それ以外はログインページにリダイレクト
    if (process.env.NODE_ENV === "development") {
      console.log("[Middleware] Redirecting to login")
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // ログイン済みでログインページにアクセスした場合はトップページへ
  if (isLoggedIn && isLoginPage) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Middleware] Already logged in, redirecting to top page")
    }
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
