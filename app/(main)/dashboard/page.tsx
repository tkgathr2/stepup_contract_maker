"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

interface History {
  id: string
  companyName: string
  templateName: string
  pdfUrl: string
  createdAt: string
}

interface Stats {
  totalGenerated: number
  thisMonthGenerated: number
  templatesCount: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [recentHistories, setRecentHistories] = useState<History[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 最近の履歴を取得
        const historyRes = await fetch("/api/history?limit=5")
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setRecentHistories(historyData.histories)

          // 統計情報を計算
          const totalRes = await fetch("/api/history?limit=1")
          if (totalRes.ok) {
            const totalData = await totalRes.json()

            // 今月の生成数を計算
            const now = new Date()
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const monthRes = await fetch(
              `/api/history?limit=1&from=${firstDayOfMonth.toISOString().split("T")[0]}`
            )
            const monthData = monthRes.ok ? await monthRes.json() : { total: 0 }

            // テンプレート数を取得
            const templatesRes = await fetch("/api/templates")
            const templatesData = templatesRes.ok
              ? await templatesRes.json()
              : { templates: [] }

            setStats({
              totalGenerated: totalData.total,
              thisMonthGenerated: monthData.total,
              templatesCount: templatesData.templates.length,
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDownload = (pdfUrl: string, companyName: string) => {
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = `${companyName}.pdf`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500">
          ようこそ、{session?.user?.name}さん
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総生成数</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : stats?.totalGenerated || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">これまでに生成したPDFの総数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>今月の生成数</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : stats?.thisMonthGenerated || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">今月生成したPDFの数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>登録テンプレート数</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : stats?.templatesCount || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">利用可能なテンプレート</p>
          </CardContent>
        </Card>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/generate">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">PDF生成</CardTitle>
              <CardDescription>
                会社情報を入力してPDFを生成
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">新規生成</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/batch">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">一括生成</CardTitle>
              <CardDescription>
                複数の会社情報を一括でPDF化
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">一括生成</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/templates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">テンプレート管理</CardTitle>
              <CardDescription>
                テンプレートのアップロード・管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">管理する</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/history">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">生成履歴</CardTitle>
              <CardDescription>
                過去に生成したPDFを確認
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">履歴を見る</Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 最近の生成履歴 */}
      <Card>
        <CardHeader>
          <CardTitle>最近の生成履歴</CardTitle>
          <CardDescription>
            直近5件の生成履歴
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4 text-gray-500">読み込み中...</p>
          ) : recentHistories.length === 0 ? (
            <p className="text-center py-4 text-gray-500">
              まだ生成履歴がありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会社名</TableHead>
                  <TableHead>テンプレート</TableHead>
                  <TableHead>生成日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentHistories.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell className="font-medium">
                      {history.companyName}
                    </TableCell>
                    <TableCell>{history.templateName}</TableCell>
                    <TableCell>{formatDate(history.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDownload(history.pdfUrl, history.companyName)
                        }
                      >
                        DL
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {recentHistories.length > 0 && (
            <div className="mt-4">
              <Link href="/history">
                <Button variant="ghost" className="w-full">
                  すべての履歴を見る
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
