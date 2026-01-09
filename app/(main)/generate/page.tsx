"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { lookupPostalCode } from "@/lib/postal-code-lookup"
import { addHistory } from "@/lib/local-storage"
import { ArrowLeft, Download, FileText, File } from "lucide-react"

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
          addHistory({
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
        } catch (historyError) {
          console.error("履歴保存エラー:", historyError)
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

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
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
          <h1 className="text-3xl font-bold text-gray-800">
            契約書・送り状を作成
          </h1>
          <p className="text-gray-600 mt-2">
            会社情報を入力して、契約書と送付状をPDFとWord形式で生成します
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-pink-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-800">会社情報入力</CardTitle>
              <CardDescription>
                契約先の会社情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-gray-700">会社名</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="株式会社サンプル"
                    disabled={isLoading}
                    className="border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-700">
                    住所
                    {isLookingUpPostalCode && (
                      <span className="ml-2 text-sm text-pink-500">（郵便番号を検索中...）</span>
                    )}
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onBlur={(e) => lookupPostalCodeFromAddress(e.target.value)}
                    placeholder="東京都渋谷区...（入力後に郵便番号を自動検索）"
                    disabled={isLoading}
                    className="border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="representativeName" className="text-gray-700">代表者名</Label>
                  <Input
                    id="representativeName"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    placeholder="山田 太郎"
                    disabled={isLoading}
                    className="border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500"
                  disabled={isLoading}
                >
                  {isLoading ? "生成中..." : "書類を生成（Ctrl+Enter）"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-pink-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-800">生成結果</CardTitle>
              <CardDescription>
                生成されたPDFをダウンロードできます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">
                      書類の生成が完了しました
                    </p>
                    {result.postalCode && (
                      <p className="text-green-700 text-sm mt-1">
                        郵便番号: {result.postalCode}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700 mt-4">契約書</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleDownload(result.contractPdfUrl, `人材紹介契約書(${companyName}様).pdf`)}
                        variant="outline"
                        className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        onClick={() => handleDownload(result.contractDocxUrl, `人材紹介契約書(${companyName}様).docx`)}
                        variant="outline"
                        className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        <File className="w-4 h-4 mr-2" />
                        Word
                      </Button>
                    </div>

                    <div className="text-sm font-semibold text-gray-700 mt-4">送付状</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleDownload(result.invoicePdfUrl, `送付状(${companyName}様).pdf`)}
                        variant="outline"
                        className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        onClick={() => handleDownload(result.invoiceDocxUrl, `送付状(${companyName}様).docx`)}
                        variant="outline"
                        className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                      >
                        <File className="w-4 h-4 mr-2" />
                        Word
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[300px] border-2 border-dashed border-pink-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-pink-200 mx-auto mb-4" />
                    <p className="text-gray-400">
                      会社情報を入力して<br />「書類を生成」をクリックしてください
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* プレビューセクション（全幅） */}
        {result && (
          <Card className="mt-8 border-pink-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-800">書類プレビュー</CardTitle>
              <CardDescription>
                生成された書類をプレビューで確認できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-t border-pink-100 pt-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={previewType === "contract" ? "default" : "outline"}
                    onClick={() => setPreviewType("contract")}
                    className={`flex-1 ${previewType === "contract" ? "bg-gradient-to-r from-pink-400 to-rose-400" : "border-pink-200 text-pink-600"}`}
                  >
                    契約書
                  </Button>
                  <Button
                    variant={previewType === "invoice" ? "default" : "outline"}
                    onClick={() => setPreviewType("invoice")}
                    className={`flex-1 ${previewType === "invoice" ? "bg-gradient-to-r from-pink-400 to-rose-400" : "border-pink-200 text-pink-600"}`}
                  >
                    送付状
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {previewType === "contract" ? "契約書" : "送付状"}プレビュー:
                </p>
                <iframe
                  src={previewType === "contract" ? result.contractPdfUrl : result.invoicePdfUrl}
                  className="w-full h-[600px] border border-pink-200 rounded"
                  title={previewType === "contract" ? "Contract PDF Preview" : "Invoice PDF Preview"}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
