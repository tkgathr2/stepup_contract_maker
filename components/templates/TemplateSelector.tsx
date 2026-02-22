"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Template {
  id: string
  name: string
  type: string
}

interface TemplateSelectorProps {
  value: string
  onChange: (templateId: string) => void
  disabled?: boolean
  filterType?: "contract" | "invoice"
}

export default function TemplateSelector({
  value,
  onChange,
  disabled = false,
  filterType,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const url = filterType
          ? `/api/templates?type=${filterType}`
          : "/api/templates"
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates)
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [filterType])

  const getTypeLabel = (type: string) => {
    return type === "contract" ? "契約書" : "送り状"
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="template">
        テンプレート <span className="text-red-500">*</span>
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "読み込み中..." : "テンプレートを選択"} />
        </SelectTrigger>
        <SelectContent>
          {templates.length === 0 ? (
            <SelectItem value="none" disabled>
              テンプレートがありません
            </SelectItem>
          ) : (
            templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}（{getTypeLabel(template.type)}）
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {templates.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          テンプレートがありません。テンプレート管理ページからアップロードしてください。
        </p>
      )}
    </div>
  )
}
