import * as fs from "fs"
import * as path from "path"
import { processTemplate } from "../lib/template-processor"

async function testNewImplementation() {
  console.log("新しいテンプレートと日付機能のテストを開始します...\n")

  // 今日の日付を生成
  const now = new Date()
  const currentDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`

  const testData = {
    companyName: "テスト株式会社",
    address: "大阪府大阪市中央区北浜東4-33",
    representativeName: "山田太郎",
    postalCode: "〒540-0031",
    currentDate: currentDate,
  }

  console.log("テストデータ:")
  console.log(JSON.stringify(testData, null, 2))
  console.log()

  try {
    // 契約書テンプレートをテスト
    console.log("契約書テンプレートを処理中...")
    const contractPath = "templates/contract_template.docx"
    const contractBuffer = await processTemplate(contractPath, testData)

    // テスト出力ディレクトリを作成
    const outputDir = "test-output"
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir)
    }

    // 契約書を保存
    const contractOutputPath = path.join(outputDir, "test_contract_new.docx")
    fs.writeFileSync(contractOutputPath, contractBuffer)
    console.log(`✓ 契約書を生成しました: ${contractOutputPath}`)

    // 送付状テンプレートをテスト
    console.log("\n送付状テンプレートを処理中...")
    const invoicePath = "templates/invoice_template.docx"
    const invoiceBuffer = await processTemplate(invoicePath, testData)

    // 送付状を保存
    const invoiceOutputPath = path.join(outputDir, "test_invoice_new.docx")
    fs.writeFileSync(invoiceOutputPath, invoiceBuffer)
    console.log(`✓ 送付状を生成しました: ${invoiceOutputPath}`)

    console.log("\n✓ すべてのテストが成功しました！")
    console.log(`\n生成されたファイルを確認してください:`)
    console.log(`  - ${contractOutputPath}`)
    console.log(`  - ${invoiceOutputPath}`)
    console.log(`\n日付: ${currentDate}`)
    console.log(`郵便番号: ${testData.postalCode}`)
  } catch (error) {
    console.error("✗ エラーが発生しました:", error)
    process.exit(1)
  }
}

testNewImplementation()
