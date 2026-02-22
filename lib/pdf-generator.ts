import * as fs from "fs"
import { execSync } from "child_process"
import puppeteer from "puppeteer-core"
import mammoth from "mammoth"

// puppeteer-core はブラウザを同梱しないため、システムの Chromium パスを必ず指定する
function getChromiumPath(): string {
  // 1. 環境変数で明示指定されていればそれを使う
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH
  if (envPath && fs.existsSync(envPath)) return envPath

  // 2. 既知のパスを順にチェック
  const candidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }

  // 3. PATH 上の chromium を動的に探す（nixpacks の Nix パッケージ対応）
  const whichCommands = ["which chromium", "which chromium-browser", "which google-chrome-stable"]
  for (const cmd of whichCommands) {
    try {
      const result = execSync(cmd, { encoding: "utf-8" }).trim()
      if (result && fs.existsSync(result)) {
        console.log(`[RAKURAKU] Chromium found via '${cmd}': ${result}`)
        return result
      }
    } catch {
      // command not found — skip
    }
  }

  throw new Error(
    "Chromium が見つかりません。PUPPETEER_EXECUTABLE_PATH 環境変数を設定するか、システムに Chromium をインストールしてください。"
  )
}

function getPuppeteerLaunchOptions() {
  return {
    headless: true as const,
    executablePath: getChromiumPath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
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

  const browser = await puppeteer.launch(getPuppeteerLaunchOptions())
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
