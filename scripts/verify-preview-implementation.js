const fs = require("fs")

/**
 * プレビュー切り替え機能の実装を検証
 */

function verifyPreviewImplementation() {
  console.log("=".repeat(70))
  console.log("プレビュー切り替え機能の実装検証")
  console.log("=".repeat(70))

  const pageFilePath = "app/page.tsx"

  if (!fs.existsSync(pageFilePath)) {
    console.error(`✗ ファイルが見つかりません: ${pageFilePath}`)
    return
  }

  console.log(`\n【ファイル確認】 ${pageFilePath}`)

  const content = fs.readFileSync(pageFilePath, "utf-8")

  // 1. previewType state の確認
  console.log("\n【1. previewType state の確認】")
  const hasPreviewTypeState = content.includes('useState<"contract" | "invoice">("contract")')
  console.log(`  previewType state が存在: ${hasPreviewTypeState ? "✓" : "✗"}`)

  // 2. 切り替えボタンの確認
  console.log("\n【2. 切り替えボタンの確認】")
  const hasContractButton = content.includes("契約書") && content.includes('setPreviewType("contract")')
  const hasInvoiceButton = content.includes("送付状") && content.includes('setPreviewType("invoice")')
  console.log(`  契約書ボタンが存在: ${hasContractButton ? "✓" : "✗"}`)
  console.log(`  送付状ボタンが存在: ${hasInvoiceButton ? "✓" : "✗"}`)

  // 3. 動的なiframe srcの確認
  console.log("\n【3. 動的なiframe srcの確認】")
  const hasDynamicSrc = content.includes('previewType === "contract" ? result.contractPdfUrl : result.invoicePdfUrl')
  console.log(`  動的なsrcが実装されている: ${hasDynamicSrc ? "✓" : "✗"}`)

  // 4. ボタンのvariantの確認
  console.log("\n【4. ボタンのvariantの確認】")
  const hasVariantLogic = content.includes('previewType === "contract" ? "default" : "outline"') &&
                          content.includes('previewType === "invoice" ? "default" : "outline"')
  console.log(`  アクティブ状態の切り替えロジックが存在: ${hasVariantLogic ? "✓" : "✗"}`)

  // 5. レスポンシブデザインの確認
  console.log("\n【5. レスポンシブデザインの確認】")
  const hasFlexLayout = content.includes("flex gap-2") && content.includes("flex-1")
  console.log(`  フレックスレイアウトが使用されている: ${hasFlexLayout ? "✓" : "✗"}`)

  // 6. プレビュー高さの確認
  console.log("\n【6. プレビュー高さの確認】")
  const hasCorrectHeight = content.includes('h-[600px]')
  console.log(`  プレビュー高さが600pxに設定されている: ${hasCorrectHeight ? "✓" : "✗"}`)

  // 総合評価
  console.log("\n" + "=".repeat(70))
  console.log("【総合評価】")
  console.log("=".repeat(70))

  const allChecks = [
    hasPreviewTypeState,
    hasContractButton,
    hasInvoiceButton,
    hasDynamicSrc,
    hasVariantLogic,
    hasFlexLayout,
    hasCorrectHeight,
  ]

  const passedChecks = allChecks.filter(Boolean).length
  const totalChecks = allChecks.length

  console.log(`\n合格: ${passedChecks}/${totalChecks}`)

  if (passedChecks === totalChecks) {
    console.log("\n✓ 全ての実装が正しく完了しています")
    console.log("\n次のステップ:")
    console.log("  1. npm run dev でサーバーを起動")
    console.log("  2. http://localhost:3000 をブラウザで開く")
    console.log("  3. 書類を生成")
    console.log("  4. プレビュー切り替えボタンをクリックして動作確認")
    console.log("\n期待される動作:")
    console.log("  - 初期表示で契約書プレビューが表示される")
    console.log("  - 「送付状」ボタンをクリックすると送付状PDFに切り替わる")
    console.log("  - 「契約書」ボタンをクリックすると契約書PDFに戻る")
    console.log("  - アクティブなボタンは青色背景で表示される")
  } else {
    console.log("\n⚠ いくつかの実装が不完全です")
    console.log("以下の項目を確認してください:")
    if (!hasPreviewTypeState) console.log("  - previewType state が追加されていません")
    if (!hasContractButton) console.log("  - 契約書ボタンが実装されていません")
    if (!hasInvoiceButton) console.log("  - 送付状ボタンが実装されていません")
    if (!hasDynamicSrc) console.log("  - 動的なiframe srcが実装されていません")
    if (!hasVariantLogic) console.log("  - ボタンのアクティブ状態切り替えが実装されていません")
    if (!hasFlexLayout) console.log("  - レスポンシブなフレックスレイアウトが実装されていません")
    if (!hasCorrectHeight) console.log("  - プレビュー高さが600pxに設定されていません")
  }

  console.log("\n" + "=".repeat(70))
}

verifyPreviewImplementation()
