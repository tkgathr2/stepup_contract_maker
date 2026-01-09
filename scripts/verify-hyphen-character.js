const fs = require("fs")
const PizZip = require("pizzip")

/**
 * ハイフン文字を直接確認するスクリプト
 */

function verifyHyphenCharacter() {
  console.log("=".repeat(70))
  console.log("ハイフン文字の詳細確認")
  console.log("=".repeat(70))

  // 最新の送付状ファイルを取得
  const generatedDir = "public/generated"
  const files = fs.readdirSync(generatedDir)
    .filter(f => f.startsWith("invoice_") && f.endsWith(".docx"))
    .map(f => ({
      name: f,
      path: `${generatedDir}/${f}`,
      mtime: fs.statSync(`${generatedDir}/${f}`).mtime,
    }))
    .sort((a, b) => b.mtime - a.mtime)

  if (files.length === 0) {
    console.error("送付状ファイルが見つかりません")
    return
  }

  console.log(`\n最新の送付状: ${files[0].name}`)

  const content = fs.readFileSync(files[0].path, "binary")
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

  // 住所周辺を探す
  console.log("\n【住所周辺のテキスト分析】")
  for (let i = 0; i < allTexts.length; i++) {
    if (allTexts[i].includes("北浜東4")) {
      console.log(`\n位置 [${i}]: "${allTexts[i]}"`)
      console.log(`位置 [${i + 1}]: "${allTexts[i + 1]}"`)
      console.log(`位置 [${i + 2}]: "${allTexts[i + 2]}"`)

      // ハイフン文字の詳細分析
      const hyphenText = allTexts[i + 1]
      console.log(`\n【ハイフン文字の詳細】`)
      console.log(`  文字: "${hyphenText}"`)
      console.log(`  文字コード: ${hyphenText.charCodeAt(0)}`)
      console.log(`  16進数: 0x${hyphenText.charCodeAt(0).toString(16)}`)

      // 比較
      const halfWidthKatakana = "ｰ"
      const fullWidthHyphen = "‐"
      const fullWidthMinus = "－"
      const chouonpu = "ー"

      console.log(`\n【文字コード比較】`)
      console.log(`  半角カタカナハイフン「ｰ」: ${halfWidthKatakana.charCodeAt(0)} (0x${halfWidthKatakana.charCodeAt(0).toString(16)})`)
      console.log(`  全角ハイフン「‐」: ${fullWidthHyphen.charCodeAt(0)} (0x${fullWidthHyphen.charCodeAt(0).toString(16)})`)
      console.log(`  全角マイナス「－」: ${fullWidthMinus.charCodeAt(0)} (0x${fullWidthMinus.charCodeAt(0).toString(16)})`)
      console.log(`  長音符「ー」: ${chouonpu.charCodeAt(0)} (0x${chouonpu.charCodeAt(0).toString(16)})`)

      console.log(`\n【判定結果】`)
      if (hyphenText === halfWidthKatakana) {
        console.log(`  ✗ 半角カタカナハイフン「ｰ」が使用されています`)
      } else if (hyphenText === fullWidthHyphen) {
        console.log(`  ✓ 全角ハイフン「‐」が使用されています（正解）`)
      } else if (hyphenText === fullWidthMinus) {
        console.log(`  △ 全角マイナス「－」が使用されています`)
      } else if (hyphenText === chouonpu) {
        console.log(`  △ 長音符「ー」が使用されています`)
      } else {
        console.log(`  ? 不明な文字が使用されています`)
      }

      break
    }
  }

  console.log("\n" + "=".repeat(70))
}

verifyHyphenCharacter()
