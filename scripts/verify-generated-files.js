const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 生成されたファイルの内容を確認するスクリプト
 */

function verifyGeneratedFile(filePath, name) {
  console.log("\n" + "=".repeat(70))
  console.log(`確認中: ${name}`)
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

  // プレースホルダーが残っているか確認
  const placeholderRegex = /\{([a-zA-Z_]+)\}/g
  const placeholders = []
  let match
  while ((match = placeholderRegex.exec(documentXml)) !== null) {
    placeholders.push(match[0])
  }

  if (placeholders.length > 0) {
    console.log("\n⚠ 警告: 置換されていないプレースホルダーが見つかりました:")
    placeholders.forEach(ph => {
      const count = (documentXml.match(new RegExp(ph.replace(/[{}]/g, "\\$&"), "g")) || []).length
      console.log(`  - ${ph}: ${count}箇所`)
    })
    return false
  }

  // テストデータが含まれているか確認
  const testStrings = {
    "テスト株式会社": "会社名",
    "東京都渋谷区テスト1-2-3": "住所",
    "山田 太郎": "代表者名",
    "〒150-0001": "郵便番号",
    "2026": "年",
  }

  console.log("\n【テストデータの確認】")
  let foundCount = 0
  for (const [str, desc] of Object.entries(testStrings)) {
    if (documentXml.includes(str)) {
      console.log(`  ✓ ${desc}: ${str}`)
      foundCount++
    }
  }

  if (foundCount === 0) {
    console.log("  ⚠ テストデータが見つかりませんでした")
    return false
  }

  console.log(`\n  ✓ ${foundCount}/${Object.keys(testStrings).length} 個のテストデータが見つかりました`)
  return true
}

// メイン処理
console.log("=".repeat(70))
console.log("生成されたファイルの内容確認")
console.log("=".repeat(70))

// 最新のファイルを探す
const generatedDir = "public/generated"
const files = fs.readdirSync(generatedDir)
  .filter(f => f.endsWith(".docx"))
  .map(f => ({
    name: f,
    path: `${generatedDir}/${f}`,
    mtime: fs.statSync(`${generatedDir}/${f}`).mtime,
  }))
  .sort((a, b) => b.mtime - a.mtime)

if (files.length === 0) {
  console.error("\n✗ 生成されたファイルが見つかりません")
  process.exit(1)
}

console.log(`\n最新の生成ファイル: ${files.length}件`)
console.log(`  契約書: ${files.find(f => f.name.startsWith("contract_"))?.name || "なし"}`)
console.log(`  送付状: ${files.find(f => f.name.startsWith("invoice_"))?.name || "なし"}`)

const latestContract = files.find(f => f.name.startsWith("contract_"))
const latestInvoice = files.find(f => f.name.startsWith("invoice_"))

let allOk = true

if (latestContract) {
  const result = verifyGeneratedFile(latestContract.path, "契約書")
  if (!result) allOk = false
}

if (latestInvoice) {
  const result = verifyGeneratedFile(latestInvoice.path, "送付状")
  if (!result) allOk = false
}

console.log("\n" + "=".repeat(70))
console.log("【総合結果】")
console.log("=".repeat(70))

if (allOk) {
  console.log("\n✓ すべてのファイルが正しく生成されています！")
  console.log("\n確認事項:")
  console.log("  - ブラウザでPDFファイルを開いて、データが正しく表示されているか確認してください")
  console.log(`  - http://localhost:3000/generated/${latestContract?.name.replace('.docx', '.pdf')}`)
  console.log(`  - http://localhost:3000/generated/${latestInvoice?.name.replace('.docx', '.pdf')}`)
  process.exit(0)
} else {
  console.log("\n✗ 一部のファイルに問題があります")
  process.exit(1)
}
