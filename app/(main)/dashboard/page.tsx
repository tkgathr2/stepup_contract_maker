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
      label: "\u7dcf\u751f\u6210\u6570",
      value: stats?.totalGenerated || 0,
      description: "\u3053\u308c\u307e\u3067\u306b\u751f\u6210\u3057\u305fPDF\u306e\u7dcf\u6570",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/8",
    },
    {
      label: "\u4eca\u6708\u306e\u751f\u6210\u6570",
      value: stats?.thisMonthGenerated || 0,
      description: "\u4eca\u6708\u751f\u6210\u3057\u305fPDF\u306e\u6570",
      icon: CalendarDays,
      color: "text-violet-500",
      bgColor: "bg-violet-50",
    },
    {
      label: "\u767b\u9332\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u6570",
      value: stats?.templatesCount || 0,
      description: "\u5229\u7528\u53ef\u80fd\u306a\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8",
      icon: FileStack,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
  ]

  const quickActions = [
    {
      title: "PDF\u751f\u6210",
      description: "\u4f1a\u793e\u60c5\u5831\u3092\u5165\u529b\u3057\u3066PDF\u3092\u751f\u6210",
      icon: FileText,
      href: "/generate",
      buttonLabel: "\u65b0\u898f\u751f\u6210",
      primary: true,
    },
    {
      title: "\u4e00\u62ec\u751f\u6210",
      description: "\u8907\u6570\u306e\u4f1a\u793e\u60c5\u5831\u3092\u4e00\u62ec\u3067PDF\u5316",
      icon: Layers,
      href: "/batch",
      buttonLabel: "\u4e00\u62ec\u751f\u6210",
      primary: false,
    },
    {
      title: "\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u7ba1\u7406",
      description: "\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u306e\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u30fb\u7ba1\u7406",
      icon: FolderOpen,
      href: "/templates",
      buttonLabel: "\u7ba1\u7406\u3059\u308b",
      primary: false,
    },
    {
      title: "\u751f\u6210\u5c65\u6b74",
      description: "\u904e\u53bb\u306b\u751f\u6210\u3057\u305fPDF\u3092\u78ba\u8a8d",
      icon: Clock,
      href: "/history",
      buttonLabel: "\u5c65\u6b74\u3092\u898b\u308b",
      primary: false,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          \u304a\u304b\u3048\u308a\u306a\u3055\u3044\u3001{session?.user?.name}\u3055\u3093
        </h1>
        <p className="text-muted-foreground mt-1">
          \u4eca\u65e5\u3082\u52b9\u7387\u7684\u306b\u66f8\u985e\u3092\u4f5c\u6210\u3057\u307e\u3057\u3087\u3046
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
            <CardTitle className="text-lg">\u6700\u8fd1\u306e\u751f\u6210\u5c65\u6b74</CardTitle>
            <CardDescription>\u76f4\u8fd15\u4ef6\u306e\u751f\u6210\u5c65\u6b74</CardDescription>
          </div>
          {recentHistories.length > 0 && (
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                \u3059\u3079\u3066\u898b\u308b
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">\u8aad\u307f\u8fbc\u307f\u4e2d...</span>
            </div>
          ) : recentHistories.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">\u307e\u3060\u751f\u6210\u5c65\u6b74\u304c\u3042\u308a\u307e\u305b\u3093</p>
              <Link href="/generate">
                <Button className="mt-4" size="sm">\u6700\u521d\u306ePDF\u3092\u751f\u6210\u3059\u308b</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>\u4f1a\u793e\u540d</TableHead>
                  <TableHead>\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8</TableHead>
                  <TableHead>\u751f\u6210\u65e5\u6642</TableHead>
                  <TableHead className="text-right">\u64cd\u4f5c</TableHead>
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
