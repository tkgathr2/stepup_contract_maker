"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface Template {
  id: string
  name: string
  type: string
  filePath: string
  createdAt: string
  updatedAt: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // フォーム状態
  const [templateName, setTemplateName] = useState("")
  const [templateType, setTemplateType] = useState<string>("")
  const [templateFile, setTemplateFile] = useState<File | null>(null)

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates")
      if (!response.ok) throw new Error("Failed to fetch templates")
      const data = await response.json()
      setTemplates(data.templates)
    } catch (error) {
      toast.error("テンプレートの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateFile || !templateName || !templateType) {
      toast.error("すべての項目を入力してください")
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", templateFile)
      formData.append("name", templateName)
      formData.append("type", templateType)

      const response = await fetch("/api/templates", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Upload failed")
      }

      toast.success("テンプレートをアップロードしました")
      setDialogOpen(false)
      setTemplateName("")
      setTemplateType("")
      setTemplateFile(null)
      fetchTemplates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "アップロードに失敗しました")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return

    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Delete failed")
      }

      toast.success("テンプレートを削除しました")
      setDeleteDialogOpen(false)
      setSelectedTemplate(null)
      fetchTemplates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP")
  }

  const getTypeLabel = (type: string) => {
    return type === "contract" ? "契約書" : "送り状"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">テンプレート管理</h1>
          <p className="text-gray-500">
            Wordテンプレートをアップロード・管理します
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>テンプレートを追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>テンプレートをアップロード</DialogTitle>
              <DialogDescription>
                Word形式（.docx）のテンプレートファイルをアップロードしてください。
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">テンプレート名</Label>
                  <Input
                    id="name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="例: 標準契約書"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">タイプ</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger>
                      <SelectValue placeholder="タイプを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract">契約書</SelectItem>
                      <SelectItem value="invoice">送り状</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">ファイル</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".docx"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    .docx形式、10MB以下
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "アップロード中..." : "アップロード"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>テンプレート一覧</CardTitle>
          <CardDescription>
            登録済みのテンプレート
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4 text-gray-500">読み込み中...</p>
          ) : templates.length === 0 ? (
            <p className="text-center py-4 text-gray-500">
              テンプレートがありません。「テンプレートを追加」ボタンからアップロードしてください。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>テンプレート名</TableHead>
                  <TableHead>タイプ</TableHead>
                  <TableHead>作成日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{getTypeLabel(template.type)}</TableCell>
                    <TableCell>{formatDate(template.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        削除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートを削除</DialogTitle>
            <DialogDescription>
              「{selectedTemplate?.name}」を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>プレースホルダーについて</CardTitle>
          <CardDescription>
            テンプレート内で使用できるプレースホルダー
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex gap-4">
              <code className="bg-gray-100 px-2 py-1 rounded">{"{companyName}"}</code>
              <span>会社名</span>
            </div>
            <div className="flex gap-4">
              <code className="bg-gray-100 px-2 py-1 rounded">{"{address}"}</code>
              <span>住所</span>
            </div>
            <div className="flex gap-4">
              <code className="bg-gray-100 px-2 py-1 rounded">{"{representativeName}"}</code>
              <span>代表者名</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
