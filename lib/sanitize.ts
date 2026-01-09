/**
 * 入力値のサニタイズとバリデーション用ユーティリティ
 */

/**
 * 入力値をトリムしてサニタイズ
 * @param input 入力文字列
 * @param maxLength 最大文字数
 * @returns サニタイズされた文字列
 * @throws 入力が空の場合
 */
export function sanitizeInput(input: string, maxLength: number): string {
  if (typeof input !== "string") {
    throw new Error("入力値は文字列である必要があります")
  }

  const trimmed = input.trim()

  if (trimmed.length === 0) {
    throw new Error("入力値が空です")
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${maxLength}文字以内で入力してください`)
  }

  return trimmed
}

/**
 * 入力値のバリデーション結果
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
  value?: string
}

/**
 * 会社情報のバリデーション
 */
export function validateCompanyData(data: {
  companyName?: string
  address?: string
  representativeName?: string
}): ValidationResult {
  try {
    if (!data.companyName) {
      return { isValid: false, error: "会社名は必須です" }
    }
    const companyName = sanitizeInput(data.companyName, 100)

    if (!data.address) {
      return { isValid: false, error: "住所は必須です" }
    }
    const address = sanitizeInput(data.address, 500)

    if (!data.representativeName) {
      return { isValid: false, error: "代表者名は必須です" }
    }
    const representativeName = sanitizeInput(data.representativeName, 100)

    return {
      isValid: true,
      value: JSON.stringify({ companyName, address, representativeName }),
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "バリデーションエラー",
    }
  }
}

/**
 * メールアドレスのバリデーション（RFC 5322準拠）
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "メールアドレスは必須です" }
  }

  const trimmed = email.trim()

  if (trimmed.length === 0) {
    return { isValid: false, error: "メールアドレスは必須です" }
  }

  if (trimmed.length > 254) {
    return { isValid: false, error: "メールアドレスが長すぎます" }
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "メールアドレスの形式が正しくありません" }
  }

  return { isValid: true, value: trimmed }
}

/**
 * ファイル名のバリデーション
 */
export function validateFilename(filename: string): ValidationResult {
  if (!filename || typeof filename !== "string") {
    return { isValid: false, error: "ファイル名は必須です" }
  }

  // パストラバーサル攻撃の検出
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("\0")
  ) {
    return { isValid: false, error: "無効なファイル名です" }
  }

  // 長さチェック
  if (filename.length > 255) {
    return { isValid: false, error: "ファイル名が長すぎます" }
  }

  // 許可する拡張子
  const allowedExtensions = [".pdf", ".docx"]
  const hasValidExtension = allowedExtensions.some(ext =>
    filename.toLowerCase().endsWith(ext)
  )

  if (!hasValidExtension) {
    return { isValid: false, error: "許可されていないファイル形式です" }
  }

  return { isValid: true, value: filename }
}

/**
 * 添付ファイルURLのバリデーション
 */
export function validateAttachmentUrl(url: string): ValidationResult {
  if (!url || typeof url !== "string") {
    return { isValid: false, error: "URLは必須です" }
  }

  // 許可するURLパターン
  if (!url.startsWith("/api/files/")) {
    return { isValid: false, error: "無効な添付ファイルURLです" }
  }

  // URLからファイル名を抽出して検証
  const filename = url.replace("/api/files/", "")
  return validateFilename(filename)
}
