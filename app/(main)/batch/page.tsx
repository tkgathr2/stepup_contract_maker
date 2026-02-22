"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import BatchForm, { CompanyData } from "@/components/forms/BatchForm"
import TemplateSelector from "@/components/templates/TemplateSelector"
import { toast } from "sonner"

interface GeneratedPDF {
  pdfUrl: string
  companyName: string
  historyId: string
}

export default function BatchPage() {
  const [templateId, setTemplateId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [generatedPdfs, setGeneratedPdfs] = useState<GeneratedPDF[]>([])
  const [failedCount, setFailedCount] = useState(0)

  const handleGenerate = async (companies: CompanyData[]) => {
    if (!templateId) {
      toast.error("テンプレートを選択してください")
      return
    }

    setIsLoading(true)
    setGeneratedPdfs([])
    setFailedCount(0)

    try {
      const response = await fetch("/api/generate/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId,
          companies,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "一括生成に失敗しました")
      }

      setGeneratedPdfs(result.pdfs)
      setFailedCount(result.failedCount || 0)

      if (result.failedCount > 0) {
        toast.warning(`${result.count}件成功、${result.failedCount}件失敗しました`)
      } else {
        toast.success(`${result.count}件のPDFを生成しました`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = (pdfUrl: string, companyName: string) => {
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = `${companyName}.pdf`
    link.click()
  }

  const handleDownloadAll = () => {
    generatedPdfs.forEach((pdf, index) => {
      setTimeout(() => {
        handleDownload(pdf.pdfUrl, pdf.companyName)
      }, index * 500) // 0.5秒ずつずらしてダウンロード
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">一括生成</h1>
        <p className="text-muted-foreground">
          複数の会社情報を一括でPDF化します
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
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          <BatchForm onSubmit={handleGenerate} isLoading={isLoading} />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>生成結果</CardTitle>
              <CardDescription>
                {generatedPdfs.length > 0
                  ? `${generatedPdfs.length}件のPDFを生成しました${failedCount > 0 ? `（${failedCount}件失敗）` : ""}`
                  : "生成されたPDFがここに表示されます"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedPdfs.length === 0 ? (
                <div className="h-[300px] border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">
                    会社情報を入力して一括生成を実行してください
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={handleDownloadAll}
                    className="w-full"
                    variant="outline"
                  >
                    すべてダウンロード
                  </Button>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {generatedPdfs.map((pdf) => (
                      <div
                        key={pdf.historyId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{pdf.companyName}</p>
                          <p className="text-xs text-muted-foreground">
                            {pdf.pdfUrl}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(pdf.pdfUrl, pdf.companyName)}
                        >
                          ダウンロード
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
