import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/generate/:path*",
    "/templates/:path*",
    "/history/:path*",
    "/batch/:path*",
    "/api/generate/:path*",
    "/api/templates/:path*",
    "/api/history/:path*",
  ],
}
