import mammoth from "mammoth"
import path from "path"
import { JSDOM } from "jsdom"
import htmlToPdfmake from "html-to-pdfmake"
import PdfPrinter from "pdfmake/src/Printer"

/**
 * pdfmake 用フォント定義（日本語対応: Noto Sans JP）
 * public/fonts/NotoSansJP-Variable.ttf を使用
 */
function createPrinter(): PdfPrinter {
  const fontPath = path.join(process.cwd(), "public", "fonts")
  const fonts = {
    NotoSansJP: {
      normal: path.join(fontPath, "NotoSansJP-Variable.ttf"),
      bold: path.join(fontPath, "NotoSansJP-Variable.ttf"),
      italics: path.join(fontPath, "NotoSansJP-Variable.ttf"),
      bolditalics: path.join(fontPath, "NotoSansJP-Variable.ttf"),
    },
  }
  return new PdfPrinter(fonts)
}

/**
 * Word バッファを PDF バッファに変換する（DB保存用）
 * pdfmake を使用 — Chromium 不要、純粋な JavaScript で動作
 */
export async function generatePDFBuffer(docxBuffer: Buffer): Promise<Buffer> {
  const result = await mammoth.convertToHtml({ buffer: docxBuffer })

  // HTML を pdfmake ドキュメント定義に変換
  const { window } = new JSDOM("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfContent = htmlToPdfmake(result.value, { window: window as any })

  const docDefinition = {
    content: pdfContent,
    defaultStyle: {
      font: "NotoSansJP",
      fontSize: 11,
      lineHeight: 1.5,
    },
    styles: {
      "html-h1": { fontSize: 22, bold: true, marginBottom: 8 },
      "html-h2": { fontSize: 18, bold: true, marginBottom: 6 },
      "html-h3": { fontSize: 14, bold: true, marginBottom: 4 },
      "html-p": { marginBottom: 4 },
      "html-table": { marginBottom: 8 },
      "html-th": { bold: true, fillColor: "#f0f0f0" },
    },
    pageSize: "A4" as const,
    pageMargins: [57, 57, 57, 57] as [number, number, number, number], // ~20mm
  }

  const printer = createPrinter()
  const pdfDoc = printer.createPdfKitDocument(docDefinition)

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = []
    pdfDoc.on("data", (chunk: Uint8Array) => chunks.push(chunk))
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
    pdfDoc.on("error", (err: Error) => reject(err))
    pdfDoc.end()
  })
}

/**
 * プレビュー用：PDF の Base64 文字列を返す
 */
export async function generatePDFPreview(docxBuffer: Buffer): Promise<string> {
  const pdfBuffer = await generatePDFBuffer(docxBuffer)
  return pdfBuffer.toString("base64")
}
