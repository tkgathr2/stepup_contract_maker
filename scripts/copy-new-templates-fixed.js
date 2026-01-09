const fs = require("fs")
const PizZip = require("pizzip")

const sourceDir = "C:\\Users\\takag\\00_dev\\kazuko_departure_watch\\テンプレート"

console.log("テンプレートファイルをコピーして変換します...\n")

function convertContract() {
  console.log("=== 契約書を変換 ===")

  const inputPath = `${sourceDir}\\人材紹介契約書(★★★★★★★★★★様).docx`
  const outputPath = "templates/contract_template.docx"

  const content = fs.readFileSync(inputPath, "binary")
  const zip = new PizZip(content)
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found")
  }

  // 契約書の置換
  documentXml = documentXml.split("★★★★★★★★★★").join("{companyName}")
  console.log("  ✓ ★★★★★★★★★★ → {companyName} (2回)")

  documentXml = documentXml.split("■■■■■■■■■■").join("{address}")
  console.log("  ✓ ■■■■■■■■■■ → {address}")

  documentXml = documentXml.split("〇〇〇〇〇〇〇〇〇〇").join("{representativeName}")
  console.log("  ✓ 〇〇〇〇〇〇〇〇〇〇 → {representativeName}")

  zip.file("word/document.xml", documentXml)
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`  ✓ 保存: ${outputPath}\n`)
}

function convertInvoice() {
  console.log("=== 送付状を変換 ===")

  const inputPath = `${sourceDir}\\送付状(★★★★★★★★★★様).docx`
  const outputPath = "templates/invoice_template.docx"

  const content = fs.readFileSync(inputPath, "binary")
  const zip = new PizZip(content)
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found")
  }

  // 送付状の置換
  documentXml = documentXml.split("★★★★★★★★★★").join("{companyName}")
  console.log("  ✓ ★★★★★★★★★★ → {companyName}")

  documentXml = documentXml.split("▲▲▲▲▲▲▲▲▲▲").join("{postalCode}")
  console.log("  ✓ ▲▲▲▲▲▲▲▲▲▲ → {postalCode}")

  // ▼は分割されている（9個+1個）
  documentXml = documentXml.replace("▼▼▼▼▼▼▼▼▼", "{currentDate_part1}")
  documentXml = documentXml.replace("▼", "{currentDate_part2}")
  documentXml = documentXml.replace("{currentDate_part1}", "{currentDate}")
  documentXml = documentXml.replace("{currentDate_part2}", "")
  console.log("  ✓ ▼▼▼▼▼▼▼▼▼▼ → {currentDate} (分割パターン)")

  // ■も分割されている可能性
  if (documentXml.includes("■■■■■■■■■")) {
    documentXml = documentXml.replace("■■■■■■■■■", "{address_part1}")
    documentXml = documentXml.replace("■", "{address_part2}")
    documentXml = documentXml.replace("{address_part1}", "{address}")
    documentXml = documentXml.replace("{address_part2}", "")
    console.log("  ✓ ■■■■■■■■■■ → {address} (分割パターン)")
  } else {
    documentXml = documentXml.split("■■■■■■■■■■").join("{address}")
    console.log("  ✓ ■■■■■■■■■■ → {address}")
  }

  zip.file("word/document.xml", documentXml)
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`  ✓ 保存: ${outputPath}\n`)
}

convertContract()
convertInvoice()

console.log("✓ すべてのテンプレートの変換が完了しました！")
