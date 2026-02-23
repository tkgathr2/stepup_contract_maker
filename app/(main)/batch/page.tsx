"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import BatchForm, { CompanyData } from "@/components/forms/BatchForm"
import { toast } from "sonner"

interface Template {
  id: string
  name: string
  type: string
}

interface GeneratedPDF {
  pdfUrl: string
  companyName: string
  templateName: string
  templateType: string
  historyId: string
}

export default function BatchPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set())
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const submittingRef = useRef(false)
  const [generatedPdfs, setGeneratedPdfs] = useState<GeneratedPDF[]>([])
  const [failedCount, setFailedCount] = useState(0)

  // テンプレート一覧を取得し、全てデフォルトでONにする
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/templates")
        if (response.ok) {
          const data = await response.json()
          const tpls: Template[] = data.templates
          setTemplates(tpls)
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

  const handleGenerate = async (companies: CompanyData[]) => {
    if (selectedTemplateIds.size === 0) {
      toast.error("テンプレートを1つ以上選択してください")
      return
    }

    if (submittingRef.current) return
    submittingRef.current = true

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
          templateIds: Array.from(selectedTemplateIds),
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
      submittingRef.current = false
    }
  }

  const handleDownload = (pdf: GeneratedPDF) => {
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
    const fileName = `${dateStr}_${pdf.companyName}_${pdf.templateName}.pdf`
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

  const handleDownloadWord = (pdf: GeneratedPDF) => {
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
    const fileName = `${dateStr}_${pdf.companyName}_${pdf.templateName}.docx`
    const docxUrl = pdf.pdfUrl.replace("/api/pdf/", "/api/docx/")
    fetch(docxUrl, { credentials: "include" })
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
      .catch(() => toast.error("Wordファイルのダウンロードに失敗しました"))
  }

  const handleDownloadAll = () => {
    generatedPdfs.forEach((pdf, index) => {
      setTimeout(() => {
        handleDownload(pdf)
      }, index * 500)
    })
  }

  const handleDownloadAllWord = () => {
    generatedPdfs.forEach((pdf, index) => {
      setTimeout(() => {
        handleDownloadWord(pdf)
      }, index * 500)
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
                        id={`batch-template-${template.id}`}
                        checked={selectedTemplateIds.has(template.id)}
                        onCheckedChange={() => toggleTemplate(template.id)}
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor={`batch-template-${template.id}`}
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
                  >
                    すべてPDFでダウンロード（{generatedPdfs.length}件）
                  </Button>
                  <Button
                    onClick={handleDownloadAllWord}
                    className="w-full"
                    variant="outline"
                  >
                    すべてWordでダウンロード（{generatedPdfs.length}件）
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
                            {pdf.templateName}（{getTypeLabel(pdf.templateType)}）
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleDownload(pdf)}
                          >
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadWord(pdf)}
                          >
                            Word
                          </Button>
                        </div>
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
