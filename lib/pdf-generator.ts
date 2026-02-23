import { execFile } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const execFileAsync = promisify(execFile)

/**
 * LibreOffice のパスを検出する
 */
function findLibreOfficePath(): string {
  const candidates = [
    "/usr/bin/libreoffice",
    "/usr/bin/soffice",
    "/nix/var/nix/profiles/default/bin/libreoffice",
    "/nix/var/nix/profiles/default/bin/soffice",
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  // PATH から探す
  return "libreoffice"
}

/**
 * Word バッファを PDF バッファに変換する（DB保存用）
 * LibreOffice headless を使用 — 元の Word レイアウトを完全に再現
 */
export async function generatePDFBuffer(docxBuffer: Buffer): Promise<Buffer> {
  // 一時ディレクトリを作成
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docx2pdf-"))
  const docxPath = path.join(tmpDir, "input.docx")
  const pdfPath = path.join(tmpDir, "input.pdf")

  try {
    // docx を一時ファイルに書き込み
    fs.writeFileSync(docxPath, docxBuffer)

    // LibreOffice headless で PDF に変換
    const soffice = findLibreOfficePath()
    await execFileAsync(soffice, [
      "--headless",
      "--norestore",
      "--convert-to", "pdf",
      "--outdir", tmpDir,
      docxPath,
    ], {
      timeout: 60000, // 60秒タイムアウト
      env: {
        ...process.env,
        HOME: tmpDir, // LibreOffice のプロファイルディレクトリ競合を回避
      },
    })

    // 生成された PDF を読み込み
    if (!fs.existsSync(pdfPath)) {
      throw new Error("LibreOffice による PDF 変換に失敗しました")
    }

    return fs.readFileSync(pdfPath)
  } finally {
    // 一時ファイルをクリーンアップ
    try {
      if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath)
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath)
      fs.rmdirSync(tmpDir)
    } catch {
      // クリーンアップ失敗は無視
    }
  }
}

/**
 * プレビュー用：PDF の Base64 文字列を返す
 */
export async function generatePDFPreview(docxBuffer: Buffer): Promise<string> {
  const pdfBuffer = await generatePDFBuffer(docxBuffer)
  return pdfBuffer.toString("base64")
}
