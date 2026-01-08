const fs = require("fs")
const PizZip = require("pizzip")

/**
 * 2つのテンプレートファイルを比較するスクリプト
 */

function analyzeTemplate(filePath, name) {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`分析中: ${name}`)
  console.log(`ファイル: ${filePath}`)
  console.log("=".repeat(70))

  if (!fs.existsSync(filePath)) {
    console.error(`✗ ファイルが見つかりません: ${filePath}`)
    return null
  }

  const content = fs.readFileSync(filePath, "binary")
  const zip = new PizZip(content)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    console.error("✗ document.xml not found")
    return null
  }

  // プレースホルダーを抽出
  const placeholderRegex = /\{([a-zA-Z_]+)\}/g
  const placeholders = new Set()
  let match
  while ((match = placeholderRegex.exec(documentXml)) !== null) {
    placeholders.add(match[0])
  }

  console.log("\n【検出されたプレースホルダー】")
  if (placeholders.size > 0) {
    Array.from(placeholders).sort().forEach(ph => {
      const count = (documentXml.match(new RegExp(ph.replace(/[{}]/g, "\\$&"), "g")) || []).length
      console.log(`  - ${ph}: ${count}箇所`)
    })
  } else {
    console.log("  プレースホルダーが見つかりませんでした")
  }

  // <w:t>タグのテキストを抽出（プレースホルダー周辺のみ）
  console.log("\n【<w:t>タグのテキスト順序（プレースホルダー周辺）】")
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  const texts = []
  let textMatch
  let index = 0

  while ((textMatch = textRegex.exec(documentXml)) !== null) {
    const text = textMatch[1]
    if (text.trim()) {
      const hasPlaceholder = text.includes("{") && text.includes("}")
      if (hasPlaceholder || texts.length > 0) {
        texts.push({ index, text, hasPlaceholder })
        index++
        if (texts.length > 20 && !hasPlaceholder) break
      }
    }
  }

  texts.forEach(({ index, text, hasPlaceholder }) => {
    const marker = hasPlaceholder ? "★" : " "
    const displayText = text.length > 80 ? text.substring(0, 80) + "..." : text
    console.log(`  ${marker} [${index}] ${displayText}`)
  })

  return {
    placeholders: Array.from(placeholders).sort(),
    texts: texts,
    documentXml: documentXml,
  }
}

console.log("=".repeat(70))
console.log("テンプレートファイルの比較")
console.log("=".repeat(70))

const oldTemplate = analyzeTemplate("/tmp/invoice_template_579998c.docx", "正常動作時のテンプレート (579998c)")
const newTemplate = analyzeTemplate("templates/invoice_template.docx", "現在のテンプレート")

if (oldTemplate && newTemplate) {
  console.log("\n" + "=".repeat(70))
  console.log("【比較結果】")
  console.log("=".repeat(70))

  console.log("\n【プレースホルダーの比較】")
  const oldPh = new Set(oldTemplate.placeholders)
  const newPh = new Set(newTemplate.placeholders)

  console.log("\n正常動作時にあったプレースホルダー:")
  oldTemplate.placeholders.forEach(ph => {
    if (newPh.has(ph)) {
      console.log(`  ✓ ${ph}: 両方に存在`)
    } else {
      console.log(`  ✗ ${ph}: 現在は存在しない`)
    }
  })

  console.log("\n現在のみに存在するプレースホルダー:")
  newTemplate.placeholders.forEach(ph => {
    if (!oldPh.has(ph)) {
      console.log(`  + ${ph}`)
    }
  })

  // ファイルサイズの比較
  const oldSize = fs.statSync("/tmp/invoice_template_579998c.docx").size
  const newSize = fs.statSync("templates/invoice_template.docx").size
  console.log("\n【ファイルサイズの比較】")
  console.log(`  正常動作時: ${oldSize} bytes`)
  console.log(`  現在: ${newSize} bytes`)
  console.log(`  差分: ${newSize - oldSize} bytes`)
}

console.log("\n" + "=".repeat(70))
console.log("比較完了")
console.log("=".repeat(70))
