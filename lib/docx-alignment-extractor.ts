import PizZip from "pizzip"

interface AlignmentInfo {
  text: string
  alignment?: "left" | "center" | "right" | "both"
  fontSize?: number
}

/**
 * DOCXファイルから段落の配置情報を抽出する
 */
export function extractAlignments(docxBuffer: Buffer): AlignmentInfo[] {
  const zip = new PizZip(docxBuffer)
  const documentXml = zip.file("word/document.xml")?.asText()

  if (!documentXml) {
    throw new Error("document.xml not found in docx file")
  }

  const alignments: AlignmentInfo[] = []

  // 段落を抽出
  const paraRegex = /<w:p\s[^>]*?>[\s\S]*?<\/w:p>/g
  const paraMatches = documentXml.match(paraRegex) || []

  for (const paraTxt of paraMatches) {
    const info: AlignmentInfo = { text: "" }

    // テキストを抽出
    const textRegex = /<w:t[^>]*?>([\s\S]*?)<\/w:t>/g
    let textMatch
    const texts: string[] = []
    while ((textMatch = textRegex.exec(paraTxt)) !== null) {
      texts.push(textMatch[1])
    }
    info.text = texts.join("").trim()

    // 空の段落もカウント（HTMLと一致させるため）
    // 配置を抽出
    const alignMatch = paraTxt.match(/<w:jc w:val="(left|center|right|both)"\/>/)
    if (alignMatch) {
      info.alignment = alignMatch[1] as "left" | "center" | "right" | "both"
    }

    // フォントサイズを抽出
    const fontSizeMatch = paraTxt.match(/<w:sz w:val="(\d+)"\/>/)
    if (fontSizeMatch) {
      info.fontSize = parseInt(fontSizeMatch[1]) / 2 // Wordは半ポイント単位
    }

    alignments.push(info)
  }

  return alignments
}

/**
 * mammothで生成されたHTMLに配置情報を適用する
 */
export function applyAlignments(
  html: string,
  alignments: AlignmentInfo[]
): string {
  // HTMLの段落を抽出
  const paragraphs: string[] = []
  const paraRegex = /<(p|ol|ul|h[1-6])[^>]*>[\s\S]*?<\/\1>/g
  let match
  let lastIndex = 0

  while ((match = paraRegex.exec(html)) !== null) {
    paragraphs.push(match[0])
    lastIndex = paraRegex.lastIndex
  }

  // 配置情報を適用
  let alignmentIndex = 0
  let result = html

  for (const para of paragraphs) {
    // 段落内のテキストを抽出
    const textOnly = para.replace(/<[^>]+>/g, "").trim()

    // 対応する配置情報を見つける
    while (
      alignmentIndex < alignments.length &&
      !textOnly.includes(alignments[alignmentIndex].text.substring(0, 20))
    ) {
      alignmentIndex++
    }

    if (alignmentIndex < alignments.length) {
      const alignment = alignments[alignmentIndex].alignment
      const fontSize = alignments[alignmentIndex].fontSize

      if (alignment || fontSize) {
        let newPara = para

        // class属性を追加
        const classes: string[] = []
        if (alignment === "center") classes.push("text-center")
        if (alignment === "right") classes.push("text-right")
        if (fontSize && fontSize === 16) classes.push("title-16")
        else if (fontSize && fontSize >= 18) classes.push("title")

        if (classes.length > 0) {
          // 既存のclass属性に追加、または新規作成
          if (para.includes(' class="')) {
            newPara = para.replace(
              / class="([^"]*)"/,
              ` class="$1 ${classes.join(" ")}"`
            )
          } else {
            newPara = para.replace(
              /^<(\w+)/,
              `<$1 class="${classes.join(" ")}"`
            )
          }
        }

        result = result.replace(para, newPara)
      }

      alignmentIndex++
    }
  }

  return result
}
