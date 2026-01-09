"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getRecentHistory, HistoryItem } from "@/lib/local-storage"
import { FileText, History, Plus, Download } from "lucide-react"

export default function DashboardPage() {
  const { data: session } = useSession()
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    if (session?.user?.id) {
      setRecentHistory(getRecentHistory(session.user.id, 3))
    }
  }, [session?.user?.id])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ヘッダー */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            ようこそ、{session?.user?.name || "ゲスト"}さん
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            契約書・送り状を簡単に作成できます
          </p>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link href="/generate" className="touch-manipulation">
            <Card className="card-hover cursor-pointer border-pink-200 bg-white/80 backdrop-blur-sm h-full active:scale-[0.98] transition-transform">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full shadow-md">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl text-gray-800">新規作成</CardTitle>
                    <CardDescription className="text-sm">
                      契約書・送り状を作成する
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/history" className="touch-manipulation">
            <Card className="card-hover cursor-pointer border-pink-200 bg-white/80 backdrop-blur-sm h-full active:scale-[0.98] transition-transform">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full shadow-md">
                    <History className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl text-gray-800">履歴を見る</CardTitle>
                    <CardDescription className="text-sm">
                      過去の生成履歴を確認する
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* 最近の履歴 */}
        <Card className="border-pink-200 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-pink-500" />
                <CardTitle className="text-xl text-gray-800">最近の生成履歴</CardTitle>
              </div>
              {recentHistory.length > 0 && (
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-pink-600 hover:text-pink-700">
                    すべて見る
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">まだ履歴がありません</p>
                <Link href="/generate">
                  <Button className="mt-4 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500">
                    最初の書類を作成する
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {recentHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 sm:p-4 border border-pink-100 rounded-lg hover:bg-pink-50/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-800 truncate">{item.companyName}</h3>
                        <p className="text-sm text-gray-500">{item.representativeName} 様</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(item.createdAt)}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation"
                          onClick={() => {
                            const link = document.createElement("a")
                            link.href = item.contractPdfUrl
                            link.download = `人材紹介契約書(${item.companyName}様).pdf`
                            link.click()
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          契約書
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation"
                          onClick={() => {
                            const link = document.createElement("a")
                            link.href = item.invoicePdfUrl
                            link.download = `送付状(${item.companyName}様).pdf`
                            link.click()
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          送付状
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
