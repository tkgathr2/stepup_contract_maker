const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 最終的な動作確認テスト
 * ブラウザと同じようにAPIを呼び出して、生成されたファイルを確認
 */

async function runFinalTest() {
  console.log("=".repeat(70))
  console.log("最終動作確認テスト")
  console.log("=".repeat(70))

  const testData = {
    companyName: "最終テスト株式会社",
    address: "東京都千代田区丸の内1-1-1",
    representativeName: "最終 太郎",
    postalCode: "100-0005",
  }

  console.log("\n【テストデータ】")
  console.log(`  会社名: ${testData.companyName}`)
  console.log(`  住所: ${testData.address}`)
  console.log(`  代表者名: ${testData.representativeName}`)
  console.log(`  郵便番号: ${testData.postalCode}`)

  console.log("\n【APIリクエスト送信中...】")

  try {
    const response = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(testData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`\n✗ APIエラー: ${errorData.error}`)
      console.error(`  HTTPステータス: ${response.status}`)
      return false
    }

    const result = await response.json()
    console.log("\n✓ API呼び出し成功")
    console.log(`  契約書PDF: ${result.contractPdfUrl}`)
    console.log(`  送付状PDF: ${result.invoicePdfUrl}`)

    // 生成されたファイルを確認
    console.log("\n" + "=".repeat(70))
    console.log("【生成ファイルの内容確認】")
    console.log("=".repeat(70))

    const invoiceDocxPath = `public${result.invoiceDocxUrl.replace(/\.pdf$/, ".docx")}`

    if (!fs.existsSync(invoiceDocxPath)) {
      console.error(`\n✗ ファイルが見つかりません: ${invoiceDocxPath}`)
      return false
    }

    const content = fs.readFileSync(invoiceDocxPath, "binary")
    const zip = new PizZip(content)
    const documentXml = zip.file("word/document.xml")?.asText()

    if (!documentXml) {
      console.error("\n✗ document.xml not found")
      return false
    }

    // 期待されるデータが含まれているか確認
    const expectedData = [
      { key: "会社名", value: testData.companyName },
      { key: "住所", value: testData.address },
      { key: "郵便番号", value: `〒${testData.postalCode}` },
      { key: "日付（年）", value: "2026" },
    ]

    console.log("\n【送付状の確認】")
    let allFound = true
    expectedData.forEach(({ key, value }) => {
      if (documentXml.includes(value)) {
        console.log(`  ✓ ${key}: ${value}`)
      } else {
        console.log(`  ✗ ${key}: ${value} が見つかりません`)
        allFound = false
      }
    })

    // <w:t>タグのテキストを抽出（最初の10個）
    console.log("\n【送付状の最初の10行】")
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let match
    let index = 0

    while ((match = textRegex.exec(documentXml)) !== null && index < 10) {
      const text = match[1]
      if (text.trim()) {
        const displayText = text.length > 80 ? text.substring(0, 80) + "..." : text
        console.log(`  [${index}] ${displayText}`)
        index++
      }
    }

    // 契約書も確認
    const contractDocxPath = `public${result.contractDocxUrl.replace(/\.pdf$/, ".docx")}`

    if (fs.existsSync(contractDocxPath)) {
      const contractContent = fs.readFileSync(contractDocxPath, "binary")
      const contractZip = new PizZip(contractContent)
      const contractXml = contractZip.file("word/document.xml")?.asText()

      if (contractXml) {
        console.log("\n【契約書の確認】")
        const contractExpected = [
          { key: "会社名", value: testData.companyName },
          { key: "住所", value: testData.address },
          { key: "代表者名", value: testData.representativeName },
        ]

        contractExpected.forEach(({ key, value }) => {
          if (contractXml.includes(value)) {
            console.log(`  ✓ ${key}: ${value}`)
          } else {
            console.log(`  ✗ ${key}: ${value} が見つかりません`)
            allFound = false
          }
        })
      }
    }

    console.log("\n" + "=".repeat(70))
    console.log("【最終結果】")
    console.log("=".repeat(70))

    if (allFound) {
      console.log("\n✓ すべてのテストに合格しました！")
      console.log("  - APIが正常に動作しています")
      console.log("  - すべてのデータが正しく反映されています")
      console.log("  - 文字化けは発生していません")
      console.log("\n次のステップ:")
      console.log("  1. ブラウザで http://localhost:3000 を開く")
      console.log("  2. 実際にデータを入力してPDFを生成")
      console.log("  3. 生成されたPDFを開いて最終確認")
      return true
    } else {
      console.log("\n✗ 一部のテストが失敗しました")
      console.log("  上記の✗マークがついた項目を確認してください")
      return false
    }

  } catch (error) {
    console.error(`\n✗ エラーが発生しました: ${error.message}`)
    console.error("\n確認事項:")
    console.error("  - 開発サーバーが起動しているか確認してください")
    console.error("  - http://localhost:3000 にアクセスできるか確認してください")
    return false
  }
}

runFinalTest()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error("予期しないエラー:", error)
    process.exit(1)
  })
