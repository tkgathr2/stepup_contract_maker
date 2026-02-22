"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface CompanyData {
  companyName: string
  address: string
  representativeName: string
}

interface BatchFormProps {
  onSubmit: (companies: CompanyData[]) => void
  isLoading?: boolean
}

interface CompanyEntry extends CompanyData {
  id: string
  errors: { [key: string]: string }
}

export default function BatchForm({ onSubmit, isLoading = false }: BatchFormProps) {
  const [companies, setCompanies] = useState<CompanyEntry[]>([
    { id: crypto.randomUUID(), companyName: "", address: "", representativeName: "", errors: {} },
  ])

  const addCompany = () => {
    setCompanies([
      ...companies,
      { id: crypto.randomUUID(), companyName: "", address: "", representativeName: "", errors: {} },
    ])
  }

  const removeCompany = (id: string) => {
    if (companies.length > 1) {
      setCompanies(companies.filter((c) => c.id !== id))
    }
  }

  const updateCompany = (id: string, field: keyof CompanyData, value: string) => {
    setCompanies(
      companies.map((c) =>
        c.id === id ? { ...c, [field]: value, errors: { ...c.errors, [field]: "" } } : c
      )
    )
  }

  const validateCompany = (company: CompanyEntry): { [key: string]: string } => {
    const errors: { [key: string]: string } = {}

    if (!company.companyName.trim()) {
      errors.companyName = "会社名は必須です"
    } else if (company.companyName.length > 100) {
      errors.companyName = "会社名は100文字以内"
    }

    if (!company.address.trim()) {
      errors.address = "住所は必須です"
    } else if (company.address.length > 500) {
      errors.address = "住所は500文字以内"
    }

    if (!company.representativeName.trim()) {
      errors.representativeName = "代表者名は必須です"
    } else if (company.representativeName.length > 100) {
      errors.representativeName = "代表者名は100文字以内"
    }

    return errors
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // すべての会社を検証
    let hasErrors = false
    const validatedCompanies = companies.map((company) => {
      const errors = validateCompany(company)
      if (Object.keys(errors).length > 0) {
        hasErrors = true
      }
      return { ...company, errors }
    })

    setCompanies(validatedCompanies)

    if (hasErrors) {
      return
    }

    // エラーがなければ送信
    onSubmit(
      companies.map((c) => ({
        companyName: c.companyName.trim(),
        address: c.address.trim(),
        representativeName: c.representativeName.trim(),
      }))
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>一括入力</CardTitle>
        <CardDescription>
          複数の会社情報を入力してください（{companies.length}件）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {companies.map((company, index) => (
            <div
              key={company.id}
              className="border border-border/60 rounded-xl p-4 space-y-4 relative bg-card shadow-sm"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm text-muted-foreground">
                  会社 {index + 1}
                </span>
                {companies.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCompany(company.id)}
                    disabled={isLoading}
                  >
                    削除
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor={`companyName-${company.id}`}>
                    会社名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`companyName-${company.id}`}
                    value={company.companyName}
                    onChange={(e) =>
                      updateCompany(company.id, "companyName", e.target.value)
                    }
                    placeholder="株式会社ABC"
                    maxLength={100}
                    disabled={isLoading}
                  />
                  {company.errors.companyName && (
                    <p className="text-xs text-red-500">{company.errors.companyName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`address-${company.id}`}>
                    住所 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`address-${company.id}`}
                    value={company.address}
                    onChange={(e) =>
                      updateCompany(company.id, "address", e.target.value)
                    }
                    placeholder="東京都渋谷区..."
                    maxLength={500}
                    disabled={isLoading}
                  />
                  {company.errors.address && (
                    <p className="text-xs text-red-500">{company.errors.address}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`representativeName-${company.id}`}>
                    代表者名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`representativeName-${company.id}`}
                    value={company.representativeName}
                    onChange={(e) =>
                      updateCompany(company.id, "representativeName", e.target.value)
                    }
                    placeholder="山田太郎"
                    maxLength={100}
                    disabled={isLoading}
                  />
                  {company.errors.representativeName && (
                    <p className="text-xs text-red-500">
                      {company.errors.representativeName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addCompany} disabled={isLoading}>
              + 会社を追加
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "生成中..." : `一括生成（${companies.length}件）`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
