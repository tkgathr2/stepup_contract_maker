"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import CompanyForm, { CompanyData } from "@/components/forms/CompanyForm"
import { toast } from "sonner"

interface Template {
  id: string
  name: string
  type: string
}

interface GeneratedPdf {
  templateName: string
  templateType: string
  pdfUrl: string
  blobUrl: string | null
  historyId: string
}

export default function GeneratePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set())
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const submittingRef = useRef(false)
  const [generatedPdfs, setGeneratedPdfs] = useState<GeneratedPdf[]>([])
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)

  // テンプレート一覧を取得し、全てデフォルトでONにする
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/templates")
        if (response.ok) {
          const data = await response.json()
          const tpls: Template[] = data.templates
          setTemplates(tpls)
          // デフォルトで全テンプレートを選択
          setSelectedTemplateIds(new Set(tpls.map((t) => t.id)))
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error)
      } finally {
        setLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [])

  const getTypeLabel = (type: string) => {
    return type === "contract" ? "契約書" : "送り状"
  }

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }

  const handleGenerate = async (data: CompanyData) => {
    if (selectedTemplateIds.size === 0) {
      toast.error("テンプレートを1つ以上選択してください")
      return
    }
    if (submittingRef.current) return
    submittingRef.current = true

    setIsLoading(true)
    // 古いblob URLを解放
    for (const pdf of generatedPdfs) {
      if (pdf.blobUrl) URL.revokeObjectURL(pdf.blobUrl)
    }
    setGeneratedPdfs([])
    setPreviewPdf(null)

    const results: GeneratedPdf[] = []

    try {
      for (const templateId of selectedTemplateIds) {
        const template = templates.find((t) => t.id === templateId)
        if (!template) continue

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, templateId }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast.error(`${template.name}の生成に失敗: ${result.message || "エラー"}`)
          continue
        }

        // PDFをfetchしてBlob URLを作成（認証cookie付き）
        let blobUrl: string | null = null
        try {
          const pdfRes = await fetch(result.pdfUrl, { credentials: "include" })
          if (pdfRes.ok) {
            const blob = await pdfRes.blob()
            blobUrl = URL.createObjectURL(blob)
          }
        } catch {
          // blob作成失敗は無視（ダウンロード時にフォールバック）
        }

        results.push({
          templateName: template.name,
          templateType: template.type,
          pdfUrl: result.pdfUrl,
          blobUrl,
          historyId: result.historyId,
        })
      }

      setGeneratedPdfs(results)

      if (results.length > 0) {
        toast.success(`${results.length}件のPDFを生成しました`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
      submittingRef.current = false
    }
  }

  const handlePreview = async (data: CompanyData) => {
    // プレビューは最初に選択されたテンプレートで1つだけ生成
    const firstId = Array.from(selectedTemplateIds)[0]
    if (!firstId) {
      toast.error("テンプレートを1つ以上選択してください")
      return
    }

    if (submittingRef.current) return
    submittingRef.current = true

    setIsPreviewing(true)
    setPreviewPdf(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, templateId: firstId, preview: true }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "プレビュー生成に失敗しました")
      }

      setPreviewPdf(result.pdfBase64)
      toast.success("プレビューを生成しました")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsPreviewing(false)
      submittingRef.current = false
    }
  }

  const handleDownloadOne = (pdf: GeneratedPdf) => {
    const fileName = `${pdf.templateName}.pdf`
    if (pdf.blobUrl) {
      const link = document.createElement("a")
      link.href = pdf.blobUrl
      link.download = fileName
      link.click()
    } else {
      fetch(pdf.pdfUrl, { credentials: "include" })
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
  }

  const handleDownloadAll = () => {
    for (const pdf of generatedPdfs) {
      handleDownloadOne(pdf)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">PDF生成</h1>
        <p className="text-muted-foreground">
          会社情報を入力してPDFを生成します
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>テンプレート選択</CardTitle>
              <CardDescription>
                生成するテンプレートを選択してください（複数選択可）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  テンプレートがありません。テンプレート管理ページからアップロードしてください。
                </p>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`template-${template.id}`}
                        checked={selectedTemplateIds.has(template.id)}
                        onCheckedChange={() => toggleTemplate(template.id)}
                        disabled={isLoading || isPreviewing}
                      />
                      <Label
                        htmlFor={`template-${template.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {template.name}（{getTypeLabel(template.type)}）
                      </Label>
                    </div>
                  ))}
                </div>
              )}
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
          {generatedPdfs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>生成完了</CardTitle>
                <CardDescription>
                  {generatedPdfs.length}件のPDFが正常に生成されました
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedPdfs.length > 1 && (
                  <Button onClick={handleDownloadAll} className="w-full">
                    すべてダウンロード（{generatedPdfs.length}件）
                  </Button>
                )}
                {generatedPdfs.map((pdf, index) => (
                  <div key={pdf.historyId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {pdf.templateName}（{getTypeLabel(pdf.templateType)}）
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadOne(pdf)}
                      >
                        ダウンロード
                      </Button>
                    </div>
                    {pdf.blobUrl && (
                      <div className="border rounded-lg overflow-hidden">
                        <iframe
                          src={pdf.blobUrl}
                          className="w-full h-[400px]"
                          title={`Generated PDF ${index + 1}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {previewPdf && generatedPdfs.length === 0 && (
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

          {generatedPdfs.length === 0 && !previewPdf && (
            <Card>
              <CardHeader>
                <CardTitle>プレビュー・生成結果</CardTitle>
                <CardDescription>
                  プレビューまたは生成結果がここに表示されます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">
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
