"use client"

import { useState, useEffect, useCallback } from "react"
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

interface TemplateVersion {
  id: string
  version: number
  name: string
  editedById: string
  editedBy: string
  comment: string | null
  createdAt: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // ファイル差替えダイアログ
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)
  const [replaceComment, setReplaceComment] = useState("")
  const [replacing, setReplacing] = useState(false)

  // バージョン履歴ダイアログ
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [reverting, setReverting] = useState(false)

  // フォーム状態
  const [templateName, setTemplateName] = useState("")
  const [templateType, setTemplateType] = useState<string>("")
  const [templateFile, setTemplateFile] = useState<File | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/templates")
      if (!response.ok) throw new Error("Failed to fetch templates")
      const data = await response.json()
      setTemplates(data.templates)
    } catch {
      toast.error("テンプレートの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

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
        throw new Error(data.message || "アップロードに失敗しました")
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
        throw new Error(data.message || "削除に失敗しました")
      }

      toast.success("テンプレートを削除しました")
      setDeleteDialogOpen(false)
      setSelectedTemplate(null)
      fetchTemplates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました")
    }
  }

  // ファイル差替え
  const handleReplace = async () => {
    if (!selectedTemplate || !replaceFile) return

    setReplacing(true)
    try {
      const formData = new FormData()
      formData.append("file", replaceFile)
      if (replaceComment) {
        formData.append("comment", replaceComment)
      }

      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: "PUT",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "差替えに失敗しました")
      }

      toast.success("テンプレートを差替えました（旧バージョンは履歴に保存済み）")
      setReplaceDialogOpen(false)
      setReplaceFile(null)
      setReplaceComment("")
      setSelectedTemplate(null)
      fetchTemplates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "差替えに失敗しました")
    } finally {
      setReplacing(false)
    }
  }

  // バージョン履歴取得
  const fetchVersions = async (templateId: string) => {
    setLoadingVersions(true)
    try {
      const response = await fetch(`/api/templates/${templateId}/versions`)
      if (!response.ok) throw new Error("Failed to fetch versions")
      const data = await response.json()
      setVersions(data.versions)
    } catch {
      toast.error("バージョン履歴の取得に失敗しました")
    } finally {
      setLoadingVersions(false)
    }
  }

  // バージョン戻し
  const handleRevert = async (versionId: string, versionNum: number) => {
    if (!selectedTemplate) return

    setReverting(true)
    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "バージョン戻しに失敗しました")
      }

      toast.success(`v${versionNum} に戻しました`)
      fetchVersions(selectedTemplate.id)
      fetchTemplates()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "バージョン戻しに失敗しました")
    } finally {
      setReverting(false)
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
          <h1 className="text-2xl font-bold text-foreground">テンプレート管理</h1>
          <p className="text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground">
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
            <p className="text-center py-4 text-muted-foreground">読み込み中...</p>
          ) : templates.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              テンプレートがありません。「テンプレートを追加」ボタンからアップロードしてください。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>テンプレート名</TableHead>
                  <TableHead>タイプ</TableHead>
                  <TableHead>更新日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{getTypeLabel(template.type)}</TableCell>
                    <TableCell>{formatDate(template.updatedAt)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template)
                          setReplaceDialogOpen(true)
                        }}
                      >
                        差替え
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template)
                          fetchVersions(template.id)
                          setHistoryDialogOpen(true)
                        }}
                      >
                        履歴
                      </Button>
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

      {/* ファイル差替えダイアログ */}
      <Dialog open={replaceDialogOpen} onOpenChange={(open) => {
        setReplaceDialogOpen(open)
        if (!open) {
          setReplaceFile(null)
          setReplaceComment("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートファイル差替え</DialogTitle>
            <DialogDescription>
              「{selectedTemplate?.name}」のファイルを新しい.docxファイルに差替えます。現在のファイルはバージョン履歴に自動保存されます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="replace-file">新しいファイル</Label>
              <Input
                id="replace-file"
                type="file"
                accept=".docx"
                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                .docx形式、10MB以下
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-comment">変更コメント（任意）</Label>
              <Input
                id="replace-comment"
                value={replaceComment}
                onChange={(e) => setReplaceComment(e.target.value)}
                placeholder="例: レイアウト修正版"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleReplace} disabled={!replaceFile || replacing}>
              {replacing ? "差替え中..." : "差替え"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* バージョン履歴ダイアログ */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>バージョン履歴</DialogTitle>
            <DialogDescription>
              「{selectedTemplate?.name}」の変更履歴
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingVersions ? (
              <p className="text-center py-4 text-muted-foreground">読み込み中...</p>
            ) : versions.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                バージョン履歴はまだありません。ファイルを差替えると履歴が作成されます。
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ver.</TableHead>
                      <TableHead>編集者</TableHead>
                      <TableHead>コメント</TableHead>
                      <TableHead>日時</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((version) => (
                      <TableRow key={version.id}>
                        <TableCell className="font-mono">v{version.version}</TableCell>
                        <TableCell>{version.editedBy}</TableCell>
                        <TableCell className="max-w-48 truncate text-muted-foreground">
                          {version.comment || "-"}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(version.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={reverting}
                            onClick={() => handleRevert(version.id, version.version)}
                          >
                            {reverting ? "処理中..." : "戻す"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              閉じる
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
              <code className="bg-muted px-2 py-1 rounded text-sm">{"{companyName}"}</code>
              <span>会社名</span>
            </div>
            <div className="flex gap-4">
              <code className="bg-muted px-2 py-1 rounded text-sm">{"{address}"}</code>
              <span>住所</span>
            </div>
            <div className="flex gap-4">
              <code className="bg-muted px-2 py-1 rounded text-sm">{"{representativeName}"}</code>
              <span>代表者名</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
