const fs = require("fs")
const PizZip = require("pizzip")
const Docxtemplater = require("docxtemplater")

// テンプレートファイルのパスを指定
const coverLetterPath = "C:\\Users\\takag\\Downloads\\送付状 (大和鋼業株式会社様).docx"
const contractPath = "C:\\Users\\takag\\Downloads\\人材紹介契約書(大和鋼業株式会社様）.docx"

function analyzeDocx(filePath) {
  console.log(`\n========================================`)
  console.log(`Analyzing: ${filePath}`)
  console.log(`========================================\n`)

  const content = fs.readFileSync(filePath, "binary")
  const zip = new PizZip(content)

  // document.xmlの内容を取得
  const documentXml = zip.file("word/document.xml")?.asText()

  if (documentXml) {
    console.log("Raw XML content (first 3000 chars):")
    console.log(documentXml.substring(0, 3000))
    console.log("\n...\n")

    // テキスト内容を抽出
    const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs
    const texts = []
    let match
    while ((match = textRegex.exec(documentXml)) !== null) {
      texts.push(match[1])
    }

    console.log("\nExtracted Text Content:")
    console.log("=======================")
    console.log(texts.join(""))

    // プレースホルダーらしいパターンを検索
    const placeholders = texts.filter(t =>
      t.includes("〇") ||
      t.includes("■") ||
      t.includes("▲") ||
      t.includes("★") ||
      t.includes("様")
    )

    if (placeholders.length > 0) {
      console.log("\n\nPotential Placeholders Found:")
      console.log("==============================")
      placeholders.forEach(p => console.log(`- ${p}`))
    }
  }
}

// 両方のファイルを解析
if (fs.existsSync(coverLetterPath)) {
  analyzeDocx(coverLetterPath)
} else {
  console.log(`File not found: ${coverLetterPath}`)
}

if (fs.existsSync(contractPath)) {
  analyzeDocx(contractPath)
} else {
  console.log(`File not found: ${contractPath}`)
}
