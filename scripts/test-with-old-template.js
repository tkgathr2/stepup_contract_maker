const fs = require("fs")
const PizZip = require("pizzip")
const Docxtemplater = require("docxtemplater")

/**
 * 正常動作していた時のテンプレートファイルでテストするスクリプト
 */

function testTemplate(templatePath, name) {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`テスト中: ${name}`)
  console.log(`ファイル: ${templatePath}`)
  console.log("=".repeat(70))

  if (!fs.existsSync(templatePath)) {
    console.error(`✗ ファイルが見つかりません: ${templatePath}`)
    return false
  }

  const testData = {
    companyName: "テスト会社XYZ",
    address: "北海道札幌市中央区大通西1-1-1",
    representativeName: "高橋 三郎",
    postalCode: "〒060-0042",
    currentDate: "2026/01/08",
  }

  console.log("\n【テストデータ】")
  Object.entries(testData).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })

  try {
    const content = fs.readFileSync(templatePath, "binary")
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    doc.render(testData)

    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    })

    // 出力ファイルを保存
    const outputPath = `public/generated/test_${name.replace(/\s/g, "_")}.docx`
    fs.writeFileSync(outputPath, buf)
    console.log(`\n✓ 生成完了: ${outputPath}`)

    // 生成されたファイルの内容を確認
    const outputZip = new PizZip(buf)
    const outputXml = outputZip.file("word/document.xml")?.asText()

    if (outputXml) {
      console.log("\n【生成されたファイルの確認】")
      Object.entries(testData).forEach(([key, value]) => {
        if (outputXml.includes(value)) {
          console.log(`  ✓ ${key}: ${value} が見つかりました`)
        } else {
          console.log(`  ✗ ${key}: ${value} が見つかりませんでした`)
        }
      })
    }

    return true
  } catch (error) {
    console.error(`\n✗ エラーが発生しました:`, error.message)
    return false
  }
}

console.log("=".repeat(70))
console.log("正常動作時のテンプレートファイルでテスト")
console.log("=".repeat(70))

const oldTemplateResult = testTemplate(
  "templates/invoice_template_579998c.docx",
  "old_template"
)

const newTemplateResult = testTemplate(
  "templates/invoice_template.docx",
  "new_template"
)

console.log("\n" + "=".repeat(70))
console.log("【総合結果】")
console.log("=".repeat(70))
console.log(`正常動作時のテンプレート: ${oldTemplateResult ? "✓ 成功" : "✗ 失敗"}`)
console.log(`現在のテンプレート: ${newTemplateResult ? "✓ 成功" : "✗ 失敗"}`)

if (oldTemplateResult && !newTemplateResult) {
  console.log("\n結論: 正常動作時のテンプレートは問題ないが、現在のテンプレートに問題がある")
  console.log("推奨: 正常動作時のテンプレートを使用する")
} else if (!oldTemplateResult && !newTemplateResult) {
  console.log("\n結論: テンプレート以外に問題がある可能性がある")
  console.log("推奨: コードの変更を確認する")
}

console.log("\n生成されたファイルを確認してください:")
console.log("  - public/generated/test_old_template.docx")
console.log("  - public/generated/test_new_template.docx")
