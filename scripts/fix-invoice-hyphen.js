const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 送付状テンプレートのハイフン修正スクリプト
 * 半角カタカナのハイフン「ｰ」を全角ハイフン「‐」に変更
 */

function fixHyphen() {
  console.log("=".repeat(70))
  console.log("送付状テンプレートのハイフン修正")
  console.log("=".repeat(70))

  const templatePath = "templates/invoice_template.docx"

  console.log(`\n【ステップ1】テンプレートファイルを読み込み`)
  const content = fs.readFileSync(templatePath, "binary")
  const zip = new PizZip(content)
  console.log(`✓ 読み込み完了`)

  console.log(`\n【ステップ2】document.xmlを取得`)
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xml not found")
    return
  }
  console.log(`✓ document.xml取得完了`)

  // 修正前の確認
  console.log(`\n【ステップ3】修正前の確認`)
  const hasHalfWidthKatakanaHyphen = documentXml.includes("ｰ")
  console.log(`  半角カタカナハイフン「ｰ」が存在: ${hasHalfWidthKatakanaHyphen ? "✓" : "✗"}`)

  if (!hasHalfWidthKatakanaHyphen) {
    console.log(`\n⚠ 半角カタカナハイフンが見つかりません`)
    console.log(`  既に修正済みの可能性があります`)
    return
  }

  // 修正: 半角カタカナハイフン「ｰ」→全角ハイフン「‐」
  console.log(`\n【ステップ4】ハイフンを修正`)
  const beforeFix = documentXml
  documentXml = documentXml.replace(/ｰ/g, "‐")
  const changed = beforeFix !== documentXml
  console.log(`  ${changed ? "✓" : "✗"} ハイフンを修正: 「ｰ」→「‐」`)

  if (!changed) {
    console.log(`\n⚠ 変更が反映されませんでした`)
    return
  }

  // document.xmlを更新
  console.log(`\n【ステップ5】document.xmlを更新`)
  zip.file("word/document.xml", documentXml)

  // ファイルを保存
  console.log(`\n【ステップ6】ファイルを保存`)
  const buf = zip.generate({ type: "nodebuffer" })
  fs.writeFileSync(templatePath, buf)
  console.log(`✓ 保存完了: ${templatePath}`)

  // 修正後の確認
  console.log(`\n【ステップ7】修正後の確認`)
  const updatedContent = fs.readFileSync(templatePath, "binary")
  const updatedZip = new PizZip(updatedContent)
  const updatedXml = updatedZip.file("word/document.xml")?.asText()

  if (updatedXml) {
    const hasFullWidthHyphen = updatedXml.includes("‐")
    const noHalfWidthKatakana = !updatedXml.includes("ｰ")

    console.log(`  全角ハイフン「‐」が存在: ${hasFullWidthHyphen ? "✓" : "✗"}`)
    console.log(`  半角カタカナハイフン「ｰ」が存在しない: ${noHalfWidthKatakana ? "✓" : "✗"}`)

    if (hasFullWidthHyphen && noHalfWidthKatakana) {
      console.log(`\n${"=".repeat(70)}`)
      console.log("【完了】")
      console.log("=".repeat(70))
      console.log(`\n✓ ハイフンの修正が完了しました`)
      console.log(`  「ｰ」→「‐」（全角ハイフン）`)
    } else {
      console.log(`\n✗ 修正が正しく反映されていません`)
    }
  }
}

fixHyphen()
