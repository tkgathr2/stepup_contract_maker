import { Header } from "@/components/layout/header"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 safe-area-inset-top safe-area-inset-bottom scroll-smooth tap-highlight-none">
      <Header />
      <main className="pb-8">{children}</main>
    </div>
  )
}
