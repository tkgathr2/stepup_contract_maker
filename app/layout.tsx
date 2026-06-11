import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ラクラク契約くん",
  description: "契約書・送付状自動生成システム",
  icons: {
    icon: "/favicon.ico?v=3",
    apple: "/apple-touch-icon.png?v=3",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          {children}
          <Toaster />
        </AuthSessionProvider>
        {/* カイゼンくん埋め込みウィジェット：右下のフクロウ博士。困りごと・改善要望をその場でチャット受付→Notion起票 */}
        <Script src="https://kaizen.takagi.bz/widget.js" data-sys="rakuraku" strategy="lazyOnload" />
      </body>
    </html>
  );
}
