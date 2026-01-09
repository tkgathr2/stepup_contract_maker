"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { lookupPostalCode } from "@/lib/postal-code-lookup"
import { addHistory, updateHistory } from "@/lib/local-storage"
import { downloadFile } from "@/lib/download"
import { EmailForm } from "@/components/forms/EmailForm"
import { ArrowLeft, Download, FileText, File, Loader2, Mail } from "lucide-react"
import { FOOTER_TEXT } from "@/lib/constants"

interface GenerateResult {
  success: boolean
  contractPdfUrl: string
  contractDocxUrl: string
  invoicePdfUrl: string
  invoiceDocxUrl: string
  postalCode: string
}

export default function GeneratePage() {
  const { data: session } = useSession()
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

  // メモ化された添付ファイルリスト
  const emailAttachments = useMemo(() => {
    if (!result) return []
    return [
      { filename: `人材紹介契約書(${companyName}様).pdf`, url: result.contractPdfUrl },
      { filename: `送付状(${companyName}様).pdf`, url: result.invoicePdfUrl },
    ]
  }, [result, companyName])

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ヘッダー */}
        <div className="mb-5 sm:mb-6">
          <Link href="/dashboard" className="touch-manipulation">
            <Button variant="ghost" className="mb-3 sm:mb-4 text-gray-600 hover:text-gray-800 -ml-2 active:scale-[0.98]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ダッシュボードに戻る
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            契約書・送り状を作成
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            会社情報を入力して、契約書と送付状をPDFとWord形式で生成します
          </p>
        </div>

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

                    {/* メール送信ボタン */}
                    <div className="pt-4 border-t border-pink-100 mt-4">
                      <Button
                        onClick={() => setIsEmailFormOpen(true)}
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

        {/* メール送信フォーム */}
        <EmailForm
          isOpen={isEmailFormOpen}
          onClose={() => setIsEmailFormOpen(false)}
          companyName={companyName}
          attachments={emailAttachments}
          onSuccess={handleEmailSuccess}
        />

        {/* フッター */}
        <footer className="text-center text-sm text-gray-400 mt-12">
          {FOOTER_TEXT}
        </footer>
      </div>
    </div>
  )
}
