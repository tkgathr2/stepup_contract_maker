"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import CompanyForm, { CompanyData } from "@/components/forms/CompanyForm"
import TemplateSelector from "@/components/templates/TemplateSelector"
import { toast } from "sonner"

export default function GeneratePage() {
  const [templateId, setTemplateId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)

  const handleGenerate = async (data: CompanyData) => {
    if (!templateId) {
      toast.error("テンプレートを選択してください")
      return
    }

    setIsLoading(true)
    setPdfUrl(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          templateId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "PDF生成に失敗しました")
      }

      setPdfUrl(result.pdfUrl)
      toast.success("PDFを生成しました")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreview = async (data: CompanyData) => {
    if (!templateId) {
      toast.error("テンプレートを選択してください")
      return
    }

    setIsPreviewing(true)
    setPreviewPdf(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          templateId,
          preview: true,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "プレビュー生成に失敗しました")
      }

      setPreviewPdf(result.pdfBase64)
      toast.success("プレビューを生成しました")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = "generated.pdf"
      link.click()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PDF生成</h1>
        <p className="text-gray-500">
          会社情報を入力してPDFを生成します
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>テンプレート選択</CardTitle>
              <CardDescription>
                使用するテンプレートを選択してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateSelector
                value={templateId}
                onChange={setTemplateId}
                disabled={isLoading || isPreviewing}
              />
            </CardContent>
          </Card>

          <CompanyForm
            onSubmit={handleGenerate}
            onPreview={handlePreview}
            isLoading={isLoading}
            isPreviewing={isPreviewing}
          />
        </div>

        <div className="space-y-6">
          {pdfUrl && (
            <Card>
              <CardHeader>
                <CardTitle>生成完了</CardTitle>
                <CardDescription>
                  PDFが正常に生成されました
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleDownload} className="w-full">
                  PDFをダウンロード
                </Button>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[600px]"
                    title="Generated PDF"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {previewPdf && !pdfUrl && (
            <Card>
              <CardHeader>
                <CardTitle>プレビュー</CardTitle>
                <CardDescription>
                  生成されるPDFのプレビューです
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={`data:application/pdf;base64,${previewPdf}`}
                    className="w-full h-[600px]"
                    title="PDF Preview"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {!pdfUrl && !previewPdf && (
            <Card>
              <CardHeader>
                <CardTitle>プレビュー・生成結果</CardTitle>
                <CardDescription>
                  プレビューまたは生成結果がここに表示されます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">
                    会社情報を入力してプレビューまたは生成を実行してください
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
