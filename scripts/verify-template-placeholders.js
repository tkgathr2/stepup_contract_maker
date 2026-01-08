const fs = require("fs")
const PizZip = require("pizzip")

/**
 * テンプレートファイル内のプレースホルダーを検証するスクリプト
 */

// 必要なプレースホルダー
const REQUIRED_PLACEHOLDERS = {
  contract: [
    { name: "companyName", placeholder: "{companyName}", description: "会社名" },
    { name: "address", placeholder: "{address}", description: "住所" },
    { name: "representativeName", placeholder: "{representativeName}", description: "代表者名" },
  ],
  invoice: [
    { name: "companyName", placeholder: "{companyName}", description: "会社名" },
    { name: "address", placeholder: "{address}", description: "住所" },
    { name: "postalCode", placeholder: "{postalCode}", description: "郵便番号" },
    { name: "currentDate", placeholder: "{currentDate}", description: "今日の日付" },
  ],
}

// 特殊文字（置換が必要）
const SPECIAL_SYMBOLS = {
  "★★★★★★★★★★": "会社名（{companyName}に置換が必要）",
  "■■■■■■■■■■": "住所（{address}に置換が必要）",
  "〇〇〇〇〇〇〇〇〇〇": "代表者名（{representativeName}に置換が必要）",
  "▲▲▲▲▲▲▲▲▲▲": "郵便番号（{postalCode}に置換が必要）",
  "▼▼▼▼▼▼▼▼▼▼": "今日の日付（{currentDate}に置換が必要）",
}

function verifyTemplate(filePath, name, requiredPlaceholders) {
  console.log("\n" + "=".repeat(70))
  console.log(`検証中: ${name}`)
  console.log(`ファイル: ${filePath}`)
  console.log("=".repeat(70))

  if (!fs.existsSync(filePath)) {
    console.error(`✗ ファイルが見つかりません: ${filePath}`)
    return false
  }

  const content = fs.readFileSync(filePath, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xml not found")
    return false
  }

  let hasError = false

  // 必要なプレースホルダーの確認
  console.log("\n【必要なプレースホルダーの確認】")
  requiredPlaceholders.forEach(({ name, placeholder, description }) => {
    const found = documentXml.includes(placeholder)
    if (found) {
      const count = (documentXml.match(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g")) || []).length
      console.log(`  ✓ ${placeholder} (${description}): ${count}箇所`)
    } else {
      console.log(`  ✗ ${placeholder} (${description}): 見つかりません`)
      hasError = true
    }
  })

  // 特殊文字の確認
  console.log("\n【特殊文字の確認（置換が必要）】")
  let hasSpecialSymbol = false
  for (const [symbol, desc] of Object.entries(SPECIAL_SYMBOLS)) {
    const regex = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
    const matches = documentXml.match(regex)
    if (matches && matches.length > 0) {
      console.log(`  ⚠ ${symbol}: ${matches.length}箇所 (${desc})`)
      hasSpecialSymbol = true
    }
  }
  if (!hasSpecialSymbol) {
    console.log("  ✓ 特殊文字は見つかりませんでした")
  }

  // 既存のプレースホルダー一覧を抽出
  console.log("\n【検出されたプレースホルダー一覧】")
  const placeholderRegex = /\{([a-zA-Z_]+)\}/g
  const placeholders = new Set()
  let match
  while ((match = placeholderRegex.exec(documentXml)) !== null) {
    placeholders.add(match[0])
  }

  if (placeholders.size > 0) {
    Array.from(placeholders).sort().forEach(ph => {
      const count = (documentXml.match(new RegExp(ph.replace(/[{}]/g, "\\$&"), "g")) || []).length
      console.log(`  - ${ph}: ${count}箇所`)
    })
  } else {
    console.log("  プレースホルダーが見つかりませんでした")
  }

  // 結果
  console.log("\n【検証結果】")
  if (hasError) {
    console.log("  ✗ 必要なプレースホルダーが不足しています")
    return false
  } else if (hasSpecialSymbol) {
    console.log("  ⚠ 特殊文字が見つかりました。修正が必要です")
    return false
  } else {
    console.log("  ✓ すべてのプレースホルダーが正しく設定されています")
    return true
  }
}

// メイン処理
console.log("=" .repeat(70))
console.log("テンプレートファイルのプレースホルダー検証")
console.log("=".repeat(70))

const contractResult = verifyTemplate(
  "templates/contract_template.docx",
  "契約書",
  REQUIRED_PLACEHOLDERS.contract
)

const invoiceResult = verifyTemplate(
  "templates/invoice_template.docx",
  "送付状",
  REQUIRED_PLACEHOLDERS.invoice
)

console.log("\n" + "=".repeat(70))
console.log("【総合結果】")
console.log("=".repeat(70))
console.log(`契約書: ${contractResult ? "✓ OK" : "✗ NG"}`)
console.log(`送付状: ${invoiceResult ? "✓ OK" : "✗ NG"}`)

if (contractResult && invoiceResult) {
  console.log("\n✓ すべてのテンプレートが正しく設定されています！")
  process.exit(0)
} else {
  console.log("\n✗ 修正が必要なテンプレートがあります")
  process.exit(1)
}
