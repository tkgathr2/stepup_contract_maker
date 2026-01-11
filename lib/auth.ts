import { NextAuthOptions, getServerSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  // NEXTAUTH_SECRETを明示的に設定
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  debug: process.env.NODE_ENV === "development", // デバッグモードを有効化
  callbacks: {
    async jwt({ token, user, account }) {
      // 初回認証時（userとaccountが存在する場合）
      if (user && account) {
        // Google OAuthから返ってくるaccountオブジェクトにはsubプロパティが含まれる
        // account.subがGoogleのユーザーID（一意）
        // フォールバックとしてproviderAccountIdやuser.emailも使用可能
        const accountWithSub = account as typeof account & { sub?: string }
        token.id = accountWithSub.sub || account.providerAccountId || user.email || ""
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // baseUrlをNEXTAUTH_URLから取得（設定されていない場合は自動検出）
      const redirectBaseUrl = process.env.NEXTAUTH_URL || baseUrl

      // 相対URLの場合はbaseUrlを付与
      if (url.startsWith("/")) {
        return `${redirectBaseUrl}${url}`
      }
      // 同じオリジンの場合はそのまま返す
      try {
        const urlObj = new URL(url)
        const baseUrlObj = new URL(redirectBaseUrl)
        if (urlObj.origin === baseUrlObj.origin) {
          return url
        }
      } catch {
        // URL解析エラーの場合はトップページへ
      }
      // それ以外はトップページへ
      return `${redirectBaseUrl}/`
    },
  },
}

export const auth = () => getServerSession(authOptions)
