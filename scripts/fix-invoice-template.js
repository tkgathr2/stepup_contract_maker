const fs = require("fs")
const PizZip = require("pizzip")
const Docxtemplater = require("docxtemplater")

/**
 * 送付状テンプレートの修正スクリプト
 * 1. 住所のハイフン: 「4ｰ33」→「4‐33」（全角ハイフン）
 * 2. 件名: 「契約書ご送付の件（ご返送のお願い）」→「契約書送付ならびにご返送のお願い」
 */

function fixInvoiceTemplate() {
  console.log("=".repeat(70))
  console.log("送付状テンプレートの修正")
  console.log("=".repeat(70))

  const templatePath = "templates/invoice_template.docx"

  if (!fs.existsSync(templatePath)) {
    console.error(`✗ テンプレートファイルが見つかりません: ${templatePath}`)
    return
  }

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

  // 修正前の内容を確認
  console.log(`\n【ステップ3】修正前の内容確認`)
  const halfWidthHyphen = documentXml.includes("4ｰ33")
  const oldSubject = documentXml.includes("契約書ご送付の件（ご返送のお願い）")

  console.log(`  半角ハイフン「4ｰ33」が存在: ${halfWidthHyphen ? "✓" : "✗"}`)
  console.log(`  旧件名が存在: ${oldSubject ? "✓" : "✗"}`)

  // 修正1: 住所のハイフン（半角「ｰ」→全角「‐」）
  console.log(`\n【ステップ4】住所のハイフン修正`)
  const beforeHyphen = documentXml
  documentXml = documentXml.replace(/4ｰ33/g, "4‐33")
  const hyphenChanged = beforeHyphen !== documentXml
  console.log(`  ${hyphenChanged ? "✓" : "✗"} ハイフンを修正: 「4ｰ33」→「4‐33」`)

  // 修正2: 件名の変更
  console.log(`\n【ステップ5】件名の変更`)
  const beforeSubject = documentXml
  documentXml = documentXml.replace(
    /契約書ご送付の件（ご返送のお願い）/g,
    "契約書送付ならびにご返送のお願い"
  )
  const subjectChanged = beforeSubject !== documentXml
  console.log(`  ${subjectChanged ? "✓" : "✗"} 件名を変更`)

  // 変更がない場合
  if (!hyphenChanged && !subjectChanged) {
    console.log(`\n⚠ 変更箇所が見つかりませんでした`)
    console.log(`  既に修正済みの可能性があります`)
    return
  }

  // document.xmlを更新
  console.log(`\n【ステップ6】document.xmlを更新`)
  zip.file("word/document.xml", documentXml)

  // ファイルを保存
  console.log(`\n【ステップ7】ファイルを保存`)
  const buf = zip.generate({ type: "nodebuffer" })
  fs.writeFileSync(templatePath, buf)
  console.log(`✓ 保存完了: ${templatePath}`)

  // 修正後の確認
  console.log(`\n【ステップ8】修正後の確認`)
  const updatedContent = fs.readFileSync(templatePath, "binary")
  const updatedZip = new PizZip(updatedContent)
  const updatedXml = updatedZip.file("word/document.xml")?.asText()

  if (updatedXml) {
    const hasFullWidthHyphen = updatedXml.includes("4‐33")
    const hasNewSubject = updatedXml.includes("契約書送付ならびにご返送のお願い")

    console.log(`  全角ハイフン「4‐33」が存在: ${hasFullWidthHyphen ? "✓" : "✗"}`)
    console.log(`  新件名が存在: ${hasNewSubject ? "✓" : "✗"}`)

    if (hasFullWidthHyphen && hasNewSubject) {
      console.log(`\n${"=".repeat(70)}`)
      console.log("【完了】")
      console.log("=".repeat(70))
      console.log(`\n✓ テンプレートの修正が完了しました`)
      console.log(`  1. 住所のハイフン: 「4ｰ33」→「4‐33」（全角）`)
      console.log(`  2. 件名: 「契約書ご送付の件（ご返送のお願い）」→「契約書送付ならびにご返送のお願い」`)
    } else {
      console.log(`\n✗ 修正が正しく反映されていません`)
    }
  }
}

fixInvoiceTemplate()
