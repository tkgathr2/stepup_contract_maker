import { execFile, execSync } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const execFileAsync = promisify(execFile)

/**
 * LibreOffice のパスを検出する
 */
function findLibreOfficePath(): string {
  // 既知のパス候補
  const candidates = [
    "/usr/bin/libreoffice",
    "/usr/bin/soffice",
    "/nix/var/nix/profiles/default/bin/libreoffice",
    "/nix/var/nix/profiles/default/bin/soffice",
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }

  // which コマンドで探す
  try {
    const result = execSync("which libreoffice 2>/dev/null || which soffice 2>/dev/null", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim()
    if (result) return result
  } catch {
    // ignore
  }

  // Nix store からグロブ的に探す
  try {
    const result = execSync("find /nix/store -maxdepth 3 -name 'soffice' -type f 2>/dev/null | head -1", {
      encoding: "utf-8",
      timeout: 10000,
    }).trim()
    if (result) return result
  } catch {
    // ignore
  }

  // PATH から探す（フォールバック）
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
    console.log(`[pdf-generator] LibreOffice path: ${soffice}`)

    try {
      const { stdout, stderr } = await execFileAsync(soffice, [
        "--headless",
        "--norestore",
        "--convert-to", "pdf",
        "--outdir", tmpDir,
        docxPath,
      ], {
        timeout: 120000, // 120秒タイムアウト（LibreOffice初回起動は遅い場合がある）
        env: {
          ...process.env,
          HOME: tmpDir, // LibreOffice のプロファイルディレクトリ競合を回避
        },
      })
      if (stdout) console.log(`[pdf-generator] stdout: ${stdout}`)
      if (stderr) console.log(`[pdf-generator] stderr: ${stderr}`)
    } catch (execError) {
      const err = execError as Error & { stdout?: string; stderr?: string; code?: string }
      console.error(`[pdf-generator] LibreOffice exec error:`, err.message)
      if (err.stdout) console.error(`[pdf-generator] stdout: ${err.stdout}`)
      if (err.stderr) console.error(`[pdf-generator] stderr: ${err.stderr}`)
      throw new Error(`LibreOffice PDF変換に失敗しました: ${err.message}`)
    }

    // 生成された PDF を読み込み
    if (!fs.existsSync(pdfPath)) {
      // tmpDir の中身を確認
      const files = fs.readdirSync(tmpDir)
      console.error(`[pdf-generator] PDF not found at ${pdfPath}. Files in tmpDir: ${files.join(", ")}`)
      throw new Error(`LibreOffice による PDF 変換に失敗しました（出力ファイルなし）`)
    }

    const pdfBuffer = fs.readFileSync(pdfPath)
    console.log(`[pdf-generator] PDF generated successfully: ${pdfBuffer.length} bytes`)
    return pdfBuffer
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
