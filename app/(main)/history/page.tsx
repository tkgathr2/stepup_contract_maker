"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getHistory, searchHistory, deleteHistory, updateHistory, HistoryItem } from "@/lib/local-storage"
import { formatDate } from "@/lib/date-format"
import { downloadContractPdf, downloadContractDocx, downloadInvoicePdf, downloadInvoiceDocx } from "@/lib/download"
import { toast } from "sonner"
import { ArrowLeft, Download, Trash2, Search, FileText, File, Mail, CheckCircle } from "lucide-react"
import { FOOTER_TEXT } from "@/lib/constants"

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  // 検索クエリのDebounce処理（300ms）
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // メモ化された履歴データ
  // refreshKeyを依存配列に入れて削除後の再計算をトリガー可能にする
  const history = useMemo<HistoryItem[]>(() => {
    if (typeof window === "undefined" || !session?.user?.id) return []
    if (debouncedSearchQuery.trim()) {
      return searchHistory(session.user.id, debouncedSearchQuery)
    }
    return getHistory(session.user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, debouncedSearchQuery, refreshKey])

  // ローディング状態
  const isLoading = status === "loading"

  // 履歴を再読み込み（削除後などに使用）
  const reloadHistory = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleDelete = (id: string, companyName: string) => {
    if (!session?.user?.id) return

    if (window.confirm(`${companyName}の履歴を削除しますか？`)) {
      const success = deleteHistory(session.user.id, id)
      if (success) {
        toast.success("履歴を削除しました")
        reloadHistory()
      } else {
        toast.error("削除に失敗しました")
      }
    }
  }

  const handleEmailClick = useCallback(async (item: HistoryItem) => {
    const senderName = session?.user?.name || "担当者"
    const subject = "契約書送付のご案内"

    // ファイルのダウンロードリンク（絶対URL）
    const baseUrl = window.location.origin
    const contractPdfUrl = `${baseUrl}${item.contractPdfUrl}`

    // 短縮URLを取得
    let shortContractUrl = contractPdfUrl

    console.log("[Email] Requesting short URL for:", contractPdfUrl)

    try {
      const contractRes = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: contractPdfUrl }),
      })
      const contractData = await contractRes.json()
      console.log("[Email] Short URL response:", contractData)
      if (contractData.success && contractData.shortUrl) {
        shortContractUrl = contractData.shortUrl
        console.log("[Email] Using short URL:", shortContractUrl)
      } else {
        console.log("[Email] Short URL failed, using original URL")
      }
    } catch (error) {
      console.error("[Email] 短縮URL取得エラー:", error)
      // エラー時は元のURLを使用
    }

    const body = `${item.companyName}様

平素より大変お世話になっております。
株式会社ステップアップの${senderName}でございます。

このたびの契約書（案）を添付にてお送りいたします。
お手数ではございますが、内容をご確認いただき、
ご承認いただけましたらご連絡くださいませ。

確認が取れ次第、正式な契約書を作成・押印のうえ
郵送させていただきます。

ご不明な点がございましたら、お気軽にお申し付けください。
何卒よろしくお願い申し上げます。

【ダウンロードリンク】
・契約書: ${shortContractUrl}

---
${senderName}`

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(gmailUrl, '_blank')
  }, [session])

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ヘッダー */}
        <div className="mb-5 sm:mb-6">
          <Link href="/" className="touch-manipulation">
            <Button variant="ghost" className="mb-3 sm:mb-4 text-gray-600 hover:text-gray-800 -ml-2 active:scale-[0.98]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              トップページに戻る
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">生成履歴</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            過去に生成した書類の一覧です
          </p>
        </div>

        {/* 検索バー */}
        <Card className="mb-5 sm:mb-6 border-pink-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="会社名・代表者名・住所で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400 h-11 sm:h-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* 履歴一覧 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-pink-400 mx-auto"></div>
            <p className="text-gray-500 mt-4 text-sm sm:text-base">読み込み中...</p>
          </div>
        ) : history.length === 0 ? (
          <Card className="border-pink-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="text-center py-10 sm:py-12">
              <FileText className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-base sm:text-lg">
                {searchQuery ? "検索結果がありません" : "履歴がありません"}
              </p>
              {!searchQuery && (
                <Link href="/generate" className="touch-manipulation">
                  <Button className="mt-5 sm:mt-6 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 active:scale-[0.98]">
                    書類を作成する
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {history.map((item) => (
              <Card
                key={item.id}
                className="border-pink-200 bg-white/80 backdrop-blur-sm card-hover gap-0"
              >
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg sm:text-xl text-gray-800 truncate">
                        {item.companyName}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <CardDescription className="text-sm">
                          {item.representativeName} 様
                        </CardDescription>
                        <span className="text-sm text-gray-500">
                          作成者: {item.createdByName || "-"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 active:scale-[0.95] touch-manipulation flex-shrink-0 -mr-2"
                      onClick={() => handleDelete(item.id, item.companyName)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pt-0 pb-4 sm:pb-6">
                  <div className="text-sm text-gray-500 mb-4">
                    <p className="truncate">{item.postalCode && `${item.postalCode} `}{item.address}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      作成日時: {formatDate(item.createdAt)}
                    </p>
                  </div>

                  {/* モバイル: 縦積み、デスクトップ: 横並び */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 契約書 */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">契約書</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation h-10"
                          onClick={() => downloadContractPdf(item.contractPdfUrl, item.companyName)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation h-10"
                          onClick={() => downloadContractDocx(item.contractDocxUrl, item.companyName)}
                        >
                          <File className="w-4 h-4 mr-1" />
                          Word
                        </Button>
                      </div>
                    </div>

                    {/* 送付状 */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">送付状</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation h-10"
                          onClick={() => downloadInvoicePdf(item.invoicePdfUrl, item.companyName)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation h-10"
                          onClick={() => downloadInvoiceDocx(item.invoiceDocxUrl, item.companyName)}
                        >
                          <File className="w-4 h-4 mr-1" />
                          Word
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* メール送信ボタン */}
                  <div className="mt-4 pt-4 border-t border-pink-100">
                    {item.emailSent ? (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-sm text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          送信済み
                          {item.emailTo && (
                            <span className="text-gray-400 ml-2">({item.emailTo})</span>
                          )}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 active:scale-[0.98] touch-manipulation h-9"
                          onClick={() => handleEmailClick(item)}
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          再送信
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full h-10 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 active:scale-[0.98] touch-manipulation"
                        onClick={() => handleEmailClick(item)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        メールで送信
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* フッター */}
        <footer className="text-center text-sm text-gray-400 mt-12">
          {FOOTER_TEXT}
        </footer>
      </div>
    </div>
  )
}
