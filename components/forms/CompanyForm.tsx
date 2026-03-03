"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface CompanyData {
  companyName: string
  postalCode: string
  address: string
  representativeName: string
}

interface CompanyFormProps {
  onSubmit: (data: CompanyData) => void
  onPreview?: (data: CompanyData) => void
  isLoading?: boolean
  isPreviewing?: boolean
  submitLabel?: string
}

export default function CompanyForm({
  onSubmit,
  onPreview,
  isLoading = false,
  isPreviewing = false,
  submitLabel = "生成",
}: CompanyFormProps) {
  const [companyName, setCompanyName] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [address, setAddress] = useState("")
  const [representativeName, setRepresentativeName] = useState("")
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!companyName.trim()) {
      newErrors.companyName = "会社名は必須です"
    } else if (companyName.length > 100) {
      newErrors.companyName = "会社名は100文字以内で入力してください"
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = "郵便番号は必須です"
    } else if (!/^\d{3}-?\d{4}$/.test(postalCode.trim())) {
      newErrors.postalCode = "郵便番号の形式が正しくありません（例: 540-0031）"
    }

    if (!address.trim()) {
      newErrors.address = "住所は必須です"
    } else if (address.length > 500) {
      newErrors.address = "住所は500文字以内で入力してください"
    }

    if (!representativeName.trim()) {
      newErrors.representativeName = "氏名は必須です"
    } else if (representativeName.length > 100) {
      newErrors.representativeName = "氏名は100文字以内で入力してください"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({
        companyName: companyName.trim(),
        postalCode: postalCode.trim(),
        address: address.trim(),
        representativeName: representativeName.trim(),
      })
    }
  }

  const handlePreview = () => {
    if (validate() && onPreview) {
      onPreview({
        companyName: companyName.trim(),
        postalCode: postalCode.trim(),
        address: address.trim(),
        representativeName: representativeName.trim(),
      })
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>会社情報入力</CardTitle>
        <CardDescription>
          PDFに埋め込む会社情報を入力してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">
              会社名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="例: 株式会社ABC"
              maxLength={100}
              disabled={isLoading || isPreviewing}
            />
            {errors.companyName && (
              <p className="text-sm text-red-500">{errors.companyName}</p>
            )}
            <p className="text-xs text-muted-foreground">{companyName.length}/100文字</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">
              郵便番号 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="postalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="例: 540-0031"
              maxLength={8}
              disabled={isLoading || isPreviewing}
            />
            {errors.postalCode && (
              <p className="text-sm text-red-500">{errors.postalCode}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              住所 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例: 東京都渋谷区○○1-2-3"
              maxLength={500}
              disabled={isLoading || isPreviewing}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address}</p>
            )}
            <p className="text-xs text-muted-foreground">{address.length}/500文字</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="representativeName">
              氏名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="representativeName"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="例: 山田太郎"
              maxLength={100}
              disabled={isLoading || isPreviewing}
            />
            {errors.representativeName && (
              <p className="text-sm text-red-500">{errors.representativeName}</p>
            )}
            <p className="text-xs text-muted-foreground">{representativeName.length}/100文字</p>
          </div>

          <div className="flex gap-2 pt-4">
            {onPreview && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={isLoading || isPreviewing}
              >
                {isPreviewing ? "プレビュー中..." : "プレビュー"}
              </Button>
            )}
            <Button type="submit" disabled={isLoading || isPreviewing}>
              {isLoading ? "生成中..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
