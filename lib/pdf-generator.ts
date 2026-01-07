import * as fs from "fs"
import * as path from "path"
import { v4 as uuidv4 } from "uuid"
import libre from "libreoffice-convert"
import { promisify } from "util"

const libreConvert = promisify(libre.convert)

const GENERATED_DIR = path.join(process.cwd(), "public", "generated")

/**
 * WordファイルのBufferをPDFに変換する（LibreOfficeを使用）
 * @param docxBuffer WordファイルのBuffer
 * @param fileName 出力ファイル名（拡張子なし）
 * @returns 生成されたPDFのURL
 */
export async function generatePDF(
  docxBuffer: Buffer,
  fileName?: string
): Promise<{ pdfUrl: string; pdfPath: string }> {
  // 生成ディレクトリが存在しない場合は作成
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true })
  }

  // ファイル名を生成
  const fileId = fileName || uuidv4()
  const pdfFileName = `${fileId}.pdf`
  const pdfPath = path.join(GENERATED_DIR, pdfFileName)

  try {
    // LibreOfficeを使用してDOCXをPDFに直接変換
    const pdfBuffer = await libreConvert(docxBuffer, ".pdf", undefined)

    // PDFを保存
    fs.writeFileSync(pdfPath, pdfBuffer)

    return {
      pdfUrl: `/generated/${pdfFileName}`,
      pdfPath,
    }
  } catch (error) {
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * 一時的なPDFを生成する（プレビュー用）
 * @param docxBuffer WordファイルのBuffer
 * @returns PDFのBase64エンコードされた文字列
 */
export async function generatePDFPreview(docxBuffer: Buffer): Promise<string> {
  try {
    // LibreOfficeを使用してDOCXをPDFに直接変換
    const pdfBuffer = await libreConvert(docxBuffer, ".pdf", undefined)

    // Base64エンコード
    return pdfBuffer.toString("base64")
  } catch (error) {
    throw new Error(
      `PDF preview generation failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * PDFファイルを削除する
 * @param pdfUrl PDFのURL
 */
export async function deletePDF(pdfUrl: string): Promise<void> {
  const fileName = path.basename(pdfUrl)
  const pdfPath = path.join(GENERATED_DIR, fileName)

  if (fs.existsSync(pdfPath)) {
    fs.unlinkSync(pdfPath)
  }
}
