/**
 * 日付フォーマット用ユーティリティ
 */

/**
 * 日付を日本語形式でフォーマット
 * @param dateStr ISO 8601形式の日付文字列
 * @returns フォーマットされた日付文字列（例: 2026年1月9日 14:30）
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return dateStr // 無効な日付の場合は元の文字列を返す
    }

    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/**
 * 日付を短い形式でフォーマット
 * @param dateStr ISO 8601形式の日付文字列
 * @returns フォーマットされた日付文字列（例: 2026/01/09）
 */
export function formatDateShort(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return dateStr
    }

    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/**
 * 日付を令和形式でフォーマット
 * @param date Dateオブジェクト
 * @returns 令和形式の日付文字列（例: 令和8年1月9日）
 */
export function toReiwaDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  // 令和の開始：2019年5月1日
  let reiwaYear = year - 2018
  if (year === 2019 && month < 5) {
    // 2019年1-4月は平成31年（ここでは令和1年として扱う）
    reiwaYear = 1
  }

  return `令和${reiwaYear}年${month}月${day}日`
}

/**
 * 現在の日付を令和形式で取得
 * @returns 令和形式の現在日付（例: 令和8年1月9日）
 */
export function getCurrentReiwaDate(): string {
  return toReiwaDate(new Date())
}

/**
 * 相対的な日付を表示（例: 1時間前、3日前）
 * @param dateStr ISO 8601形式の日付文字列
 * @returns 相対的な日付文字列
 */
export function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return dateStr
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) {
      return "たった今"
    } else if (diffMin < 60) {
      return `${diffMin}分前`
    } else if (diffHour < 24) {
      return `${diffHour}時間前`
    } else if (diffDay < 7) {
      return `${diffDay}日前`
    } else {
      return formatDateShort(dateStr)
    }
  } catch {
    return dateStr
  }
}
