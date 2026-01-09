/**
 * お知らせ機能
 */

export interface AnnouncementItem {
  id: number
  type: "update" | "feature" | "improvement"
  title: string
  date: string
  message: string
  isNew: boolean
}

/**
 * お知らせデータを取得
 */
export function getAnnouncements(): AnnouncementItem[] {
  return [
    {
      id: 1,
      type: "update",
      title: "バージョン2.0がリリースされました！",
      date: "2025-01-09",
      message: "Googleログイン、生成履歴保存、メール送信機能を追加しました。",
      isNew: true,
    },
    {
      id: 2,
      type: "feature",
      title: "UIデザインをリニューアル",
      date: "2025-01-09",
      message: "パステルカラーを採用した、より使いやすいデザインになりました。",
      isNew: false,
    },
    {
      id: 3,
      type: "improvement",
      title: "iPhone対応を強化",
      date: "2025-01-09",
      message: "スマートフォンでの操作性を大幅に改善しました。",
      isNew: false,
    },
  ]
}

/**
 * お知らせの表示状態を取得
 */
export function getAnnouncementsHidden(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("announcements_hidden") === "true"
}

/**
 * お知らせを非表示に設定
 */
export function setAnnouncementsHidden(hidden: boolean): void {
  if (typeof window === "undefined") return
  localStorage.setItem("announcements_hidden", hidden ? "true" : "false")
}
