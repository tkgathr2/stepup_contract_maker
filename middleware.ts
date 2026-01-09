import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isLoggedIn = !!token
  const pathname = request.nextUrl.pathname

  const isLoginPage = pathname === "/login"
  const isAuthApi = pathname.startsWith("/api/auth")
  const isHealthApi = pathname === "/api/health"
  const isFilesApi = pathname.startsWith("/api/files")
  const isApi = pathname.startsWith("/api/")

  // 認証API、ヘルスチェック、ファイル配信はスキップ
  if (isAuthApi || isHealthApi || isFilesApi) {
    return NextResponse.next()
  }

  // 未ログインの場合
  if (!isLoggedIn) {
    // ログインページはそのままアクセス可能
    if (isLoginPage) {
      return NextResponse.next()
    }
    // APIルートの場合はそのまま通す（API側で認証チェックを行う）
    if (isApi) {
      return NextResponse.next()
    }
    // それ以外はログインページにリダイレクト
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // ログイン済みでログインページにアクセスした場合はダッシュボードへ
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
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
