const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 契約書テンプレートの固定日付を{currentDate}に置き換える
 */

function replaceContractDate() {
  console.log("=".repeat(70))
  console.log("契約書テンプレートの日付を{currentDate}に置き換え")
  console.log("=".repeat(70))

  const templatePath = "templates/contract_template.docx"

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

  // 日付のパターンを検索（w:tタグごとに分かれている可能性があるため、広範囲で検索）
  const datePattern = /<w:t[^>]*>令和<\/w:t>.*?<w:t[^>]*>7<\/w:t>.*?<w:t[^>]*>年<\/w:t>.*?<w:t[^>]*>1<\/w:t>.*?<w:t[^>]*>2<\/w:t>.*?<w:t[^>]*>月<\/w:t>.*?<w:t[^>]*>16<\/w:t>.*?<w:t[^>]*>日<\/w:t>/s

  const hasOldDate = datePattern.test(documentXml)
  console.log(`  固定日付「令和7年12月16日」が存在: ${hasOldDate ? "✓" : "✗"}`)

  if (!hasOldDate) {
    console.log(`\n⚠ 固定日付が見つかりません`)
    console.log(`  別のパターンで検索します...`)

    // より柔軟なパターンで検索
    const flexiblePattern = /令和.*?7.*?年.*?1.*?2.*?月.*?16.*?日/s
    if (flexiblePattern.test(documentXml)) {
      console.log(`  ✓ 柔軟なパターンで見つかりました`)
    } else {
      console.log(`  ✗ 見つかりませんでした`)
      return
    }
  }

  // 修正: 各w:tタグを個別に置き換えていく
  console.log(`\n【ステップ4】日付を{currentDate}に置き換え`)

  // パターン1: 連続した8つのw:tタグを1つにまとめる
  // <w:t>令和</w:t>...<w:t>7</w:t>...<w:t>年</w:t>...<w:t>1</w:t>...<w:t>2</w:t>...<w:t>月</w:t>...<w:t>16</w:t>...<w:t>日</w:t>
  // ↓
  // <w:t>{currentDate}</w:t>

  const beforeFix = documentXml

  // まず、日付の8つのw:tタグの間にあるタグを保持しながら置き換え
  // 「令和」を含むw:tから「日」を含むw:tまでを{currentDate}に置き換える
  const replacePattern = /(<w:t[^>]*>)令和(<\/w:t>)(.*?)(<w:t[^>]*>)7(<\/w:t>)(.*?)(<w:t[^>]*>)年(<\/w:t>)(.*?)(<w:t[^>]*>)1(<\/w:t>)(.*?)(<w:t[^>]*>)2(<\/w:t>)(.*?)(<w:t[^>]*>)月(<\/w:t>)(.*?)(<w:t[^>]*>)16(<\/w:t>)(.*?)(<w:t[^>]*>)日(<\/w:t>)/s

  documentXml = documentXml.replace(replacePattern, '$1{currentDate}$2')

  const changed = beforeFix !== documentXml
  console.log(`  ${changed ? "✓" : "✗"} 日付を置き換え: 「令和7年12月16日」→「{currentDate}」`)

  if (!changed) {
    console.log(`\n⚠ 置き換えが行われませんでした`)
    console.log(`  手動での修正が必要かもしれません`)
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
    const hasPlaceholder = updatedXml.includes("{currentDate}")
    const hasOldDateCheck = /令和.*?7.*?年.*?1.*?2.*?月.*?16.*?日/s.test(updatedXml)

    console.log(`  {currentDate}プレースホルダーが存在: ${hasPlaceholder ? "✓" : "✗"}`)
    console.log(`  旧日付「令和7年12月16日」が存在: ${hasOldDateCheck ? "✗（まだ残っている）" : "✓（削除済み）"}`)

    if (hasPlaceholder && !hasOldDateCheck) {
      console.log(`\n${"=".repeat(70)}`)
      console.log("【完了】")
      console.log("=".repeat(70))
      console.log(`\n✓ 日付の置き換えが完了しました`)
      console.log(`  固定日付「令和7年12月16日」→ プレースホルダー「{currentDate}」`)
      console.log(`\n次回の書類生成から、契約書の日付が生成時の日付になります。`)
    } else {
      console.log(`\n⚠ 修正が正しく反映されていない可能性があります`)
    }
  }
}

replaceContractDate()
