import { promisify } from "util"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const libre = require("libreoffice-convert")

const convertAsync = promisify(libre.convert)

/**
 * Word バッファを PDF バッファに変換する（DB保存用）
 * LibreOffice を使用 — 元の docx レイアウトを完全に保持
 */
export async function generatePDFBuffer(docxBuffer: Buffer): Promise<Buffer> {
  const pdfBuf = await convertAsync(docxBuffer, ".pdf", undefined)
  return Buffer.from(pdfBuf)
}

/**
 * プレビュー用：PDF の Base64 文字列を返す
 */
export async function generatePDFPreview(docxBuffer: Buffer): Promise<string> {
  const pdfBuffer = await generatePDFBuffer(docxBuffer)
  return pdfBuffer.toString("base64")
}
