"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getHistory, searchHistory, deleteHistory, HistoryItem } from "@/lib/local-storage"
import { toast } from "sonner"
import { ArrowLeft, Download, Trash2, Search, FileText, File } from "lucide-react"

export default function HistoryPage() {
  const { data: session } = useSession()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const loadHistory = useCallback(() => {
    if (session?.user?.id) {
      if (searchQuery.trim()) {
        setHistory(searchHistory(session.user.id, searchQuery))
      } else {
        setHistory(getHistory(session.user.id))
      }
    }
    setIsLoading(false)
  }, [session?.user?.id, searchQuery])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleDelete = (id: string, companyName: string) => {
    if (!session?.user?.id) return

    if (window.confirm(`${companyName}の履歴を削除しますか？`)) {
      const success = deleteHistory(session.user.id, id)
      if (success) {
        toast.success("履歴を削除しました")
        loadHistory()
      } else {
        toast.error("削除に失敗しました")
      }
    }
  }

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
  }

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
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ダッシュボードに戻る
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">生成履歴</h1>
          <p className="text-gray-600 mt-2">
            過去に生成した書類の一覧です
          </p>
        </div>

        {/* 検索バー */}
        <Card className="mb-6 border-pink-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="会社名・代表者名・住所で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* 履歴一覧 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto"></div>
            <p className="text-gray-500 mt-4">読み込み中...</p>
          </div>
        ) : history.length === 0 ? (
          <Card className="border-pink-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchQuery ? "検索結果がありません" : "履歴がありません"}
              </p>
              {!searchQuery && (
                <Link href="/generate">
                  <Button className="mt-6 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500">
                    書類を作成する
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Card
                key={item.id}
                className="border-pink-200 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl text-gray-800">
                        {item.companyName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {item.representativeName} 様
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(item.id, item.companyName)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 mb-4">
                    <p>{item.postalCode && `${item.postalCode} `}{item.address}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      作成日時: {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 契約書 */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">契約書</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50"
                          onClick={() => handleDownload(item.contractPdfUrl, `人材紹介契約書(${item.companyName}様).pdf`)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50"
                          onClick={() => handleDownload(item.contractDocxUrl, `人材紹介契約書(${item.companyName}様).docx`)}
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
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50"
                          onClick={() => handleDownload(item.invoicePdfUrl, `送付状(${item.companyName}様).pdf`)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50"
                          onClick={() => handleDownload(item.invoiceDocxUrl, `送付状(${item.companyName}様).docx`)}
                        >
                          <File className="w-4 h-4 mr-1" />
                          Word
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
