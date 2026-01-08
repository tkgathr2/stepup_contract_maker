import * as fs from "fs"
import PizZip from "pizzip"

function verifyDocxFile(filePath: string, expectedData: Record<string, string>) {
  console.log(`\n検証中: ${filePath}`)
  console.log("=".repeat(60))

  const content = fs.readFileSync(filePath, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xmlが見つかりません")
    return false
  }

  // テキストを抽出
  const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
  const texts: string[] = []
  let match
  while ((match = textRegex.exec(documentXml)) !== null) {
    texts.push(match[1])
  }
  const fullText = texts.join("")

  console.log("\n抽出されたテキスト (最初の500文字):")
  console.log(fullText.substring(0, 500))

  // 期待されるデータが含まれているか確認
  let allFound = true
  console.log("\n検証結果:")
  for (const [key, value] of Object.entries(expectedData)) {
    const found = fullText.includes(value)
    const status = found ? "✓" : "✗"
    console.log(`  ${status} ${key}: "${value}" ${found ? "見つかりました" : "見つかりません"}`)
    if (!found) {
      allFound = false
    }
  }

  // プレースホルダーが残っていないか確認
  console.log("\nプレースホルダー残存チェック:")
  const placeholders = ["{companyName}", "{address}", "{representativeName}", "{postalCode}", "{currentDate}"]
  let hasPlaceholders = false
  for (const placeholder of placeholders) {
    if (fullText.includes(placeholder)) {
      console.log(`  ✗ プレースホルダーが残っています: ${placeholder}`)
      hasPlaceholders = true
    }
  }
  if (!hasPlaceholders) {
    console.log("  ✓ プレースホルダーは正しく置換されています")
  }

  return allFound && !hasPlaceholders
}

// テストデータ
const now = new Date()
const currentDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`

const testData = {
  companyName: "テスト株式会社",
  address: "大阪府大阪市中央区北浜東4-33",
  representativeName: "山田太郎",
  postalCode: "〒540-0031",
  currentDate: currentDate,
}

console.log("生成されたファイルの検証を開始します...")
console.log("\n期待されるデータ:")
console.log(JSON.stringify(testData, null, 2))

const contractValid = verifyDocxFile("test-output/test_contract_new.docx", {
  companyName: testData.companyName,
  address: testData.address,
  representativeName: testData.representativeName,
})

const invoiceValid = verifyDocxFile("test-output/test_invoice_new.docx", {
  companyName: testData.companyName,
  address: testData.address,
  postalCode: testData.postalCode,
  currentDate: testData.currentDate,
})

console.log("\n" + "=".repeat(60))
console.log("総合結果:")
console.log("=".repeat(60))
if (contractValid && invoiceValid) {
  console.log("✓ すべての検証が成功しました！")
  console.log("\n確認事項:")
  console.log(`  ✓ 日付が正しく挿入されています: ${testData.currentDate}`)
  console.log(`  ✓ 郵便番号に「〒」が付いています: ${testData.postalCode}`)
  process.exit(0)
} else {
  console.log("✗ 一部の検証が失敗しました")
  process.exit(1)
}
