const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 令和日付とテンプレート修正の動作確認テスト
 */

async function testReiwaDatenAndTemplate() {
  console.log("=".repeat(70))
  console.log("令和日付とテンプレート修正の動作確認テスト")
  console.log("=".repeat(70))

  const testData = {
    companyName: "令和テスト株式会社",
    address: "東京都渋谷区渋谷1-1-1",
    representativeName: "令和 太郎",
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

    // 送付状を確認
    const invoiceDocxPath = `public${result.invoiceDocxUrl.replace(/\.pdf$/, ".docx")}`

    if (!fs.existsSync(invoiceDocxPath)) {
      console.error(`\n✗ 送付状DOCXファイルが見つかりません: ${invoiceDocxPath}`)
      return
    }

    const content = fs.readFileSync(invoiceDocxPath, "binary")
    const zip = new PizZip(content)
    const documentXml = zip.file("word/document.xml")?.asText()

    if (!documentXml) {
      console.error("✗ document.xml not found")
      return
    }

    // テキストを抽出
    console.log("\n" + "=".repeat(70))
    console.log("【生成された送付状の確認】")
    console.log("=".repeat(70))

    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let match
    const allTexts = []

    while ((match = textRegex.exec(documentXml)) !== null) {
      const text = match[1]
      if (text.trim()) {
        allTexts.push(text)
      }
    }

    // 1. 日付の確認（令和形式）
    console.log("\n【1. 日付の確認】")
    const reiwaDatePattern = /令和\d+年\d+月\d+日/
    const dateText = allTexts.find(t => reiwaDatePattern.test(t))

    if (dateText) {
      console.log(`  ✓ 令和形式の日付が見つかりました: ${dateText}`)
    } else {
      console.log(`  ✗ 令和形式の日付が見つかりません`)
      // 西暦形式があるか確認
      const westernDateText = allTexts.find(t => /\d{4}\/\d{1,2}\/\d{1,2}/.test(t))
      if (westernDateText) {
        console.log(`  ⚠ 西暦形式の日付が見つかりました: ${westernDateText}`)
      }
    }

    // 2. 住所のハイフン確認
    console.log("\n【2. 住所のハイフン確認】")
    const hasFullWidthHyphen = documentXml.includes("4‐33")
    const hasHalfWidthKatakana = documentXml.includes("4ｰ33")

    console.log(`  全角ハイフン「4‐33」が存在: ${hasFullWidthHyphen ? "✓" : "✗"}`)
    console.log(`  半角カタカナハイフン「4ｰ33」が存在: ${hasHalfWidthKatakana ? "✗（修正済み）" : "✓（存在しない）"}`)

    // 3. 件名の確認
    console.log("\n【3. 件名の確認】")
    const hasNewSubject = allTexts.some(t => t.includes("契約書送付ならびにご返送のお願い"))
    const hasOldSubject = allTexts.some(t => t.includes("契約書ご送付の件（ご返送のお願い）"))

    console.log(`  新件名「契約書送付ならびにご返送のお願い」が存在: ${hasNewSubject ? "✓" : "✗"}`)
    console.log(`  旧件名「契約書ご送付の件（ご返送のお願い）」が存在: ${hasOldSubject ? "✗（修正済み）" : "✓（存在しない）"}`)

    // 最初の15行を表示
    console.log("\n【送付状の内容（最初の15行）】")
    allTexts.slice(0, 15).forEach((text, index) => {
      let marker = "  "
      if (reiwaDatePattern.test(text)) marker = "📅"
      else if (text.includes("〒")) marker = "📮"
      else if (text.includes(testData.address)) marker = "📍"
      else if (text.includes(testData.companyName)) marker = "🏢"
      else if (text.includes("契約書送付")) marker = "📋"

      console.log(`  ${marker} [${index + 1}] ${text}`)
    })

    // 総合評価
    console.log("\n" + "=".repeat(70))
    console.log("【総合評価】")
    console.log("=".repeat(70))

    const allChecksPass = dateText && hasFullWidthHyphen && !hasHalfWidthKatakana && hasNewSubject && !hasOldSubject

    if (allChecksPass) {
      console.log("\n✓ 全ての修正が正しく反映されています")
      console.log("  1. 日付: 令和形式 ✓")
      console.log("  2. ハイフン: 全角 ✓")
      console.log("  3. 件名: 新しい件名 ✓")
      console.log(`\n生成されたファイル:`)
      console.log(`  送付状PDF: http://localhost:3000${result.invoicePdfUrl}`)
      console.log(`\nブラウザで開いて確認してください。`)
    } else {
      console.log("\n⚠ いくつかの修正が反映されていません")
      if (!dateText) console.log("  - 日付が令和形式になっていません")
      if (!hasFullWidthHyphen) console.log("  - ハイフンが全角になっていません")
      if (!hasNewSubject) console.log("  - 件名が変更されていません")
    }

  } catch (error) {
    console.error(`\n✗ エラー: ${error.message}`)
    if (error.code === "ECONNREFUSED") {
      console.log(`\nサーバーが起動していません。以下を実行してください:`)
      console.log(`  npm run dev`)
    }
  }
}

testReiwaDatenAndTemplate()
