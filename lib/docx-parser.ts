import PizZip from "pizzip"

interface ParagraphInfo {
  text: string
  alignment?: "left" | "center" | "right" | "both"
  isList?: boolean
  isNumberedList?: boolean
  fontSize?: number
  isBold?: boolean
  isTitle?: boolean
}

/**
 * DOCXファイルから段落情報を抽出する
 */
export function extractParagraphInfo(docxBuffer: Buffer): ParagraphInfo[] {
  const zip = new PizZip(docxBuffer)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found in docx file")
  }

  const paragraphs: ParagraphInfo[] = []

  // 段落を抽出
  const paraRegex = /<w:p\s[^>]*>[\s\S]*?<\/w:p>/g
  const paraMatches = documentXml.match(paraRegex) || []

  for (const paraTxt of paraMatches) {
    const info: ParagraphInfo = { text: "" }

    // テキストを抽出
    const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
    let textMatch
    const texts: string[] = []
    while ((textMatch = textRegex.exec(paraTxt)) !== null) {
      texts.push(textMatch[1])
    }
    info.text = texts.join("")

    // 空の段落はスキップ
    if (!info.text.trim()) {
      continue
    }

    // 配置を抽出
    const alignMatch = paraTxt.match(/<w:jc w:val="(left|center|right|both)"/)
    if (alignMatch) {
      info.alignment = alignMatch[1] as "left" | "center" | "right" | "both"
    }

    // リストスタイルを確認
    const listStyleMatch = paraTxt.match(/<w:pStyle w:val="(a9|List Paragraph)"/)
    if (listStyleMatch) {
      info.isList = true
    }

    // フォントサイズを抽出
    const fontSizeMatch = paraTxt.match(/<w:sz w:val="(\d+)"/)
    if (fontSizeMatch) {
      info.fontSize = parseInt(fontSizeMatch[1]) / 2 // Wordは半ポイント単位
    }

    // 太字を確認
    if (paraTxt.includes("<w:b/>") || paraTxt.includes('<w:b w:val="true"')) {
      info.isBold = true
    }

    // タイトル判定（18pt以上）
    if (info.fontSize && info.fontSize >= 16) {
      info.isTitle = true
    }

    paragraphs.push(info)
  }

  return paragraphs
}

/**
 * 段落情報からHTMLを生成する
 */
export function generateHTMLFromParagraphs(
  paragraphs: ParagraphInfo[]
): string {
  let html = ""

  for (const para of paragraphs) {
    const classes: string[] = []
    const styles: string[] = []

    // 配置
    if (para.alignment === "center") {
      classes.push("text-center")
    } else if (para.alignment === "right") {
      classes.push("text-right")
    }

    // タイトル
    if (para.isTitle || para.fontSize && para.fontSize >= 16) {
      classes.push("title")
    }

    // リスト
    if (para.isList) {
      classes.push("list-para")
    }

    // 太字
    if (para.isBold) {
      styles.push("font-weight: bold")
    }

    // フォントサイズ
    if (para.fontSize && para.fontSize !== 10.5) {
      styles.push(`font-size: ${para.fontSize}pt`)
    }

    const classAttr = classes.length > 0 ? ` class="${classes.join(" ")}"` : ""
    const styleAttr = styles.length > 0 ? ` style="${styles.join("; ")}"` : ""

    html += `<p${classAttr}${styleAttr}>${escapeHtml(para.text)}</p>\n`
  }

  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
