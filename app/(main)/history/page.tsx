"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

interface History {
  id: string
  companyName: string
  address: string
  representativeName: string
  templateName: string
  templateType: string
  pdfUrl: string
  createdAt: string
}

export default function HistoryPage() {
  const [histories, setHistories] = useState<History[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchHistories = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) {
        params.append("search", search)
      }
      if (fromDate) {
        params.append("from", fromDate)
      }
      if (toDate) {
        params.append("to", toDate)
      }

      const response = await fetch(`/api/history?${params}`)
      if (!response.ok) throw new Error("Failed to fetch histories")

      const data = await response.json()
      setHistories(data.histories)
      setTotal(data.total)
    } catch {
      toast.error("履歴の取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [page, search, fromDate, toDate])

  useEffect(() => {
    fetchHistories()
  }, [fetchHistories])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchHistories()
  }

  const handleDownload = (history: History) => {
    const d = new Date(history.createdAt)
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
    const fileName = `${history.templateName}_${history.companyName}_${dateStr}.pdf`
    fetch(history.pdfUrl, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("ダウンロードに失敗しました")
        return res.blob()
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = fileName
        link.click()
        URL.revokeObjectURL(blobUrl)
      })
      .catch(() => toast.error("PDFのダウンロードに失敗しました"))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTypeLabel = (type: string) => {
    return type === "contract" ? "契約書" : "送り状"
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">生成履歴</h1>
        <p className="text-muted-foreground">
          過去に生成したPDFの一覧
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>履歴検索</CardTitle>
          <CardDescription>
            会社名で検索できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="会社名で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="outline">
                検索
              </Button>
              {(search || fromDate || toDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch("")
                    setFromDate("")
                    setToDate("")
                    setPage(1)
                  }}
                >
                  クリア
                </Button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
                className="max-w-[160px]"
              />
              <span className="text-muted-foreground text-sm">~</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1) }}
                className="max-w-[160px]"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>履歴一覧</CardTitle>
          <CardDescription>
            全{total}件（{page}/{totalPages || 1}ページ）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">読み込み中...</p>
          ) : histories.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {search ? "検索結果がありません" : "履歴がありません"}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>会社名</TableHead>
                      <TableHead>代表者名</TableHead>
                      <TableHead>テンプレート</TableHead>
                      <TableHead>生成日時</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {histories.map((history) => (
                      <TableRow key={history.id}>
                        <TableCell className="font-medium">
                          {history.companyName}
                        </TableCell>
                        <TableCell>{history.representativeName}</TableCell>
                        <TableCell>
                          {history.templateName}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({getTypeLabel(history.templateType)})
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(history.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleDownload(history)
                            }
                          >
                            ダウンロード
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    前へ
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
