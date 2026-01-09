"use client"

import { useSession } from "next-auth/react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getRecentHistory, HistoryItem } from "@/lib/local-storage"
import { formatDate } from "@/lib/date-format"
import { downloadContractPdf, downloadInvoicePdf } from "@/lib/download"
import { getAnnouncements, getAnnouncementsHidden, setAnnouncementsHidden, AnnouncementItem } from "@/lib/announcements"
import { FileText, History, Plus, Download, X, Bell } from "lucide-react"
import { FOOTER_TEXT } from "@/lib/constants"

export default function DashboardPage() {
  const { data: session } = useSession()

  // お知らせの非表示状態を初期化時に読み込み
  const [showAnnouncements, setShowAnnouncements] = useState(() => {
    if (typeof window === "undefined") return true
    return !getAnnouncementsHidden()
  })

  // お知らせデータ
  const announcements = useMemo(() => getAnnouncements(), [])

  // お知らせを閉じる
  const handleHideAnnouncements = () => {
    setShowAnnouncements(false)
    setAnnouncementsHidden(true)
  }

  // お知らせの背景色を取得
  const getAnnouncementBgColor = (type: AnnouncementItem["type"]) => {
    switch (type) {
      case "update":
        return "bg-pink-50 border-pink-200"
      case "feature":
        return "bg-blue-50 border-blue-200"
      case "improvement":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  // メモ化された履歴データ
  const recentHistory = useMemo<HistoryItem[]>(() => {
    if (typeof window === "undefined" || !session?.user?.id) return []
    return getRecentHistory(session.user.id, 3)
  }, [session])

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

        {/* お知らせセクション */}
        {showAnnouncements && announcements.length > 0 && (
          <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 shadow-md">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-pink-500" />
                  <CardTitle className="text-lg text-gray-800">お知らせ</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHideAnnouncements}
                  className="text-gray-400 hover:text-gray-600 -mr-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`p-3 rounded-lg border ${getAnnouncementBgColor(announcement.type)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">
                            {announcement.title}
                          </span>
                          {announcement.isNew && (
                            <span className="bg-pink-500 text-white text-xs font-medium rounded-full px-2 py-0.5">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {announcement.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {announcement.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                          onClick={() => downloadContractPdf(item.contractPdfUrl, item.companyName)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          契約書
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation"
                          onClick={() => downloadInvoicePdf(item.invoicePdfUrl, item.companyName)}
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

        {/* フッター */}
        <footer className="text-center text-sm text-gray-400 mt-12">
          {FOOTER_TEXT}
        </footer>
      </div>
    </div>
  )
}
