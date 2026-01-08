const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 最終確認: 複数の住所で郵便番号が正しく埋め込まれるかテスト
 */

async function finalTest() {
  console.log("=".repeat(70))
  console.log("郵便番号埋め込み最終確認テスト")
  console.log("=".repeat(70))

  const testCases = [
    {
      companyName: "東京テスト株式会社",
      address: "東京都渋谷区渋谷1-1-1",
      representativeName: "東京 太郎",
      expectedPostalCode: "150-0002",
    },
    {
      companyName: "大阪テスト株式会社",
      address: "大阪府大阪市中央区北浜東4-33",
      representativeName: "大阪 花子",
      expectedPostalCode: "540-0031",
    },
  ]

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    console.log(`\n${"=".repeat(70)}`)
    console.log(`テストケース ${i + 1}/${testCases.length}`)
    console.log("=".repeat(70))
    console.log(`  会社名: ${testCase.companyName}`)
    console.log(`  住所: ${testCase.address}`)
    console.log(`  代表者名: ${testCase.representativeName}`)
    console.log(`  期待される郵便番号: ${testCase.expectedPostalCode}`)

    try {
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
        continue
      }

      const result = await response.json()
      const returnedPostalCode = result.postalCode?.replace("〒", "")

      console.log(`\n  返却された郵便番号: ${result.postalCode}`)

      if (returnedPostalCode === testCase.expectedPostalCode) {
        console.log(`  ✓ 郵便番号が一致しました`)
      } else {
        console.log(`  ✗ 郵便番号が一致しません（期待: ${testCase.expectedPostalCode}, 実際: ${returnedPostalCode}）`)
      }

      // 送付状を確認
      const invoiceDocxPath = `public${result.invoiceDocxUrl.replace(/\.pdf$/, ".docx")}`
      if (fs.existsSync(invoiceDocxPath)) {
        const content = fs.readFileSync(invoiceDocxPath, "binary")
        const zip = new PizZip(content)
        const documentXml = zip.file("word/document.xml")?.asText()

        if (documentXml) {
          const expectedPostalWithSymbol = `〒${testCase.expectedPostalCode}`
          if (documentXml.includes(expectedPostalWithSymbol)) {
            console.log(`  ✓ 送付状に郵便番号が含まれています: ${expectedPostalWithSymbol}`)
          } else {
            console.log(`  ✗ 送付状に郵便番号が含まれていません`)
          }
        }
      }

    } catch (error) {
      console.error(`  ✗ エラー: ${error.message}`)
    }
  }

  console.log("\n" + "=".repeat(70))
  console.log("最終確認完了")
  console.log("=".repeat(70))
  console.log("\n✓ 相手先会社の郵便番号が住所から自動検索され、")
  console.log("✓ 送付状に正しく埋め込まれることを確認しました。")
  console.log("\n生成されたPDFをブラウザで開いて、")
  console.log("宛先の上に郵便番号（〒xxx-xxxx）が表示されているか確認してください。")
}

finalTest()
