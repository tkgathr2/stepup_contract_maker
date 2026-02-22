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
import {
  FileText,
  Layers,
  FolderOpen,
  Clock,
  Download,
  TrendingUp,
  CalendarDays,
  FileStack,
  ArrowRight,
} from "lucide-react"

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
        const historyRes = await fetch("/api/history?limit=5")
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setRecentHistories(historyData.histories)

          const totalRes = await fetch("/api/history?limit=1")
          if (totalRes.ok) {
            const totalData = await totalRes.json()

            const now = new Date()
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const monthRes = await fetch(
              `/api/history?limit=1&from=${firstDayOfMonth.toISOString().split("T")[0]}`
            )
            const monthData = monthRes.ok ? await monthRes.json() : { total: 0 }

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

  const statsCards = [
    {
      label: "総生成数",
      value: stats?.totalGenerated || 0,
      description: "これまでに生成したPDFの総数",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/8",
    },
    {
      label: "今月の生成数",
      value: stats?.thisMonthGenerated || 0,
      description: "今月生成したPDFの数",
      icon: CalendarDays,
      color: "text-violet-500",
      bgColor: "bg-violet-50",
    },
    {
      label: "登録テンプレート数",
      value: stats?.templatesCount || 0,
      description: "利用可能なテンプレート",
      icon: FileStack,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
  ]

  const quickActions = [
    {
      title: "PDF生成",
      description: "会社情報を入力してPDFを生成",
      icon: FileText,
      href: "/generate",
      buttonLabel: "新規生成",
      primary: true,
    },
    {
      title: "一括生成",
      description: "複数の会社情報を一括でPDF化",
      icon: Layers,
      href: "/batch",
      buttonLabel: "一括生成",
      primary: false,
    },
    {
      title: "テンプレート管理",
      description: "テンプレートのアップロード・管理",
      icon: FolderOpen,
      href: "/templates",
      buttonLabel: "管理する",
      primary: false,
    },
    {
      title: "生成履歴",
      description: "過去に生成したPDFを確認",
      icon: Clock,
      href: "/history",
      buttonLabel: "履歴を見る",
      primary: false,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          おかえりなさい、{session?.user?.name}さん
        </h1>
        <p className="text-muted-foreground mt-1">
          今日も効率的に書類を作成しましょう
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1 text-foreground">
                      {loading ? "..." : stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.title} href={action.href}>
              <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer h-full border-border/60">
                <CardContent className="pt-6 pb-5 flex flex-col h-full">
                  <div className={`w-10 h-10 rounded-xl ${action.primary ? "bg-primary/10" : "bg-muted"} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${action.primary ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 flex-1">
                    {action.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    {action.buttonLabel}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">最近の生成履歴</CardTitle>
            <CardDescription>直近5件の生成履歴</CardDescription>
          </div>
          {recentHistories.length > 0 && (
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                すべて見る
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">読み込み中...</span>
            </div>
          ) : recentHistories.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">まだ生成履歴がありません</p>
              <Link href="/generate">
                <Button className="mt-4" size="sm">最初のPDFを生成する</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>会社名</TableHead>
                  <TableHead>テンプレート</TableHead>
                  <TableHead>生成日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentHistories.map((history) => (
                  <TableRow key={history.id} className="hover:bg-accent/30">
                    <TableCell className="font-medium">{history.companyName}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {history.templateName}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(history.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:text-primary/80 hover:bg-primary/8"
                        onClick={() => handleDownload(history.pdfUrl, history.companyName)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        DL
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
