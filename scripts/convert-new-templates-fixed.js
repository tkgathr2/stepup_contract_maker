const fs = require("fs")
const PizZip = require("pizzip")

function convertContract() {
  console.log("\n=== Converting 契約書 ===")

  const inputPath = "C:\\Users\\takag\\Downloads\\人材紹介契約書(★★★★★★★★★★様).docx"
  const outputPath = "templates/contract_template.docx"

  const content = fs.readFileSync(inputPath, "binary")
  const zip = new PizZip(content)
  let documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found")
  }

  // 契約書の置換
  documentXml = documentXml.split("★★★★★★★★★★").join("{companyName}")
  console.log("  ✓ ★★★★★★★★★★ → {companyName} (2 times)")

  documentXml = documentXml.split("■■■■■■■■■■").join("{address}")
  console.log("  ✓ ■■■■■■■■■■ → {address}")

  documentXml = documentXml.split("〇〇〇〇〇〇〇〇〇〇").join("{representativeName}")
  console.log("  ✓ 〇〇〇〇〇〇〇〇〇〇 → {representativeName}")

  zip.file("word/document.xml", documentXml)
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`  ✓ Saved: ${outputPath}`)
}

function convertInvoice() {
  console.log("\n=== Converting 送付状 ===")

  const inputPath = "C:\\Users\\takag\\Downloads\\送付状(★★★★★★★★★★様).docx"
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

  // ▼は分割されている（9個+1個）ので特別処理
  documentXml = documentXml.replace("▼▼▼▼▼▼▼▼▼", "{currentDate_part1}")
  console.log("  ✓ ▼▼▼▼▼▼▼▼▼ → {currentDate_part1}")

  documentXml = documentXml.replace("▼", "{currentDate_part2}")
  console.log("  ✓ ▼ → {currentDate_part2}")

  // 結合
  documentXml = documentXml.replace("{currentDate_part1}", "{currentDate}")
  documentXml = documentXml.replace("{currentDate_part2}", "")
  console.log("  ✓ Combined into {currentDate}")

  // ■は分割されている可能性があるので同様に処理
  const addressMatch = documentXml.match(/■■■■■■■■■/)
  if (addressMatch) {
    documentXml = documentXml.replace("■■■■■■■■■", "{address_part1}")
    documentXml = documentXml.replace("■", "{address_part2}")
    documentXml = documentXml.replace("{address_part1}", "{address}")
    documentXml = documentXml.replace("{address_part2}", "")
    console.log("  ✓ ■■■■■■■■■■ → {address} (split placeholder)")
  } else {
    documentXml = documentXml.split("■■■■■■■■■■").join("{address}")
    console.log("  ✓ ■■■■■■■■■■ → {address}")
  }

  zip.file("word/document.xml", documentXml)
  const outputBuffer = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, outputBuffer)
  console.log(`  ✓ Saved: ${outputPath}`)
}

convertContract()
convertInvoice()

console.log("\n✓ All templates converted successfully!")
