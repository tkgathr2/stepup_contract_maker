import * as fs from "fs"
import * as path from "path"
import { processTemplate } from "../lib/template-processor"
import { generatePDF } from "../lib/pdf-generator"
import { saveDocxFile } from "../lib/docx-generator"

const CONTRACT_TEMPLATE_PATH = "templates/contract_template.docx"
const INVOICE_TEMPLATE_PATH = "templates/invoice_template.docx"
const TEST_OUTPUT_DIR = "test-output"

interface TestResult {
  testName: string
  success: boolean
  contractPdfGenerated: boolean
  contractDocxGenerated: boolean
  invoicePdfGenerated: boolean
  invoiceDocxGenerated: boolean
  errors: string[]
}

async function runTest(testName: string, testData: any): Promise<TestResult> {
  const result: TestResult = {
    testName,
    success: false,
    contractPdfGenerated: false,
    contractDocxGenerated: false,
    invoicePdfGenerated: false,
    invoiceDocxGenerated: false,
    errors: [],
  }

  try {
    console.log(`\n${"=".repeat(60)}`)
    console.log(`テスト実行: ${testName}`)
    console.log(`${"=".repeat(60)}`)

    // テスト出力ディレクトリを作成
    const testDir = path.join(TEST_OUTPUT_DIR, testName.replace(/\s+/g, "_"))
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }

    // テンプレートデータを準備
    const now = new Date()
    const currentDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`
    const formattedPostalCode = `〒${testData.postalCode}`

    const templateData = {
      companyName: testData.companyName,
      address: testData.address,
      representativeName: testData.representativeName,
      postalCode: formattedPostalCode,
      currentDate,
    }

    console.log("\nテストデータ:")
    console.log(`  会社名: ${templateData.companyName}`)
    console.log(`  住所: ${templateData.address}`)
    console.log(`  代表者名: ${templateData.representativeName}`)
    console.log(`  郵便番号: ${templateData.postalCode}`)
    console.log(`  日付: ${templateData.currentDate}`)

    // 契約書を生成
    console.log("\n[1/4] 契約書Word生成中...")
    const contractDocxBuffer = await processTemplate(CONTRACT_TEMPLATE_PATH, templateData)
    const contractDocxPath = path.join(testDir, "contract.docx")
    fs.writeFileSync(contractDocxPath, contractDocxBuffer)
    result.contractDocxGenerated = true
    console.log(`  ✓ 契約書Word生成完了: ${contractDocxPath}`)

    // 契約書PDFを生成
    console.log("\n[2/4] 契約書PDF生成中...")
    const contractDocxBufferForPdf = await processTemplate(CONTRACT_TEMPLATE_PATH, templateData)
    const { pdfPath: contractPdfPath } = await generatePDF(
      contractDocxBufferForPdf,
      `test_contract_${Date.now()}`
    )
    const finalContractPdfPath = path.join(testDir, "contract.pdf")
    fs.copyFileSync(contractPdfPath, finalContractPdfPath)
    fs.unlinkSync(contractPdfPath) // 一時ファイル削除
    result.contractPdfGenerated = true
    console.log(`  ✓ 契約書PDF生成完了: ${finalContractPdfPath}`)

    // 送付状を生成
    console.log("\n[3/4] 送付状Word生成中...")
    const invoiceDocxBuffer = await processTemplate(INVOICE_TEMPLATE_PATH, templateData)
    const invoiceDocxPath = path.join(testDir, "invoice.docx")
    fs.writeFileSync(invoiceDocxPath, invoiceDocxBuffer)
    result.invoiceDocxGenerated = true
    console.log(`  ✓ 送付状Word生成完了: ${invoiceDocxPath}`)

    // 送付状PDFを生成
    console.log("\n[4/4] 送付状PDF生成中...")
    const invoiceDocxBufferForPdf = await processTemplate(INVOICE_TEMPLATE_PATH, templateData)
    const { pdfPath: invoicePdfPath } = await generatePDF(
      invoiceDocxBufferForPdf,
      `test_invoice_${Date.now()}`
    )
    const finalInvoicePdfPath = path.join(testDir, "invoice.pdf")
    fs.copyFileSync(invoicePdfPath, finalInvoicePdfPath)
    fs.unlinkSync(invoicePdfPath) // 一時ファイル削除
    result.invoicePdfGenerated = true
    console.log(`  ✓ 送付状PDF生成完了: ${finalInvoicePdfPath}`)

    // ファイルサイズをチェック
    console.log("\nファイルサイズ:")
    console.log(`  契約書Word: ${(fs.statSync(contractDocxPath).size / 1024).toFixed(2)} KB`)
    console.log(`  契約書PDF: ${(fs.statSync(finalContractPdfPath).size / 1024).toFixed(2)} KB`)
    console.log(`  送付状Word: ${(fs.statSync(invoiceDocxPath).size / 1024).toFixed(2)} KB`)
    console.log(`  送付状PDF: ${(fs.statSync(finalInvoicePdfPath).size / 1024).toFixed(2)} KB`)

    result.success = true
    console.log(`\n✓ ${testName} - 成功`)
    console.log(`  出力先: ${testDir}`)
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : String(error))
    console.error(`\n✗ ${testName} - 失敗`)
    console.error(`  エラー: ${error instanceof Error ? error.message : String(error)}`)
  }

  return result
}

async function main() {
  console.log("\n" + "=".repeat(60))
  console.log("PDF-Word一致検証テスト")
  console.log("=".repeat(60))

  // テスト出力ディレクトリを作成
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true })
  }

  const tests = [
    {
      name: "Test 1 - 通常の会社情報",
      data: {
        companyName: "株式会社テストカンパニー",
        address: "東京都千代田区丸の内1-1-1",
        representativeName: "山田 太郎",
        postalCode: "100-0005",
      },
    },
    {
      name: "Test 2 - 長い社名と住所",
      data: {
        companyName: "株式会社ロングネームコーポレーションインターナショナル",
        address: "大阪府大阪市北区梅田1-2-3 グランフロント大阪タワーA 10階",
        representativeName: "鈴木 花子",
        postalCode: "530-0001",
      },
    },
    {
      name: "Test 3 - 特殊文字を含む",
      data: {
        companyName: "株式会社ABC＆パートナーズ",
        address: "神奈川県横浜市西区みなとみらい2-3-5（クイーンズタワーC棟）",
        representativeName: "佐藤 一郎",
        postalCode: "220-0012",
      },
    },
  ]

  const results: TestResult[] = []

  for (const test of tests) {
    const result = await runTest(test.name, test.data)
    results.push(result)
    // テスト間に少し待機
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // 結果サマリー
  console.log("\n" + "=".repeat(60))
  console.log("テスト結果サマリー")
  console.log("=".repeat(60))

  let allSuccess = true
  for (const result of results) {
    console.log(`\n${result.testName}:`)
    console.log(`  全体: ${result.success ? "✓ 成功" : "✗ 失敗"}`)
    console.log(`  契約書Word: ${result.contractDocxGenerated ? "✓" : "✗"}`)
    console.log(`  契約書PDF: ${result.contractPdfGenerated ? "✓" : "✗"}`)
    console.log(`  送付状Word: ${result.invoiceDocxGenerated ? "✓" : "✗"}`)
    console.log(`  送付状PDF: ${result.invoicePdfGenerated ? "✓" : "✗"}`)

    if (result.errors.length > 0) {
      console.log(`  エラー:`)
      result.errors.forEach((err) => console.log(`    - ${err}`))
    }

    if (!result.success) {
      allSuccess = false
    }
  }

  console.log("\n" + "=".repeat(60))
  if (allSuccess) {
    console.log("✓ すべてのテストが成功しました！")
    console.log("\n次のステップ:")
    console.log("1. test-output/ フォルダ内の各テストのPDFとWordファイルを目視で確認")
    console.log("2. レイアウト、フォント、配置が完全に一致していることを確認")
    console.log("3. プレースホルダーが正しく置換されていることを確認")
  } else {
    console.log("✗ 一部のテストが失敗しました")
    process.exit(1)
  }
  console.log("=".repeat(60) + "\n")
}

main().catch((error) => {
  console.error("テスト実行中にエラーが発生しました:", error)
  process.exit(1)
})
