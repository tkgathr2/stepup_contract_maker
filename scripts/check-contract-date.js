const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 契約書テンプレートと生成された契約書の日付を確認
 */

async function checkContractDate() {
  console.log("=".repeat(70))
  console.log("契約書の日付確認")
  console.log("=".repeat(70))

  // 1. テンプレートファイルに{currentDate}プレースホルダーがあるか確認
  console.log("\n【ステップ1】契約書テンプレートの確認")
  const templatePath = "templates/contract_template.docx"

  if (!fs.existsSync(templatePath)) {
    console.error(`✗ テンプレートファイルが見つかりません: ${templatePath}`)
    return
  }

  const templateContent = fs.readFileSync(templatePath, "binary")
  const templateZip = new PizZip(templateContent)
  const templateXml = templateZip.file("word/document.xml")?.asText()

  if (!templateXml) {
    console.error("✗ document.xml not found")
    return
  }

  const hasDatePlaceholder = templateXml.includes("{currentDate}")
  console.log(`  {currentDate}プレースホルダーが存在: ${hasDatePlaceholder ? "✓" : "✗"}`)

  if (!hasDatePlaceholder) {
    console.log(`  ⚠ 契約書テンプレートに日付プレースホルダーがありません`)
    console.log(`  テンプレートに{currentDate}を追加する必要があります`)
  }

  // 2. 生成された契約書に日付が入っているか確認
  console.log("\n【ステップ2】生成済み契約書の確認")

  // テスト用に契約書を生成
  console.log("  テスト用の契約書を生成中...")

  try {
    const response = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        companyName: "日付確認テスト株式会社",
        address: "東京都渋谷区渋谷1-1-1",
        representativeName: "日付 太郎",
      }),
    })

    if (!response.ok) {
      console.error(`  ✗ API呼び出し失敗`)
      return
    }

    const result = await response.json()
    console.log(`  ✓ 契約書生成成功`)

    // 契約書を読み込み
    const contractDocxPath = `public${result.contractDocxUrl.replace(/\.pdf$/, ".docx")}`

    if (!fs.existsSync(contractDocxPath)) {
      console.error(`  ✗ 契約書DOCXファイルが見つかりません`)
      return
    }

    const contractContent = fs.readFileSync(contractDocxPath, "binary")
    const contractZip = new PizZip(contractContent)
    const contractXml = contractZip.file("word/document.xml")?.asText()

    if (!contractXml) {
      console.error("  ✗ document.xml not found")
      return
    }

    // テキストを抽出
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let match
    const allTexts = []

    while ((match = textRegex.exec(contractXml)) !== null) {
      const text = match[1]
      if (text.trim()) {
        allTexts.push(text)
      }
    }

    // 日付を検索
    console.log("\n【ステップ3】契約書内の日付検索")
    const reiwaDatePattern = /令和\d+年\d+月\d+日/
    const datesFound = allTexts.filter(t => reiwaDatePattern.test(t))

    if (datesFound.length > 0) {
      console.log(`  ✓ 令和形式の日付が見つかりました（${datesFound.length}箇所）:`)
      datesFound.forEach((date, index) => {
        console.log(`    ${index + 1}. ${date}`)
      })
    } else {
      console.log(`  ✗ 令和形式の日付が見つかりません`)

      // 西暦形式を検索
      const westernDates = allTexts.filter(t => /\d{4}年\d{1,2}月\d{1,2}日/.test(t) || /\d{4}\/\d{1,2}\/\d{1,2}/.test(t))
      if (westernDates.length > 0) {
        console.log(`  ⚠ 西暦形式の日付が見つかりました:`)
        westernDates.forEach((date, index) => {
          console.log(`    ${index + 1}. ${date}`)
        })
      }
    }

    // 契約書の最初の20行を表示
    console.log("\n【契約書の内容（最初の20行）】")
    allTexts.slice(0, 20).forEach((text, index) => {
      let marker = "  "
      if (reiwaDatePattern.test(text)) marker = "📅"

      console.log(`  ${marker} [${index + 1}] ${text}`)
    })

    console.log("\n" + "=".repeat(70))
    console.log("【結論】")
    console.log("=".repeat(70))

    if (hasDatePlaceholder && datesFound.length > 0) {
      console.log("\n✓ 契約書に日付が正しく入っています")
      console.log("✓ 日付は生成時（API呼び出し時）の日付が自動的に入ります")
      console.log(`✓ 現在の日付形式: 令和○年○月○日`)
      console.log(`\n生成された契約書PDF: http://localhost:3000${result.contractPdfUrl}`)
    } else if (!hasDatePlaceholder) {
      console.log("\n✗ 契約書テンプレートに{currentDate}プレースホルダーがありません")
      console.log("修正が必要です")
    } else {
      console.log("\n✗ 契約書に日付が入っていません")
      console.log("プレースホルダーは存在しますが、日付が反映されていません")
    }

  } catch (error) {
    console.error(`  ✗ エラー: ${error.message}`)
  }
}

checkContractDate()
