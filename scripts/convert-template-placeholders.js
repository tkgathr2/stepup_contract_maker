const fs = require("fs")
const PizZip = require("pizzip")
const Docxtemplater = require("docxtemplater")

// プレースホルダーのマッピング
const PLACEHOLDER_MAP = {
  "★★★★★★★★★★": "{companyName}",
  "■■■■■■■■■■": "{address}",
  "〇〇〇〇〇〇〇〇〇〇": "{representativeName}",
  "▲▲▲▲▲▲▲▲▲▲": "{postalCode}",
}

function convertPlaceholders(inputPath, outputPath) {
  console.log(`Converting: ${inputPath}`)
  console.log(`Output to: ${outputPath}`)

  // テンプレートファイルを読み込む
  const content = fs.readFileSync(inputPath, "binary")
  const zip = new PizZip(content)

  // document.xmlを取得
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found")
  }

  // まず、<w:t>タグ間でプレースホルダーが分割されているケースを結合
  // 例: <w:t>★★★</w:t></w:r><w:r><w:t>★★★★★★★</w:t> -> 単一の<w:t>にまとめる

  // プレースホルダーを置換
  for (const [oldPlaceholder, newPlaceholder] of Object.entries(PLACEHOLDER_MAP)) {
    let beforeCount = (documentXml.match(new RegExp(oldPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length

    // 複数の<w:t>タグにまたがる可能性を考慮して、<w:r>タグを無視して置換
    // まず、プレースホルダーの各文字を個別に検索
    const placeholderChar = oldPlaceholder[0] // 例: ★

    // <w:r>...</w:r>をまたいでプレースホルダーを検索・置換
    const searchPattern = oldPlaceholder.split('').map(c =>
      c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    ).join('(?:</w:t></w:r>)?(?:<w:r[^>]*>)?(?:<w:t[^>]*>)?')

    const regex = new RegExp(searchPattern, 'g')
    let replaced = false

    documentXml = documentXml.replace(regex, (match) => {
      replaced = true
      // マッチした部分を新しいプレースホルダーに置き換え
      // まず、タグを除去してテキストだけを抽出
      const textOnly = match.replace(/<[^>]+>/g, '')
      if (textOnly === oldPlaceholder) {
        // プレースホルダー全体が見つかった場合、最初の<w:t>タグ内に新しいプレースホルダーを配置
        return match.split('</w:t>')[0].replace(/<w:t[^>]*>[^<]*/, `<w:t>${newPlaceholder}`)  + '</w:t>'
      }
      return match
    })

    let afterCount = (documentXml.match(new RegExp(newPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    console.log(`  ${oldPlaceholder} -> ${newPlaceholder}: ${beforeCount} found, ${afterCount} replaced`)
  }

  // 修正したXMLを書き戻す
  zip.file("word/document.xml", documentXml)

  // 新しいDOCXファイルとして保存
  const outputBuffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  })

  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`✓ Conversion completed: ${outputPath}\n`)
}

// 送付状を変換
convertPlaceholders(
  "templates/cover_letter_template_original.docx",
  "templates/invoice_template.docx"
)

// 契約書を変換
convertPlaceholders(
  "templates/contract_template_original.docx",
  "templates/contract_template.docx"
)

console.log("All templates converted successfully!")
