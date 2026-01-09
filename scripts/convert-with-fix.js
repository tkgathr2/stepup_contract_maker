const fs = require("fs")
const PizZip = require("pizzip")

function convertCoverLetter() {
  console.log("Converting Cover Letter...")

  const inputPath = "templates/cover_letter_template_original.docx"
  const outputPath = "templates/invoice_template.docx"

  const content = fs.readFileSync(inputPath, "binary")
  const zip = new PizZip(content)
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found")
  }

  // 送付状の置換
  // ★★★★★★★★★★ → {companyName}
  documentXml = documentXml.split("★★★★★★★★★★").join("{companyName}")
  console.log("  ✓ Replaced ★ x 10 -> {companyName}")

  // ▲▲▲▲▲▲▲▲▲▲ → {postalCode}
  documentXml = documentXml.split("▲▲▲▲▲▲▲▲▲▲").join("{postalCode}")
  console.log("  ✓ Replaced ▲ x 10 -> {postalCode}")

  // ■は分割されているので特別な処理
  // 9個の■を探す
  const pattern9 = "■■■■■■■■■"
  const index = documentXml.indexOf(pattern9)

  if (index !== -1) {
    // 9個の■の直後を確認して、さらに■があるか確認
    // <w:t>■■■■■■■■■</w:t>...</w:t>■</w:t> のようなパターンを想定

    // より安全な方法: 10個の■を一つずつ順番に{address}に置き換え
    // まず9個を置換
    documentXml = documentXml.replace(pattern9, "{address_part1}")
    console.log("  ✓ Replaced ■ x 9 -> {address_part1}")

    // 次に残りの1個を置換
    documentXml = documentXml.replace("■", "{address_part2}")
    console.log("  ✓ Replaced ■ x 1 -> {address_part2}")

    // 最後に結合
    documentXml = documentXml.replace("{address_part1}", "{address}")
    documentXml = documentXml.replace("{address_part2}", "")
    console.log("  ✓ Combined into {address}")
  }

  zip.file("word/document.xml", documentXml)
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`✓ Saved: ${outputPath}\n`)
}

function convertContract() {
  console.log("Converting Contract...")

  const inputPath = "templates/contract_template_original.docx"
  const outputPath = "templates/contract_template.docx"

  const content = fs.readFileSync(inputPath, "binary")
  const zip = new PizZip(content)
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found")
  }

  // 契約書の置換
  // ★★★★★★★★★★ → {companyName} (2箇所)
  documentXml = documentXml.split("★★★★★★★★★★").join("{companyName}")
  console.log("  ✓ Replaced ★ x 10 -> {companyName} (2 times)")

  // ■■■■■■■■■■ → {address}
  documentXml = documentXml.split("■■■■■■■■■■").join("{address}")
  console.log("  ✓ Replaced ■ x 10 -> {address}")

  // 〇〇〇〇〇〇〇〇〇〇 → {representativeName}
  documentXml = documentXml.split("〇〇〇〇〇〇〇〇〇〇").join("{representativeName}")
  console.log("  ✓ Replaced 〇 x 10 -> {representativeName}")

  zip.file("word/document.xml", documentXml)
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`✓ Saved: ${outputPath}\n`)
}

convertCoverLetter()
convertContract()

console.log("✓ All templates converted successfully!")
