"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowLeft, Printer, RotateCcw, AlertTriangle } from "lucide-react"
import Link from "next/link"
import {
  LABEL,
  SHEET,
  DEFAULT_ADJUSTMENT,
  DEFAULT_LABEL_TEMPLATE,
  getLabelPosition,
  validateLayout,
  loadAdjustment,
  saveAdjustment,
  loadSelectedPositions,
  saveSelectedPositions,
  type SheetAdjustment,
  type LabelBlock,
} from "@/lib/label-config"

// ─── 型定義 ───

interface HistoryData {
  id: string
  companyName: string
  postalCode: string
  address: string
  representativeName: string
  templateName: string
  createdAt: string
}

interface PrintCheckState {
  paperA4: boolean
  scale100: boolean
  marginNone: boolean
  headerFooterOff: boolean
}

// ─── テキストはみ出し縮小（forループ、while禁止） ───

function fitFontSize(block: LabelBlock, text: string, labelWidthMm: number): number {
  const maxTries = Math.ceil((block.fontSize - block.minFontSize) / 0.3)
  let currentSize = block.fontSize
  for (let i = 0; i < maxTries; i++) {
    // 1行あたりの推定文字数（mm単位フォントサイズに対して、ラベル幅内パディング考慮）
    const usableWidth = labelWidthMm - 6 // 左右3mmパディング
    const charsPerLine = Math.floor(usableWidth / (currentSize * 0.55))
    const neededLines = Math.ceil(text.length / Math.max(charsPerLine, 1))
    if (neededLines <= block.maxLines) {
      return currentSize
    }
    currentSize -= 0.3
    if (currentSize < block.minFontSize) {
      return block.minFontSize
    }
  }
  return block.minFontSize
}

// ─── メインコンポーネント ───

export default function LabelPrintPage() {
  const params = useParams()
  const router = useRouter()
  const historyId = params.id as string
  const printRootRef = useRef<HTMLDivElement>(null)

  // ① 契約データ（DB由来）
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)

  // ③ シート補正値（mm単位）
  const [adjustment, setAdjustment] = useState<SheetAdjustment>(DEFAULT_ADJUSTMENT)

  // ④ 印刷セッション状態（印刷位置の複数選択）
  const [selectedPositions, setSelectedPositions] = useState<number[]>([1])

  // ⑤ プレビュー拡大率（px換算の倍率）
  const [previewScale, setPreviewScale] = useState(2)

  // 印刷前チェック
  const [showPrintCheck, setShowPrintCheck] = useState(false)
  const [printCheck, setPrintCheck] = useState<PrintCheckState>({
    paperA4: false,
    scale100: false,
    marginNone: false,
    headerFooterOff: false,
  })

  // レイアウト検証
  const [layoutErrors, setLayoutErrors] = useState<string[]>([])

  // ─── データ読み込み ───

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/history/${historyId}`)
      if (!res.ok) throw new Error("履歴取得失敗")
      const data = await res.json()
      setHistoryData(data)
    } catch {
      toast.error("履歴データの取得に失敗しました")
      router.push("/history")
    } finally {
      setLoading(false)
    }
  }, [historyId, router])

  // localStorage復元
  useEffect(() => {
    setAdjustment(loadAdjustment())
    setSelectedPositions(loadSelectedPositions())
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // レイアウト検証
  useEffect(() => {
    const result = validateLayout(adjustment)
    setLayoutErrors(result.errors)
  }, [adjustment])

  // ─── 補正値変更ハンドラ ───

  const handleAdjustmentChange = (key: keyof SheetAdjustment, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    if (num < -10 || num > 10) {
      toast.error("補正値は -10mm 〜 +10mm の範囲で指定してください")
      return
    }
    const newAdj = { ...adjustment, [key]: num }
    setAdjustment(newAdj)
    saveAdjustment(newAdj)
  }

  const handleTogglePosition = (idx: number) => {
    setSelectedPositions((prev) => {
      const isSelected = prev.includes(idx)
      let next: number[]
      if (isSelected) {
        // 最低1つは選択必須
        if (prev.length <= 1) return prev
        next = prev.filter((p) => p !== idx)
      } else {
        next = [...prev, idx].sort((a, b) => a - b)
      }
      saveSelectedPositions(next)
      return next
    })
  }

  const resetAdjustment = () => {
    setAdjustment(DEFAULT_ADJUSTMENT)
    saveAdjustment(DEFAULT_ADJUSTMENT)
    toast.success("補正値をリセットしました")
  }

  // ─── 印刷実行 ───

  const allChecked = printCheck.paperA4 && printCheck.scale100 && printCheck.marginNone && printCheck.headerFooterOff

  const handlePrint = () => {
    // コンソールログ（V1: console、将来DB保存可）
    console.log(JSON.stringify({
      contractId: historyId,
      selectedPositions,
      layoutAdjusted: adjustment.topOffset !== 0 || adjustment.leftOffset !== 0 || adjustment.hGapOffset !== 0 || adjustment.vGapOffset !== 0,
      overflowOccurred: layoutErrors.length > 0,
      timestamp: new Date().toISOString(),
    }))
    window.print()
    setShowPrintCheck(false)
    setPrintCheck({ paperA4: false, scale100: false, marginNone: false, headerFooterOff: false })
  }

  // ─── ラベルデータ生成 ───

  const generateLabels = (): (null | { blocks: { text: string; fontSize: number; bold: boolean; align: string; overflow: boolean }[] })[] => {
    if (!historyData) return Array(LABEL.total).fill(null)

    const labels: (null | { blocks: { text: string; fontSize: number; bold: boolean; align: string; overflow: boolean }[] })[] = Array(LABEL.total).fill(null)

    // 選択された位置のみラベル配置
    for (let i = 0; i < LABEL.total; i++) {
      if (!selectedPositions.includes(i + 1)) continue
      const template = DEFAULT_LABEL_TEMPLATE
      const blocks = template.blocks.map((block) => {
        let text = ""
        switch (block.id) {
          case "postalCode":
            text = historyData.postalCode ? `〒${historyData.postalCode}` : ""
            break
          case "address":
            text = historyData.address
            break
          case "companyName":
            text = historyData.companyName
            break
          case "representativeName":
            text = historyData.representativeName ? `${historyData.representativeName} 様` : ""
            break
        }
        const fittedSize = fitFontSize(block, text, LABEL.width)
        const overflow = fittedSize <= block.minFontSize && text.length > 0
        return {
          text,
          fontSize: fittedSize,
          bold: block.bold,
          align: block.align,
          overflow,
        }
      })
      labels[i] = { blocks }
    }

    return labels
  }

  const labels = generateLabels()

  // ─── ローディング ───

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!historyData) {
    return null
  }

  return (
    <>
      {/* ── 画面UI（印刷時は非表示） ── */}
      <div className="space-y-6 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              履歴に戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ラベル印刷</h1>
            <p className="text-muted-foreground text-sm">
              A-one 31275（83.8mm x 42.3mm / 12面）
            </p>
          </div>
        </div>

        {/* 宛名情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">宛名情報</CardTitle>
            <CardDescription>生成履歴ID: {historyId.slice(0, 8)}...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground w-20 inline-block">会社名:</span> {historyData.companyName}</p>
            {historyData.postalCode && (
              <p><span className="text-muted-foreground w-20 inline-block">郵便番号:</span> 〒{historyData.postalCode}</p>
            )}
            <p><span className="text-muted-foreground w-20 inline-block">住所:</span> {historyData.address}</p>
            <p><span className="text-muted-foreground w-20 inline-block">氏名:</span> {historyData.representativeName}</p>
          </CardContent>
        </Card>

        {/* 印刷位置選択（トグル式） */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">印刷位置選択</CardTitle>
            <CardDescription>ラベルを印刷する位置をクリックで選択（複数可）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 max-w-xs">
              {Array.from({ length: LABEL.total }, (_, i) => i + 1).map((idx) => {
                const isSelected = selectedPositions.includes(idx)
                return (
                  <button
                    key={idx}
                    onClick={() => handleTogglePosition(idx)}
                    className={`
                      relative h-12 rounded-lg border-2 text-sm font-bold transition-all
                      ${isSelected
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "border-border bg-white text-foreground hover:border-primary/50"
                      }
                    `}
                  >
                    <span className="text-lg">{idx}</span>
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
                        &#10003;
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">選択中: {selectedPositions.length}枚</p>
          </CardContent>
        </Card>

        {/* シート補正値 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">シート補正値（mm）</CardTitle>
            <CardDescription>プリンターの個体差を補正。±10mm以内。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="space-y-1">
                <Label className="text-xs">上方向オフセット</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="10"
                  value={adjustment.topOffset}
                  onChange={(e) => handleAdjustmentChange("topOffset", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">左方向オフセット</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="10"
                  value={adjustment.leftOffset}
                  onChange={(e) => handleAdjustmentChange("leftOffset", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">列間隔オフセット</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="10"
                  value={adjustment.hGapOffset}
                  onChange={(e) => handleAdjustmentChange("hGapOffset", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">行間隔オフセット</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="10"
                  value={adjustment.vGapOffset}
                  onChange={(e) => handleAdjustmentChange("vGapOffset", e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={resetAdjustment} className="mt-3">
              <RotateCcw className="w-3 h-3 mr-1" />
              リセット
            </Button>
          </CardContent>
        </Card>

        {/* レイアウト警告 */}
        {layoutErrors.length > 0 && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-700">レイアウト警告</p>
                  {layoutErrors.map((err, i) => (
                    <p key={i} className="text-sm text-red-600">{err}</p>
                  ))}
                  <p className="text-xs text-red-500 mt-1">補正値をリセットするか調整してください</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* プレビュー */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">プレビュー</CardTitle>
                <CardDescription>印刷イメージ（拡大/縮小可）</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale((s) => Math.max(1, Math.round((s - 0.5) * 2) / 2))}
                  disabled={previewScale <= 1}
                >
                  −
                </Button>
                <span className="text-sm text-muted-foreground w-14 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale((s) => Math.min(4, Math.round((s + 0.5) * 2) / 2))}
                  disabled={previewScale >= 4}
                >
                  ＋
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="overflow-auto max-w-full">
                <div
                  className="border border-border shadow-sm bg-white"
                  style={{
                    width: `${SHEET.width * previewScale}px`,
                    height: `${SHEET.height * previewScale}px`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                {labels.map((label, i) => {
                  const pos = getLabelPosition(i, adjustment)
                  const isEmpty = label === null
                  const hasOverflow = label?.blocks.some((b) => b.overflow)
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        top: `${pos.top * previewScale}px`,
                        left: `${pos.left * previewScale}px`,
                        width: `${LABEL.width * previewScale}px`,
                        height: `${LABEL.height * previewScale}px`,
                        border: hasOverflow ? "2px solid #ef4444" : "1px dashed #d1d5db",
                        borderRadius: "4px",
                        backgroundColor: isEmpty ? "#f9fafb" : "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: `${2 * previewScale}px ${3 * previewScale}px`,
                        overflow: "hidden",
                      }}
                    >
                      {isEmpty ? (
                        <span style={{ color: "#d1d5db", fontSize: `${8 * previewScale}px`, textAlign: "center" }}>
                          {i + 1}
                        </span>
                      ) : (
                        label.blocks.map((block, bi) => (
                          block.text ? (
                            <div
                              key={bi}
                              style={{
                                fontSize: `${block.fontSize * previewScale}px`,
                                fontWeight: block.bold ? "bold" : "normal",
                                textAlign: block.align as "left" | "center" | "right",
                                lineHeight: 1.3,
                                overflow: "hidden",
                                color: block.overflow ? "#ef4444" : "#1f2937",
                              }}
                            >
                              {block.text}
                            </div>
                          ) : null
                        ))
                      )}
                    </div>
                  )
                })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 印刷ボタン */}
        <div className="flex justify-center gap-4 pb-8">
          <Button
            size="lg"
            onClick={() => setShowPrintCheck(true)}
            disabled={layoutErrors.length > 0}
            className="px-8"
          >
            <Printer className="w-5 h-5 mr-2" />
            印刷する
          </Button>
        </div>

        {/* 印刷前チェックダイアログ */}
        {showPrintCheck && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>印刷前チェック</CardTitle>
                <CardDescription>すべて確認してから印刷してください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printCheck.paperA4}
                    onChange={(e) => setPrintCheck({ ...printCheck, paperA4: e.target.checked })}
                    className="w-5 h-5 rounded border-2"
                  />
                  <span className="text-sm">用紙サイズ: <strong>A4</strong></span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printCheck.scale100}
                    onChange={(e) => setPrintCheck({ ...printCheck, scale100: e.target.checked })}
                    className="w-5 h-5 rounded border-2"
                  />
                  <span className="text-sm">倍率: <strong>100%</strong>（実際のサイズ）</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printCheck.marginNone}
                    onChange={(e) => setPrintCheck({ ...printCheck, marginNone: e.target.checked })}
                    className="w-5 h-5 rounded border-2"
                  />
                  <span className="text-sm">余白: <strong>なし</strong></span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printCheck.headerFooterOff}
                    onChange={(e) => setPrintCheck({ ...printCheck, headerFooterOff: e.target.checked })}
                    className="w-5 h-5 rounded border-2"
                  />
                  <span className="text-sm">ヘッダー/フッター: <strong>OFF</strong></span>
                </label>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPrintCheck(false)
                      setPrintCheck({ paperA4: false, scale100: false, marginNone: false, headerFooterOff: false })
                    }}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handlePrint}
                    disabled={!allChecked}
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    印刷実行
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── 印刷専用DOM（画面では非表示、印刷時のみ表示） ── */}
      <div
        id="print-root"
        ref={printRootRef}
        className="hidden print:block"
        style={{
          width: `${SHEET.width}mm`,
          height: `${SHEET.height}mm`,
          position: "relative",
          margin: 0,
          padding: 0,
        }}
      >
        {labels.map((label, i) => {
          const pos = getLabelPosition(i, adjustment)
          if (label === null) return null
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${pos.top}mm`,
                left: `${pos.left}mm`,
                width: `${LABEL.width}mm`,
                height: `${LABEL.height}mm`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "2mm 3mm",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {label.blocks.map((block, bi) => (
                block.text ? (
                  <div
                    key={bi}
                    style={{
                      fontSize: `${block.fontSize}mm`,
                      fontWeight: block.bold ? "bold" : "normal",
                      textAlign: block.align as "left" | "center" | "right",
                      lineHeight: 1.35,
                      overflow: "hidden",
                      fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
                    }}
                  >
                    {block.text}
                  </div>
                ) : null
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}
