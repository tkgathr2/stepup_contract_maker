"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { lookupPostalCode } from "@/lib/postal-code-lookup"
import { addHistory, updateHistory, getRecentHistory, HistoryItem } from "@/lib/local-storage"
import { downloadFile, downloadContractPdf, downloadInvoicePdf } from "@/lib/download"
import { formatDate } from "@/lib/date-format"
import { getAnnouncements, getAnnouncementsHidden, setAnnouncementsHidden, AnnouncementItem } from "@/lib/announcements"
import { EmailForm } from "@/components/forms/EmailForm"
import { Download, FileText, File, Loader2, Mail, Bell, X, History } from "lucide-react"
import { FOOTER_TEXT } from "@/lib/constants"
import { Header } from "@/components/layout/header"
import { PageErrorBoundary } from "@/components/error-boundary"

interface GenerateResult {
  success: boolean
  contractPdfUrl: string
  contractDocxUrl: string
  invoicePdfUrl: string
  invoiceDocxUrl: string
  postalCode: string
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [companyName, setCompanyName] = useState("")
  const [address, setAddress] = useState("")
  const [representativeName, setRepresentativeName] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [previewType, setPreviewType] = useState<"contract" | "invoice">("contract")
  const [isEmailFormOpen, setIsEmailFormOpen] = useState(false)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // クライアント側でマウントされたかどうかを追跡
  const [isMounted, setIsMounted] = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)

  // クライアント側でのみお知らせの表示状態を設定
  useEffect(() => {
    setIsMounted(true)
    setShowAnnouncements(!getAnnouncementsHidden())
  }, [])

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

  // Ctrl+Enterでフォーム送信
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault()
        if (formRef.current && !isLoading) {
          formRef.current.requestSubmit()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isLoading])

  // 住所から郵便番号を検索
  const lookupPostalCodeFromAddress = useCallback(async (address: string) => {
    if (!address || address.trim() === "") {
      return
    }

    setIsLookingUpPostalCode(true)
    try {
      const postalCodeResult = await lookupPostalCode(address)
      if (postalCodeResult) {
        setPostalCode(postalCodeResult)
        console.log(`郵便番号を検索しました: ${postalCodeResult}`)
      } else {
        setPostalCode("")
      }
    } catch (error) {
      console.error("郵便番号検索エラー:", error)
      setPostalCode("")
      toast.error("郵便番号の検索に失敗しました")
    } finally {
      setIsLookingUpPostalCode(false)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 未ログインの場合はログインページにリダイレクト
    if (!session) {
      toast.error("書類を生成するにはログインが必要です")
      router.push("/login")
      return
    }

    if (!companyName || !address || !representativeName) {
      toast.error("会社名、住所、代表者名を入力してください")
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          address,
          representativeName,
          postalCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "PDF生成に失敗しました")
      }

      setResult(data)

      // 履歴を保存
      if (session?.user?.id) {
        try {
          const historyItem = addHistory({
            userId: session.user.id,
            companyName,
            address,
            representativeName,
            postalCode: data.postalCode || "",
            contractPdfUrl: data.contractPdfUrl,
            contractDocxUrl: data.contractDocxUrl,
            invoicePdfUrl: data.invoicePdfUrl,
            invoiceDocxUrl: data.invoiceDocxUrl,
            createdByName: session.user.name || undefined,
          })
          setCurrentHistoryId(historyItem.id)
        } catch (historyError) {
          console.error("履歴保存エラー:", historyError)
          toast.error("履歴の保存に失敗しました（書類は正常に生成されました）")
        }
      }

      if (data.postalCode) {
        toast.success(`書類を生成しました（郵便番号: ${data.postalCode}）`)
      } else {
        toast.success("書類を生成しました")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSuccess = useCallback((emailTo: string) => {
    if (session?.user?.id && currentHistoryId) {
      updateHistory(session.user.id, currentHistoryId, {
        emailSent: true,
        emailSentAt: new Date().toISOString(),
        emailTo,
      })
    }
  }, [session?.user?.id, currentHistoryId])

  // Gmail Web版を開く（短縮URL使用）
  const handleEmailClick = useCallback(async () => {
    if (!result) return

    const senderName = session?.user?.name || "担当者"
    const subject = "契約書送付のご案内"

    // ファイルのダウンロードリンク（絶対URL）
    const baseUrl = window.location.origin
    const contractPdfUrl = `${baseUrl}${result.contractPdfUrl}`

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

    const body = `${companyName}様

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
  }, [result, companyName, session])

  // メモ化された添付ファイルリスト
  const emailAttachments = useMemo(() => {
    if (!result) return []
    return [
      { filename: `人材紹介契約書(${companyName}様).pdf`, url: result.contractPdfUrl },
      { filename: `送付状(${companyName}様).pdf`, url: result.invoicePdfUrl },
    ]
  }, [result, companyName])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 safe-area-inset-top safe-area-inset-bottom scroll-smooth tap-highlight-none">
      <Header />
      <main className="pb-8">
        <PageErrorBoundary>
          <div className="py-6 sm:py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              {/* ヘッダー */}
              <div className="mb-5 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  {session ? `ようこそ、${session.user?.name || "ゲスト"}さん` : "契約書・送り状を作成"}
                </h1>
                <p className="text-gray-600 mt-2 text-sm sm:text-base">
                  会社情報を入力して、契約書と送付状をPDFとWord形式で生成します
                </p>
              </div>

              {/* お知らせセクション */}
              {isMounted && showAnnouncements && announcements.length > 0 && (
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="border-pink-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl text-gray-800">会社情報入力</CardTitle>
                    <CardDescription className="text-sm">
                      契約先の会社情報を入力してください
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-gray-700 text-sm sm:text-base">会社名</Label>
                        <Input
                          id="companyName"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="株式会社サンプル"
                          disabled={isLoading}
                          className="border-pink-200 focus:border-pink-400 focus:ring-pink-400 h-11 sm:h-10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-gray-700 text-sm sm:text-base">
                          住所
                          {isLookingUpPostalCode && (
                            <span className="ml-2 text-xs sm:text-sm text-pink-500">（郵便番号を検索中...）</span>
                          )}
                        </Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          onBlur={(e) => lookupPostalCodeFromAddress(e.target.value)}
                          placeholder="東京都渋谷区..."
                          disabled={isLoading}
                          className="border-pink-200 focus:border-pink-400 focus:ring-pink-400 h-11 sm:h-10"
                        />
                        <p className="text-xs text-gray-400">入力後に郵便番号を自動検索します</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="representativeName" className="text-gray-700 text-sm sm:text-base">代表者名</Label>
                        <Input
                          id="representativeName"
                          value={representativeName}
                          onChange={(e) => setRepresentativeName(e.target.value)}
                          placeholder="山田 太郎"
                          disabled={isLoading}
                          className="border-pink-200 focus:border-pink-400 focus:ring-pink-400 h-11 sm:h-10"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 sm:h-11 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 active:scale-[0.98] touch-manipulation text-base sm:text-sm"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>書類を生成<span className="hidden sm:inline">（Ctrl+Enter）</span></>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-pink-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl text-gray-800">生成結果</CardTitle>
                    <CardDescription className="text-sm">
                      生成されたPDFをダウンロードできます
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    {result ? (
                      <div className="space-y-4">
                        <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-800 font-medium text-sm sm:text-base">
                            書類の生成が完了しました
                          </p>
                          {result.postalCode && (
                            <p className="text-green-700 text-xs sm:text-sm mt-1">
                              郵便番号: {result.postalCode}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-gray-700 mt-4">契約書</div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => downloadFile(result.contractPdfUrl, `人材紹介契約書(${companyName}様).pdf`)}
                              variant="outline"
                              className="w-full h-10 border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation"
                            >
                              <Download className="w-4 h-4 mr-1 sm:mr-2" />
                              PDF
                            </Button>
                            <Button
                              onClick={() => downloadFile(result.contractDocxUrl, `人材紹介契約書(${companyName}様).docx`)}
                              variant="outline"
                              className="w-full h-10 border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation"
                            >
                              <File className="w-4 h-4 mr-1 sm:mr-2" />
                              Word
                            </Button>
                          </div>

                          <div className="text-sm font-semibold text-gray-700 mt-4">送付状</div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => downloadFile(result.invoicePdfUrl, `送付状(${companyName}様).pdf`)}
                              variant="outline"
                              className="w-full h-10 border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation"
                            >
                              <Download className="w-4 h-4 mr-1 sm:mr-2" />
                              PDF
                            </Button>
                            <Button
                              onClick={() => downloadFile(result.invoiceDocxUrl, `送付状(${companyName}様).docx`)}
                              variant="outline"
                              className="w-full h-10 border-pink-200 text-pink-600 hover:bg-pink-50 active:scale-[0.98] touch-manipulation"
                            >
                              <File className="w-4 h-4 mr-1 sm:mr-2" />
                              Word
                            </Button>
                          </div>

                          {/* メール送信ボタン（Gmail Web版を開く） */}
                          <div className="pt-4 border-t border-pink-100 mt-4">
                            <Button
                              onClick={handleEmailClick}
                              className="w-full h-11 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 active:scale-[0.98] touch-manipulation"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              メールで送信
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[250px] sm:h-[300px] border-2 border-dashed border-pink-200 rounded-lg flex items-center justify-center">
                        <div className="text-center px-4">
                          <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-pink-200 mx-auto mb-4" />
                          <p className="text-gray-400 text-sm sm:text-base">
                            会社情報を入力して<br />「書類を生成」をタップしてください
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* プレビューセクション（全幅） - デスクトップのみ表示 */}
              {result && (
                <Card className="mt-6 sm:mt-8 border-pink-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl text-gray-800">書類プレビュー</CardTitle>
                    <CardDescription className="text-sm">
                      生成された書類をプレビューで確認できます
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    <div className="border-t border-pink-100 pt-4">
                      <div className="flex gap-2 mb-4">
                        <Button
                          variant={previewType === "contract" ? "default" : "outline"}
                          onClick={() => setPreviewType("contract")}
                          className={`flex-1 h-10 touch-manipulation active:scale-[0.98] ${previewType === "contract" ? "bg-gradient-to-r from-pink-400 to-rose-400" : "border-pink-200 text-pink-600"}`}
                        >
                          契約書
                        </Button>
                        <Button
                          variant={previewType === "invoice" ? "default" : "outline"}
                          onClick={() => setPreviewType("invoice")}
                          className={`flex-1 h-10 touch-manipulation active:scale-[0.98] ${previewType === "invoice" ? "bg-gradient-to-r from-pink-400 to-rose-400" : "border-pink-200 text-pink-600"}`}
                        >
                          送付状
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {previewType === "contract" ? "契約書" : "送付状"}プレビュー:
                      </p>
                      <iframe
                        src={previewType === "contract" ? result.contractPdfUrl : result.invoicePdfUrl}
                        className="w-full h-[400px] sm:h-[600px] border border-pink-200 rounded"
                        title={previewType === "contract" ? "Contract PDF Preview" : "Invoice PDF Preview"}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 最近の履歴セクション（ログイン時のみ表示） */}
              {session && (
                <Card className="mt-6 sm:mt-8 border-pink-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-pink-500" />
                        <CardTitle className="text-lg sm:text-xl text-gray-800">最近の生成履歴</CardTitle>
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
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    {recentHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">まだ履歴がありません</p>
                        <p className="text-gray-400 text-sm mt-2">上のフォームから最初の書類を作成してください</p>
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
                                <p className="text-sm text-gray-500">作成者: {item.createdByName || "-"}</p>
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
              )}

              {/* メール送信フォーム */}
              <EmailForm
                isOpen={isEmailFormOpen}
                onClose={() => setIsEmailFormOpen(false)}
                companyName={companyName}
                attachments={emailAttachments}
                onSuccess={handleEmailSuccess}
                senderName={session?.user?.name || "株式会社ステップアップ"}
              />

              {/* フッター */}
              <footer className="text-center text-sm text-gray-400 mt-12">
                {FOOTER_TEXT}
              </footer>
            </div>
          </div>
        </PageErrorBoundary>
      </main>
    </div>
  )
}
