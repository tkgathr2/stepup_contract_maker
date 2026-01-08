const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 契約書の日付が動的に生成されるかテスト
 */

async function testContractDynamicDate() {
  console.log("=".repeat(70))
  console.log("契約書の動的日付生成テスト")
  console.log("=".repeat(70))

  const testData = {
    companyName: "日付動的テスト株式会社",
    address: "東京都渋谷区渋谷1-1-1",
    representativeName: "動的 太郎",
  }

  console.log("\n【テストデータ】")
  console.log(`  会社名: ${testData.companyName}`)
  console.log(`  住所: ${testData.address}`)
  console.log(`  代表者名: ${testData.representativeName}`)

  console.log("\n【API呼び出し中...】")

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
      console.error(`\n✗ API呼び出し失敗: ${errorData.error || response.statusText}`)
      return
    }

    const result = await response.json()
    console.log(`\n✓ API呼び出し成功`)

    // 契約書を確認
    const contractDocxPath = `public${result.contractDocxUrl.replace(/\.pdf$/, ".docx")}`

    if (!fs.existsSync(contractDocxPath)) {
      console.error(`\n✗ 契約書DOCXファイルが見つかりません: ${contractDocxPath}`)
      return
    }

    const content = fs.readFileSync(contractDocxPath, "binary")
    const zip = new PizZip(content)
    const documentXml = zip.file("word/document.xml")?.asText()

    if (!documentXml) {
      console.error("✗ document.xml not found")
      return
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

    console.log("\n" + "=".repeat(70))
    console.log("【契約書の日付確認】")
    console.log("=".repeat(70))

    // 令和形式の日付を検索
    const reiwaDatePattern = /令和\d+年\d+月\d+日/
    const datesFound = allTexts.filter(t => reiwaDatePattern.test(t))

    if (datesFound.length > 0) {
      console.log(`\n✓ 令和形式の日付が見つかりました（${datesFound.length}箇所）:`)
      datesFound.forEach((date, index) => {
        console.log(`  ${index + 1}. ${date}`)
      })

      // 今日の日付と一致するか確認
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const day = now.getDate()
      const reiwaYear = year - 2018
      const expectedDate = `令和${reiwaYear}年${month}月${day}日`

      console.log(`\n【日付の検証】`)
      console.log(`  期待される日付: ${expectedDate}`)
      console.log(`  実際の日付: ${datesFound[0] || "(なし)"}`)

      if (datesFound[0] === expectedDate) {
        console.log(`  ✓ 日付が一致しています（生成時の日付）`)
      } else {
        console.log(`  ⚠ 日付が異なります`)
      }
    } else {
      console.log(`\n✗ 令和形式の日付が見つかりません`)

      // 固定日付がまだ残っているか確認
      const hasOldDate = allTexts.some(t => t.includes("令和7年12月16日"))
      if (hasOldDate) {
        console.log(`  ⚠ 固定日付「令和7年12月16日」がまだ残っています`)
      }

      // {currentDate}プレースホルダーが残っているか確認
      const hasPlaceholder = documentXml.includes("{currentDate}")
      if (hasPlaceholder) {
        console.log(`  ⚠ {currentDate}プレースホルダーが残っています（置き換えられていない）`)
      }
    }

    // 署名欄周辺を表示（最後の30行）
    console.log(`\n【署名欄周辺（最後の30行）】`)
    allTexts.slice(-30).forEach((text, index) => {
      const actualIndex = allTexts.length - 30 + index
      let marker = "  "
      if (reiwaDatePattern.test(text)) marker = "📅"
      else if (text.includes("甲") || text.includes("乙")) marker = "✍️"

      console.log(`  ${marker} [${actualIndex}] ${text}`)
    })

    console.log("\n" + "=".repeat(70))
    console.log("【結論】")
    console.log("=".repeat(70))

    if (datesFound.length > 0) {
      console.log(`\n✓ 契約書の日付が動的に生成されています`)
      console.log(`✓ 日付: ${datesFound[0]}`)
      console.log(`✓ これから生成する契約書は、その時の日付が自動的に入ります`)
      console.log(`\n生成された契約書PDF: http://localhost:3000${result.contractPdfUrl}`)
      console.log(`\nブラウザで開いて、署名欄の上の日付を確認してください。`)
    } else {
      console.log(`\n✗ 契約書の日付が正しく生成されていません`)
      console.log(`  テンプレートまたはAPI処理に問題がある可能性があります`)
    }

  } catch (error) {
    console.error(`\n✗ エラー: ${error.message}`)
    if (error.code === "ECONNREFUSED") {
      console.log(`\nサーバーが起動していません。以下を実行してください:`)
      console.log(`  npm run dev`)
    }
  }
}

testContractDynamicDate()
