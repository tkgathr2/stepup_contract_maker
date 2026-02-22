import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import mammoth from "mammoth"
import { execSync } from "child_process"

/**
 * Chromium が必要とする共有ライブラリのパスを動的に検出し、
 * LD_LIBRARY_PATH に追加する（nixpacks 環境では標準パスにないため）
 */
function ensureLibraryPaths(): void {
  if (process.env.__CHROMIUM_LDPATH_SET === "1") return

  const markers = ["libnspr4.so", "libnss3.so", "libgbm.so.1"]
  const dirs = new Set<string>()

  for (const lib of markers) {
    try {
      const result = execSync(`find /nix /usr /lib -name '${lib}' 2>/dev/null || true`, {
        encoding: "utf-8",
        timeout: 5000,
      }).trim()
      for (const line of result.split("\n")) {
        if (line) {
          const dir = line.substring(0, line.lastIndexOf("/"))
          if (dir) dirs.add(dir)
        }
      }
    } catch {
      // ignore
    }
  }

  if (dirs.size > 0) {
    const existing = process.env.LD_LIBRARY_PATH || ""
    const newPath = [...dirs, ...existing.split(":").filter(Boolean)].join(":")
    process.env.LD_LIBRARY_PATH = newPath
    console.log(`[RAKURAKU] LD_LIBRARY_PATH set to: ${newPath}`)
  }

  process.env.__CHROMIUM_LDPATH_SET = "1"
}

// @sparticuz/chromium はコンテナ環境向けに最適化された Chromium バイナリを同梱
async function getPuppeteerLaunchOptions() {
  ensureLibraryPaths()
  return {
    headless: true as const,
    executablePath: await chromium.executablePath(),
    args: chromium.args,
  }
}

const PDF_STYLE = `
  @page { size: A4; margin: 20mm; }
  body {
    font-family: "Noto Sans CJK JP", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
    font-size: 12pt; line-height: 1.6; color: #333;
  }
  h1, h2, h3 { color: #222; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 8px; }
  p { margin: 0.5em 0; }
`

function buildHtml(htmlContent: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><style>${PDF_STYLE}</style></head>
<body>${htmlContent}</body>
</html>`
}

/**
 * Word バッファを PDF バッファに変換する（DB保存用）
 */
export async function generatePDFBuffer(docxBuffer: Buffer): Promise<Buffer> {
  const result = await mammoth.convertToHtml({ buffer: docxBuffer })
  const fullHtml = buildHtml(result.value)

  const launchOptions = await getPuppeteerLaunchOptions()
  const browser = await puppeteer.launch(launchOptions)
  try {
    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: "networkidle0" })
    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    })
    return Buffer.from(pdfUint8)
  } finally {
    await browser.close()
  }
}

/**
 * プレビュー用：PDF の Base64 文字列を返す
 */
export async function generatePDFPreview(docxBuffer: Buffer): Promise<string> {
  const pdfBuffer = await generatePDFBuffer(docxBuffer)
  return pdfBuffer.toString("base64")
}
