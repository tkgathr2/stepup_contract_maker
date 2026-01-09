// 共通型定義からインポート
import type { HistoryItem, NewHistoryItem, HistoryUpdateData } from "@/types"

// 型を再エクスポート
export type { HistoryItem, NewHistoryItem, HistoryUpdateData }

const STORAGE_KEY_PREFIX = "stepup_history_"

/**
 * 履歴アイテムのランタイムバリデーション
 */
function isValidHistoryItem(item: unknown): item is HistoryItem {
  if (!item || typeof item !== "object") return false
  const obj = item as Record<string, unknown>

  return (
    typeof obj.id === "string" &&
    typeof obj.userId === "string" &&
    typeof obj.companyName === "string" &&
    typeof obj.address === "string" &&
    typeof obj.representativeName === "string" &&
    typeof obj.postalCode === "string" &&
    typeof obj.contractPdfUrl === "string" &&
    typeof obj.contractDocxUrl === "string" &&
    typeof obj.invoicePdfUrl === "string" &&
    typeof obj.invoiceDocxUrl === "string" &&
    typeof obj.createdAt === "string" &&
    (obj.emailSent === undefined || typeof obj.emailSent === "boolean") &&
    (obj.emailSentAt === undefined || typeof obj.emailSentAt === "string") &&
    (obj.emailTo === undefined || typeof obj.emailTo === "string")
  )
}

/**
 * 履歴配列のバリデーション
 */
function validateHistoryArray(data: unknown): HistoryItem[] {
  if (!Array.isArray(data)) return []
  return data.filter(isValidHistoryItem)
}

// ユーザーごとのストレージキーを生成
const getStorageKey = (userId: string): string => {
  return `${STORAGE_KEY_PREFIX}${userId}`
}

// 履歴一覧を取得
export const getHistory = (userId: string): HistoryItem[] => {
  if (typeof window === "undefined") return []

  try {
    const key = getStorageKey(userId)
    const data = localStorage.getItem(key)
    if (!data) return []

    // ランタイムバリデーションを実行
    const parsed = JSON.parse(data)
    const items = validateHistoryArray(parsed)

    // 日付順（新しい順）でソート
    return items.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch (error) {
    console.error("Failed to get history:", error)
    return []
  }
}

// 履歴を追加
export const addHistory = (item: Omit<HistoryItem, "id" | "createdAt">): HistoryItem => {
  if (typeof window === "undefined") {
    throw new Error("localStorage is not available on server side")
  }

  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  try {
    const key = getStorageKey(item.userId)
    const existing = getHistory(item.userId)
    existing.unshift(newItem)
    localStorage.setItem(key, JSON.stringify(existing))
    return newItem
  } catch (error) {
    console.error("Failed to add history:", error)
    throw error
  }
}

// 履歴を削除
export const deleteHistory = (userId: string, historyId: string): boolean => {
  if (typeof window === "undefined") return false

  try {
    const key = getStorageKey(userId)
    const existing = getHistory(userId)
    const filtered = existing.filter((item) => item.id !== historyId)
    localStorage.setItem(key, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error("Failed to delete history:", error)
    return false
  }
}

// 履歴を検索
export const searchHistory = (
  userId: string,
  query: string
): HistoryItem[] => {
  const items = getHistory(userId)
  if (!query.trim()) return items

  const lowerQuery = query.toLowerCase()
  return items.filter((item) =>
    item.companyName.toLowerCase().includes(lowerQuery) ||
    item.representativeName.toLowerCase().includes(lowerQuery) ||
    item.address.toLowerCase().includes(lowerQuery)
  )
}

// 最近の履歴を取得（指定件数）
export const getRecentHistory = (userId: string, limit: number = 3): HistoryItem[] => {
  const items = getHistory(userId)
  return items.slice(0, limit)
}

// 履歴をすべて削除（ユーザー単位）
export const clearHistory = (userId: string): boolean => {
  if (typeof window === "undefined") return false

  try {
    const key = getStorageKey(userId)
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error("Failed to clear history:", error)
    return false
  }
}

// 履歴を更新（メール送信フラグなど）
export const updateHistory = (
  userId: string,
  historyId: string,
  updates: Partial<Pick<HistoryItem, "emailSent" | "emailSentAt" | "emailTo">>
): boolean => {
  if (typeof window === "undefined") return false

  try {
    const key = getStorageKey(userId)
    const existing = getHistory(userId)
    const index = existing.findIndex((item) => item.id === historyId)

    if (index === -1) return false

    existing[index] = { ...existing[index], ...updates }
    localStorage.setItem(key, JSON.stringify(existing))
    return true
  } catch (error) {
    console.error("Failed to update history:", error)
    return false
  }
}
