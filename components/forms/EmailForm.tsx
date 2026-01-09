"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Mail, Loader2, Paperclip, X } from "lucide-react"
import { validateEmail } from "@/lib/sanitize"

interface Attachment {
  filename: string
  url: string
}

interface EmailFormProps {
  isOpen: boolean
  onClose: () => void
  companyName: string
  attachments: Attachment[]
  onSuccess?: (emailTo: string) => void
}

export function EmailForm({
  isOpen,
  onClose,
  companyName,
  attachments,
  onSuccess,
}: EmailFormProps) {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [ccError, setCcError] = useState("")
  const [subject, setSubject] = useState(`【株式会社ステップアップ】${companyName}様 契約書類のご送付`)
  const [body, setBody] = useState(
    `${companyName}様

お世話になっております。
株式会社ステップアップです。

人材紹介契約書および送付状を添付いたしましたので、
ご確認のほどよろしくお願いいたします。

ご不明な点がございましたら、お気軽にお問い合わせください。

---
株式会社ステップアップ
`
  )
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>(attachments)

  // CCのバリデーション
  const validateCc = (value: string): boolean => {
    if (!value.trim()) {
      setCcError("")
      return true
    }
    const result = validateEmail(value)
    if (!result.isValid) {
      setCcError(result.error || "CCメールアドレスの形式が正しくありません")
      return false
    }
    setCcError("")
    return true
  }

  const handleCcChange = (value: string) => {
    setCc(value)
    if (value.trim()) {
      validateCc(value)
    } else {
      setCcError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!to) {
      toast.error("送信先メールアドレスを入力してください")
      return
    }

    // CC のバリデーション
    if (cc.trim() && !validateCc(cc)) {
      toast.error("CCメールアドレスの形式を確認してください")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          cc: cc.trim() || undefined,
          subject,
          body,
          attachments: selectedAttachments,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "メール送信に失敗しました")
      }

      toast.success("メールを送信しました")
      onSuccess?.(to)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  const removeAttachment = (index: number) => {
    setSelectedAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <Mail className="w-5 h-5 text-pink-500" />
            メール送信
          </DialogTitle>
          <DialogDescription>
            {companyName}様に契約書類をメールで送信します
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="to" className="text-gray-700">
              送信先メールアドレス <span className="text-red-500">*</span>
            </Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="example@company.co.jp"
              disabled={isLoading}
              className="border-pink-200 focus:border-pink-400 focus:ring-pink-400"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc" className="text-gray-700">
              CC（任意）
            </Label>
            <Input
              id="cc"
              type="email"
              value={cc}
              onChange={(e) => handleCcChange(e.target.value)}
              placeholder="cc@company.co.jp"
              disabled={isLoading}
              className={`border-pink-200 focus:border-pink-400 focus:ring-pink-400 ${ccError ? "border-red-400" : ""}`}
            />
            {ccError && (
              <p className="text-sm text-red-500">{ccError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-gray-700">
              件名
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
              className="border-pink-200 focus:border-pink-400 focus:ring-pink-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-gray-700">
              本文
            </Label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isLoading}
              rows={8}
              className="w-full px-3 py-2 border border-pink-200 rounded-md focus:border-pink-400 focus:ring-pink-400 focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              添付ファイル
            </Label>
            <div className="space-y-2">
              {selectedAttachments.length === 0 ? (
                <p className="text-sm text-gray-400">添付ファイルはありません</p>
              ) : (
                selectedAttachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-pink-50 rounded-md border border-pink-100"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {attachment.filename}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="text-gray-400 hover:text-red-500 p-1 h-auto"
                      disabled={isLoading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 border-gray-300"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  送信
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
