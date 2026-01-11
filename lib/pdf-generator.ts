import * as fs from "fs"
import * as path from "path"
import { v4 as uuidv4 } from "uuid"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

const GENERATED_DIR = path.join(process.cwd(), "public", "generated")
const TEMP_DIR = path.join(process.cwd(), "temp")

// PDFしおり削除ツールのパスを取得
function getOutlineRemoverPath(): { pythonPath: string; scriptPath: string } | null {
  const pythonPath = "C:\\Users\\takag\\00_dev\\pdf_しおり削除ツール\\venv\\Scripts\\python.exe"
  const scriptPath = "C:\\Users\\takag\\00_dev\\pdf_しおり削除ツール\\remove_outline.py"

  if (fs.existsSync(pythonPath) && fs.existsSync(scriptPath)) {
    return { pythonPath, scriptPath }
  }

  console.log("[PDF] しおり削除ツールが見つかりません。スキップします。")
  return null
}

// PDFからしおりを削除する
async function removeOutlineFromPDF(pdfPath: string): Promise<void> {
  const remover = getOutlineRemoverPath()
  if (!remover) {
    return
  }

  try {
    console.log(`[PDF] しおりを削除中: ${pdfPath}`)
    const { stdout, stderr } = await execFileAsync(remover.pythonPath, [
      remover.scriptPath,
      "--in",
      pdfPath,
      "--out",
      pdfPath,
    ])

    if (stdout) console.log(`[PDF] しおり削除 stdout: ${stdout}`)
    if (stderr) console.log(`[PDF] しおり削除 stderr: ${stderr}`)
    console.log(`[PDF] しおり削除完了: ${pdfPath}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[PDF] しおり削除に失敗しました（PDF生成は成功）: ${errorMessage}`)
  }
}

// LibreOfficeのパスを検出
function getLibreOfficePath(): string {
  const possiblePaths = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "/usr/bin/soffice",
    "/usr/local/bin/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ]

  console.log("[PDF] Searching for LibreOffice in:", possiblePaths)

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`[PDF] Found LibreOffice at: ${p}`)
      return p
    }
  }

  const errorMessage = `LibreOffice not found. Please install LibreOffice. Checked paths: ${possiblePaths.join(", ")}`
  console.error("[PDF]", errorMessage)
  throw new Error(errorMessage)
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

  // ファイル名をサニタイズ（特殊文字を除去またはエスケープ）
  const rawFileId = fileName || uuidv4()
  const sanitizedFileId = rawFileId
    .replace(/[<>:"/\\|?*]/g, "_")  // ファイル名に使用できない文字を置換
    .replace(/[（）()]/g, "_")      // 括弧を置換
    .replace(/\s+/g, "_")           // スペースをアンダースコアに
    .substring(0, 100)              // 長さ制限

  console.log(`[PDF] Raw file ID: ${rawFileId}`)
  console.log(`[PDF] Sanitized file ID: ${sanitizedFileId}`)

  const tempDocxPath = path.join(TEMP_DIR, `${sanitizedFileId}.docx`)
  const pdfFileName = `${sanitizedFileId}.pdf`
  const pdfPath = path.join(GENERATED_DIR, pdfFileName)

  try {
    // 一時的にDOCXファイルを保存
    fs.writeFileSync(tempDocxPath, docxBuffer)
    console.log(`[PDF] Temp DOCX saved: ${tempDocxPath}`)
    console.log(`[PDF] DOCX buffer size: ${docxBuffer.length} bytes`)

    // LibreOfficeのパスを取得
    const libreOfficePath = getLibreOfficePath()
    console.log(`[PDF] LibreOffice path: ${libreOfficePath}`)

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
    const libreOfficeArgs = [
      "--headless",
      "--convert-to",
      `pdf:writer_pdf_Export:${filterOptions}`,
      "--outdir",
      GENERATED_DIR,
      tempDocxPath,
    ]
    console.log(`[PDF] Executing LibreOffice with args:`, libreOfficeArgs)

    const { stdout, stderr } = await execFileAsync(libreOfficePath, libreOfficeArgs)
    if (stdout) console.log(`[PDF] LibreOffice stdout: ${stdout}`)
    if (stderr) console.log(`[PDF] LibreOffice stderr: ${stderr}`)

    // 一時ファイルを削除
    if (fs.existsSync(tempDocxPath)) {
      fs.unlinkSync(tempDocxPath)
      console.log(`[PDF] Temp DOCX deleted: ${tempDocxPath}`)
    }

    // PDFファイルが生成されたか確認
    console.log(`[PDF] Checking if PDF exists: ${pdfPath}`)
    if (!fs.existsSync(pdfPath)) {
      // 出力ディレクトリの内容を確認
      const generatedFiles = fs.readdirSync(GENERATED_DIR)
      console.error(`[PDF] PDF file not found. Generated directory contents:`, generatedFiles)
      throw new Error(`PDF file was not generated at expected path: ${pdfPath}`)
    }

    const pdfSize = fs.statSync(pdfPath).size
    console.log(`[PDF] PDF generated successfully: ${pdfPath} (${pdfSize} bytes)`)

    // PDFからしおりを削除
    await removeOutlineFromPDF(pdfPath)

    return {
      pdfUrl: `/api/files/${encodeURIComponent(pdfFileName)}`,
      pdfPath,
    }
  } catch (error) {
    // エラー時は一時ファイルを削除
    if (fs.existsSync(tempDocxPath)) {
      try {
        fs.unlinkSync(tempDocxPath)
        console.log(`[PDF] Temp DOCX deleted after error: ${tempDocxPath}`)
      } catch (unlinkError) {
        console.error(`[PDF] Failed to delete temp file: ${unlinkError}`)
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error("[PDF] PDF generation failed:", {
      tempDocxPath,
      pdfPath,
      sanitizedFileId,
      error: errorMessage,
      stack: errorStack,
    })

    throw new Error(
      `PDF generation failed: ${errorMessage}`
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
