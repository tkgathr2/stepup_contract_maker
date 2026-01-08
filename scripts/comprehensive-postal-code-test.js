const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 郵便番号の包括的なテスト
 * 複数の住所で郵便番号が正しく表示されるか確認
 */

async function comprehensivePostalCodeTest() {
  console.log("=".repeat(70))
  console.log("郵便番号の包括的テスト")
  console.log("=".repeat(70))

  const testCases = [
    {
      name: "テストケース1: 東京都渋谷区",
      companyName: "東京テスト株式会社",
      address: "東京都渋谷区渋谷1-1-1",
      representativeName: "東京 太郎",
      expectedPostalCode: "150-0002",
    },
    {
      name: "テストケース2: 神奈川県横浜市",
      companyName: "横浜テスト株式会社",
      address: "神奈川県横浜市西区みなとみらい2-2-1",
      representativeName: "横浜 花子",
      expectedPostalCode: "220-0012",
    },
    {
      name: "テストケース3: 大阪府大阪市",
      companyName: "大阪テスト株式会社",
      address: "大阪府大阪市中央区北浜東4-33",
      representativeName: "大阪 次郎",
      expectedPostalCode: "540-0031",
    },
  ]

  const results = []

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    console.log(`\n${"=".repeat(70)}`)
    console.log(`${testCase.name}`)
    console.log("=".repeat(70))
    console.log(`  会社名: ${testCase.companyName}`)
    console.log(`  住所: ${testCase.address}`)
    console.log(`  代表者名: ${testCase.representativeName}`)
    console.log(`  期待される郵便番号: ${testCase.expectedPostalCode}`)

    try {
      console.log(`\n  【API呼び出し中...】`)
      const response = await fetch("http://localhost:3000/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          companyName: testCase.companyName,
          address: testCase.address,
          representativeName: testCase.representativeName,
        }),
      })

      if (!response.ok) {
        console.error(`  ✗ API呼び出し失敗`)
        results.push({ testCase: testCase.name, success: false, reason: "API呼び出し失敗" })
        continue
      }

      const result = await response.json()
      const returnedPostalCode = result.postalCode?.replace("〒", "")

      console.log(`\n  【API返却値】`)
      console.log(`    郵便番号: ${result.postalCode || "(なし)"}`)

      // DOCXファイルの内容を確認
      const invoiceDocxPath = `public${result.invoiceDocxUrl.replace(/\.pdf$/, ".docx")}`

      if (!fs.existsSync(invoiceDocxPath)) {
        console.error(`  ✗ 送付状DOCXファイルが見つかりません`)
        results.push({ testCase: testCase.name, success: false, reason: "DOCXファイルなし" })
        continue
      }

      const content = fs.readFileSync(invoiceDocxPath, "binary")
      const zip = new PizZip(content)
      const documentXml = zip.file("word/document.xml")?.asText()

      if (!documentXml) {
        console.error(`  ✗ document.xml not found`)
        results.push({ testCase: testCase.name, success: false, reason: "document.xmlなし" })
        continue
      }

      // テキストを抽出
      const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
      let match
      const allTexts = []

      while ((match = textRegex.exec(documentXml)) !== null) {
        const text = match[1]
        if (text.trim()) {
          allTexts.push(text)
        }
      }

      console.log(`\n  【送付状の内容（最初の10行）】`)
      allTexts.slice(0, 10).forEach((text, index) => {
        let marker = "    "
        if (text.includes("令和")) marker = "  📅"
        else if (text.includes("〒")) marker = "  📮"
        else if (text.includes(testCase.address)) marker = "  📍"
        else if (text.includes(testCase.companyName)) marker = "  🏢"

        console.log(`${marker} [${index + 1}] ${text}`)
      })

      // 郵便番号の確認
      console.log(`\n  【郵便番号の確認】`)
      const expectedPostalWithSymbol = `〒${testCase.expectedPostalCode}`
      const hasPostalCode = documentXml.includes(expectedPostalWithSymbol)

      // 相手先郵便番号の位置を確認（日付の次にあるはず）
      let postalCodePosition = -1
      for (let j = 0; j < allTexts.length; j++) {
        if (allTexts[j].includes(expectedPostalWithSymbol)) {
          postalCodePosition = j + 1
          break
        }
      }

      if (hasPostalCode && postalCodePosition > 0 && postalCodePosition < 5) {
        console.log(`    ✓ 郵便番号が表示されています: ${expectedPostalWithSymbol}`)
        console.log(`    ✓ 位置: [${postalCodePosition}]（日付の次）`)
        console.log(`    ✓ APIからの返却値: ${result.postalCode}`)
        console.log(`    ✓ ファイル: ${invoiceDocxPath}`)
        console.log(`    ✓ PDF: http://localhost:3000${result.invoicePdfUrl}`)

        results.push({
          testCase: testCase.name,
          success: true,
          postalCode: expectedPostalWithSymbol,
          position: postalCodePosition,
          pdfUrl: `http://localhost:3000${result.invoicePdfUrl}`,
          docxFile: invoiceDocxPath,
        })
      } else {
        console.log(`    ✗ 郵便番号が見つかりません`)
        if (returnedPostalCode) {
          console.log(`    ⚠ APIは郵便番号を返しています: ${result.postalCode}`)
        } else {
          console.log(`    ⚠ APIが郵便番号を返していません`)
        }

        results.push({
          testCase: testCase.name,
          success: false,
          reason: "郵便番号が送付状に含まれていない",
          apiReturned: result.postalCode || "(なし)",
        })
      }

    } catch (error) {
      console.error(`  ✗ エラー: ${error.message}`)
      results.push({ testCase: testCase.name, success: false, reason: error.message })
    }
  }

  // 総合結果
  console.log(`\n${"=".repeat(70)}`)
  console.log("総合結果")
  console.log("=".repeat(70))

  const successCount = results.filter(r => r.success).length
  const totalCount = results.length

  console.log(`\n成功: ${successCount}/${totalCount}`)

  results.forEach((result, index) => {
    if (result.success) {
      console.log(`\n✓ ${result.testCase}`)
      console.log(`  郵便番号: ${result.postalCode}`)
      console.log(`  位置: [${result.position}]`)
      console.log(`  PDF: ${result.pdfUrl}`)
      console.log(`  DOCX: ${result.docxFile}`)
    } else {
      console.log(`\n✗ ${result.testCase}`)
      console.log(`  理由: ${result.reason}`)
      if (result.apiReturned) {
        console.log(`  APIからの返却値: ${result.apiReturned}`)
      }
    }
  })

  if (successCount === totalCount) {
    console.log(`\n${"=".repeat(70)}`)
    console.log("【結論】")
    console.log("=".repeat(70))
    console.log(`\n✓ 全てのテストケースで郵便番号が正しく表示されています`)
    console.log(`✓ 相手先会社の郵便番号が送付状に記載されています`)
    console.log(`\n証拠ファイル:`)
    results.forEach(r => {
      console.log(`  - ${r.pdfUrl}`)
    })
  } else {
    console.log(`\n⚠ いくつかのテストケースで郵便番号が表示されていません`)
  }
}

comprehensivePostalCodeTest()
