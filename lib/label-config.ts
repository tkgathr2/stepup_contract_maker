/**
 * ラベル印刷設定 — A-one 31275 (83.8mm × 42.3mm, 2列×6段, A4)
 * 
 * 物理位置精度・再現性を最優先とする設計。
 * 全寸法はmm単位。px/transform/scale/zoom は禁止。
 */

// ─── 型定義 ───

export interface LabelBlock {
  id: string
  text: string
  fontSize: number      // mm単位
  minFontSize: number   // mm単位
  maxLines: number
  bold: boolean
  align: "left" | "center" | "right"
}

export interface LabelTemplate {
  blocks: LabelBlock[]
}

export interface SheetAdjustment {
  topOffset: number    // mm
  leftOffset: number   // mm
  hGapOffset: number   // mm
  vGapOffset: number   // mm
}

export interface PrintSession {
  startIndex: number   // 1〜12 (legacy)
  selectedPositions: number[]  // 1〜12 の選択された位置
}

// ─── A-one 31275 用紙定数 ───

export const SHEET = {
  width: 210,      // A4 幅 mm
  height: 297,     // A4 高さ mm
} as const

export const LABEL = {
  width: 83.8,     // ラベル幅 mm
  height: 42.3,    // ラベル高さ mm
  cols: 2,
  rows: 6,
  total: 12,
} as const

// デフォルトマージン/ギャップ（A-one 31275 標準値）
export const DEFAULT_LAYOUT = {
  topMargin: 8.85,     // 上余白 mm
  leftMargin: 21.17,   // 左余白 mm
  hPitch: 86.36,       // 横ピッチ（ラベル左端〜次のラベル左端）mm
  vPitch: 46.56,       // 縦ピッチ（ラベル上端〜次のラベル上端）mm
} as const

// ギャップ = ピッチ - ラベルサイズ
export const DEFAULT_GAP = {
  horizontal: DEFAULT_LAYOUT.hPitch - LABEL.width,   // 2.56mm
  vertical: DEFAULT_LAYOUT.vPitch - LABEL.height,     // 4.26mm
} as const

// ─── デフォルト補正値 ───

export const DEFAULT_ADJUSTMENT: SheetAdjustment = {
  topOffset: 0,
  leftOffset: 0,
  hGapOffset: 0,
  vGapOffset: 0,
}

// ─── デフォルトラベルテンプレート（宛名ラベル） ───

export const DEFAULT_LABEL_TEMPLATE: LabelTemplate = {
  blocks: [
    {
      id: "postalCode",
      text: "",
      fontSize: 3.2,
      minFontSize: 2.5,
      maxLines: 1,
      bold: false,
      align: "left",
    },
    {
      id: "address",
      text: "",
      fontSize: 3.0,
      minFontSize: 2.2,
      maxLines: 3,
      bold: false,
      align: "left",
    },
    {
      id: "companyName",
      text: "",
      fontSize: 3.5,
      minFontSize: 2.5,
      maxLines: 2,
      bold: true,
      align: "left",
    },
    {
      id: "representativeName",
      text: "",
      fontSize: 3.2,
      minFontSize: 2.5,
      maxLines: 1,
      bold: false,
      align: "left",
    },
  ],
}

// ─── グリッド位置計算 ───

export function getLabelPosition(
  index: number, // 0-based
  adjustment: SheetAdjustment = DEFAULT_ADJUSTMENT
): { top: number; left: number } {
  const row = Math.floor(index / LABEL.cols)
  const col = index % LABEL.cols

  const effectiveTopMargin = DEFAULT_LAYOUT.topMargin + adjustment.topOffset
  const effectiveLeftMargin = DEFAULT_LAYOUT.leftMargin + adjustment.leftOffset
  const effectiveHPitch = DEFAULT_LAYOUT.hPitch + adjustment.hGapOffset
  const effectiveVPitch = DEFAULT_LAYOUT.vPitch + adjustment.vGapOffset

  return {
    top: effectiveTopMargin + row * effectiveVPitch,
    left: effectiveLeftMargin + col * effectiveHPitch,
  }
}

// ─── はみ出し検証 ───

export function validateLayout(adjustment: SheetAdjustment): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 最終ラベル（右下）の位置を検証
  const lastPos = getLabelPosition(LABEL.total - 1, adjustment)

  // 右端チェック
  const rightEdge = lastPos.left + LABEL.width
  if (rightEdge > SHEET.width) {
    errors.push(`右端はみ出し: ${rightEdge.toFixed(1)}mm > ${SHEET.width}mm`)
  }

  // 下端チェック
  const bottomEdge = lastPos.top + LABEL.height
  if (bottomEdge > SHEET.height) {
    errors.push(`下端はみ出し: ${bottomEdge.toFixed(1)}mm > ${SHEET.height}mm`)
  }

  // 左端チェック（補正でマイナスになった場合）
  const firstPos = getLabelPosition(0, adjustment)
  if (firstPos.left < 0) {
    errors.push(`左端はみ出し: ${firstPos.left.toFixed(1)}mm < 0mm`)
  }
  if (firstPos.top < 0) {
    errors.push(`上端はみ出し: ${firstPos.top.toFixed(1)}mm < 0mm`)
  }

  return { valid: errors.length === 0, errors }
}

// ─── localStorage キー ───

export const STORAGE_KEYS = {
  startIndex: "label_startIndex",
  selectedPositions: "label_selectedPositions",
  adjustment: "label_adjustment",
  defaults: "label_defaults",
  contractOverride: (contractId: string) => `label_override_${contractId}`,
} as const

// ─── localStorage 操作 ───

export function loadAdjustment(): SheetAdjustment {
  if (typeof window === "undefined") return DEFAULT_ADJUSTMENT
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.adjustment)
    if (!raw) return DEFAULT_ADJUSTMENT
    const parsed = JSON.parse(raw) as SheetAdjustment
    // 値範囲チェック（±10mm以内）
    for (const key of ["topOffset", "leftOffset", "hGapOffset", "vGapOffset"] as const) {
      if (typeof parsed[key] !== "number" || parsed[key] < -10 || parsed[key] > 10) {
        return DEFAULT_ADJUSTMENT
      }
    }
    return parsed
  } catch {
    return DEFAULT_ADJUSTMENT
  }
}

export function saveAdjustment(adj: SheetAdjustment): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.adjustment, JSON.stringify(adj))
}

export function loadStartIndex(): number {
  if (typeof window === "undefined") return 1
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.startIndex)
    if (!raw) return 1
    const val = parseInt(raw, 10)
    if (val < 1 || val > LABEL.total) return 1
    return val
  } catch {
    return 1
  }
}

export function saveStartIndex(index: number): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.startIndex, String(index))
}

// ─── 選択位置（複数） localStorage 操作 ───

export function loadSelectedPositions(): number[] {
  if (typeof window === "undefined") return [1]
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.selectedPositions)
    if (!raw) return [1]
    const parsed = JSON.parse(raw) as number[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [1]
    const valid = parsed.filter((n) => typeof n === "number" && n >= 1 && n <= LABEL.total)
    return valid.length > 0 ? valid : [1]
  } catch {
    return [1]
  }
}

export function saveSelectedPositions(positions: number[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.selectedPositions, JSON.stringify(positions))
}
