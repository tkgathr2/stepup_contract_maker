/* eslint-disable @typescript-eslint/no-require-imports */
import mammoth from "mammoth"
import * as path from "path"

// pdfmake の server-side Printer を動的に読み込み（型定義が不正確なため require を使用）
function createPrinter() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PdfPrinter = require("pdfmake/src/Printer")
  const fontsDir = path.join(
    path.dirname(require.resolve("pdfmake/package.json")),
    "build",
    "fonts",
    "Roboto"
  )
  return new PdfPrinter({
    Roboto: {
      normal: path.join(fontsDir, "Roboto-Regular.ttf"),
      bold: path.join(fontsDir, "Roboto-Medium.ttf"),
      italics: path.join(fontsDir, "Roboto-Italic.ttf"),
      bolditalics: path.join(fontsDir, "Roboto-MediumItalic.ttf"),
    },
  })
}

interface PdfElement {
  type: string
  content: string
  level?: number
}

/**
 * Word バッファを PDF バッファに変換する（純JavaScript実装）
 * mammoth で docx → HTML、pdfmake で HTML → PDF
 */
export async function generatePDFBuffer(docxBuffer: Buffer): Promise<Buffer> {
  // mammoth で docx を HTML に変換
  const result = await mammoth.convertToHtml({ buffer: docxBuffer })
  const html = result.value

  // HTML をパースして pdfmake 用コンテンツに変換
  const content = htmlToPdfContent(html)

  const printer = createPrinter()

  const docDefinition = {
    content,
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      lineHeight: 1.4,
    },
    styles: {
      heading1: { fontSize: 18, bold: true, margin: [0, 10, 0, 5] },
      heading2: { fontSize: 14, bold: true, margin: [0, 8, 0, 4] },
      heading3: { fontSize: 12, bold: true, margin: [0, 6, 0, 3] },
      paragraph: { margin: [0, 2, 0, 2] },
    },
    pageMargins: [40, 40, 40, 40] as [number, number, number, number],
  }

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition)
      const chunks: Buffer[] = []
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk))
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
      pdfDoc.on("error", reject)
      pdfDoc.end()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * HTML文字列を pdfmake Content 配列に変換する
 */
function htmlToPdfContent(html: string): Record<string, unknown>[] {
  const content: Record<string, unknown>[] = []
  const elements: PdfElement[] = []

  // 全要素を順序通りに抽出（mammothの出力はシンプルなHTML）
  const allTagRegex = /<(h[1-6]|p|li|table|tr|td|th)[^>]*>([\s\S]*?)<\/\1>/gi
  let elementMatch
  while ((elementMatch = allTagRegex.exec(html)) !== null) {
    const tag = elementMatch[1].toLowerCase()
    const innerHtml = elementMatch[2]
    const text = stripHtmlTags(innerHtml).trim()

    if (!text) continue

    if (tag.startsWith("h")) {
      const level = parseInt(tag[1])
      elements.push({ type: "heading", content: text, level })
    } else if (tag === "li") {
      elements.push({ type: "listItem", content: text })
    } else if (tag === "p") {
      elements.push({ type: "paragraph", content: text })
    } else if (tag === "td" || tag === "th") {
      elements.push({ type: "cell", content: text })
    }
  }

  // 要素が見つからない場合はHTML全体をテキストとして扱う
  if (elements.length === 0) {
    const plainText = stripHtmlTags(html).trim()
    if (plainText) {
      content.push({ text: plainText, style: "paragraph" })
    }
    return content
  }

  // 各要素をpdfmakeコンテンツに変換
  for (const el of elements) {
    switch (el.type) {
      case "heading":
        content.push({
          text: el.content,
          style: `heading${el.level || 1}`,
        })
        break
      case "listItem":
        content.push({
          text: `• ${el.content}`,
          style: "paragraph",
          margin: [10, 1, 0, 1],
        })
        break
      case "paragraph":
      default:
        content.push({
          text: el.content,
          style: "paragraph",
        })
    }
  }

  return content
}

/**
 * HTMLタグを除去してプレーンテキストを取得する
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/**
 * プレビュー用：PDF の Base64 文字列を返す
 */
export async function generatePDFPreview(docxBuffer: Buffer): Promise<string> {
  const pdfBuffer = await generatePDFBuffer(docxBuffer)
  return pdfBuffer.toString("base64")
}
