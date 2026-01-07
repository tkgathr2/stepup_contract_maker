"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface GenerateResult {
  success: boolean
  contractPdfUrl: string
  contractDocxUrl: string
  invoicePdfUrl: string
  invoiceDocxUrl: string
  postalCode: string
}

export default function Home() {
  const [companyName, setCompanyName] = useState("")
  const [address, setAddress] = useState("")
  const [representativeName, setRepresentativeName] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)

  // 郵便番号から住所を検索
  const lookupAddressByPostalCode = useCallback(async (postalCode: string) => {
    // ハイフンを除去して7桁の数字かチェック
    const cleanedPostalCode = postalCode.replace(/-/g, "")
    if (!/^\d{7}$/.test(cleanedPostalCode)) {
      return
    }

    setIsLookingUpAddress(true)
    try {
      const response = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedPostalCode}`
      )

      if (!response.ok) {
        return
      }

      const data = await response.json()

      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0]
        const fullAddress = `${result.address1}${result.address2}${result.address3}`
        setAddress(fullAddress)
        toast.success("住所を自動入力しました")
      }
    } catch (error) {
      console.error("住所検索エラー:", error)
    } finally {
      setIsLookingUpAddress(false)
    }
  }, [])

  // 郵便番号が変更されたときに住所を検索
  const handlePostalCodeChange = useCallback(
    (value: string) => {
      setPostalCode(value)
      // ハイフンを除去して7桁になったら自動検索
      const cleaned = value.replace(/-/g, "")
      if (cleaned.length === 7) {
        lookupAddressByPostalCode(value)
      }
    },
    [lookupAddressByPostalCode]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyName || !address || !representativeName || !postalCode) {
      toast.error("すべての項目を入力してください")
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            契約書・送り状自動生成システム
          </h1>
          <p className="text-gray-500 mt-2">
            会社情報を入力して、契約書と送付状をPDFとWord形式で生成します
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>会社情報入力</CardTitle>
              <CardDescription>
                契約先の会社情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">会社名</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="株式会社サンプル"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">住所</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="東京都渋谷区..."
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="representativeName">代表者名</Label>
                  <Input
                    id="representativeName"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    placeholder="山田 太郎"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">
                    郵便番号
                    {isLookingUpAddress && (
                      <span className="ml-2 text-sm text-gray-500">（住所を検索中...）</span>
                    )}
                  </Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    placeholder="123-4567（7桁入力で自動検索）"
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "生成中..." : "書類を生成"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>生成結果</CardTitle>
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
                        className="w-full"
                      >
                        PDF
                      </Button>
                      <Button
                        onClick={() => handleDownload(result.contractDocxUrl, `人材紹介契約書(${companyName}様).docx`)}
                        variant="outline"
                        className="w-full"
                      >
                        Word
                      </Button>
                    </div>

                    <div className="text-sm font-semibold text-gray-700 mt-4">送付状</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleDownload(result.invoicePdfUrl, `送付状(${companyName}様).pdf`)}
                        variant="outline"
                        className="w-full"
                      >
                        PDF
                      </Button>
                      <Button
                        onClick={() => handleDownload(result.invoiceDocxUrl, `送付状(${companyName}様).docx`)}
                        variant="outline"
                        className="w-full"
                      >
                        Word
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-gray-500 mb-2">契約書プレビュー:</p>
                    <iframe
                      src={result.contractPdfUrl}
                      className="w-full h-[300px] border rounded"
                      title="Contract PDF"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-[300px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400 text-center">
                    会社情報を入力して<br />「書類を生成」をクリックしてください
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
