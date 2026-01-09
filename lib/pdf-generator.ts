import * as fs from "fs"
import * as path from "path"
import { v4 as uuidv4 } from "uuid"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

const GENERATED_DIR = path.join(process.cwd(), "public", "generated")
const TEMP_DIR = path.join(process.cwd(), "temp")

// LibreOfficeのパスを検出
function getLibreOfficePath(): string {
  const possiblePaths = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "/usr/bin/soffice",
    "/usr/local/bin/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  throw new Error("LibreOffice not found. Please install LibreOffice.")
}

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
  // ディレクトリを作成
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true })
  }
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  // ファイル名を生成
  const fileId = fileName || uuidv4()
  const tempDocxPath = path.join(TEMP_DIR, `${fileId}.docx`)
  const pdfFileName = `${fileId}.pdf`
  const pdfPath = path.join(GENERATED_DIR, pdfFileName)

  try {
    // 一時的にDOCXファイルを保存
    fs.writeFileSync(tempDocxPath, docxBuffer)

    // LibreOfficeのパスを取得
    const libreOfficePath = getLibreOfficePath()

    // LibreOfficeでPDFに変換
    // --headless: GUIなしで実行
    // --convert-to pdf:writer_pdf_Export: PDFエクスポートフィルターを使用
    // --outdir: 出力ディレクトリ
    // フィルターオプション:
    //   SelectPdfVersion=1: PDF 1.7
    //   EmbedStandardFonts=true: 標準フォントを埋め込む
    //   EmbedComplexScriptFonts=true: 日本語などのCJKフォントを埋め込む
    //   UseTaggedPDF=false: タグ付きPDFを無効化（互換性向上）
    const filterOptions = "SelectPdfVersion=1:EmbedStandardFonts=true:EmbedComplexScriptFonts=true:UseTaggedPDF=false"
    await execFileAsync(libreOfficePath, [
      "--headless",
      "--convert-to",
      `pdf:writer_pdf_Export:${filterOptions}`,
      "--outdir",
      GENERATED_DIR,
      tempDocxPath,
    ])

    // 一時ファイルを削除
    if (fs.existsSync(tempDocxPath)) {
      fs.unlinkSync(tempDocxPath)
    }

    // PDFファイルが生成されたか確認
    if (!fs.existsSync(pdfPath)) {
      throw new Error("PDF file was not generated")
    }

    return {
      pdfUrl: `/api/files/${encodeURIComponent(pdfFileName)}`,
      pdfPath,
    }
  } catch (error) {
    // エラー時は一時ファイルを削除
    if (fs.existsSync(tempDocxPath)) {
      fs.unlinkSync(tempDocxPath)
    }

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
  const tempId = uuidv4()
  const { pdfPath } = await generatePDF(docxBuffer, tempId)

  try {
    // PDFを読み込んでBase64エンコード
    const pdfBuffer = fs.readFileSync(pdfPath)
    return pdfBuffer.toString("base64")
  } finally {
    // 一時PDFを削除
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath)
    }
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
