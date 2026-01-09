/**
 * 共通型定義
 */

/**
 * 会社情報データ
 */
export interface CompanyData {
  companyName: string
  address: string
  representativeName: string
  postalCode?: string
}

/**
 * テンプレートデータ
 */
export interface TemplateData extends CompanyData {
  currentDate: string
}

/**
 * 書類生成結果
 */
export interface GenerateResult {
  success: boolean
  contractPdfUrl: string
  contractDocxUrl: string
  invoicePdfUrl: string
  invoiceDocxUrl: string
  postalCode: string
}

/**
 * 履歴データ
 */
export interface HistoryItem {
  id: string
  userId: string
  companyName: string
  address: string
  representativeName: string
  postalCode: string
  contractPdfUrl: string
  contractDocxUrl: string
  invoicePdfUrl: string
  invoiceDocxUrl: string
  createdAt: string // ISO 8601形式
  emailSent?: boolean
  emailSentAt?: string
  emailTo?: string
}

/**
 * 履歴の新規追加用データ（id, createdAtは自動生成）
 */
export type NewHistoryItem = Omit<HistoryItem, "id" | "createdAt">

/**
 * 履歴の更新用データ
 */
export type HistoryUpdateData = Partial<Pick<HistoryItem, "emailSent" | "emailSentAt" | "emailTo">>

/**
 * 添付ファイル
 */
export interface Attachment {
  filename: string
  url: string
}

/**
 * メール送信リクエスト
 */
export interface SendEmailRequest {
  to: string
  cc?: string
  subject: string
  body: string
  attachments?: Attachment[]
}

/**
 * フォームバリデーションエラー
 */
export type FormErrors<T extends string> = Partial<Record<T, string>>

/**
 * 会社情報フォームのエラー
 */
export type CompanyFormErrors = FormErrors<keyof CompanyData>

/**
 * API レスポンス（成功）
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

/**
 * API レスポンス（エラー）
 */
export interface ApiErrorResponse {
  success?: false
  error: string
}

/**
 * API レスポンス
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse
