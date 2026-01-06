import * as fs from "fs"
import * as path from "path"
import puppeteer from "puppeteer"
import mammoth from "mammoth"
import { v4 as uuidv4 } from "uuid"

const GENERATED_DIR = path.join(process.cwd(), "public", "generated")

/**
 * WordファイルのBufferをPDFに変換する
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

  // WordをHTMLに変換
  const result = await mammoth.convertToHtml({ buffer: docxBuffer })
  const htmlContent = result.value

  // HTMLをPDFに変換
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  try {
    const page = await browser.newPage()

    // HTML全体を構築（スタイル付き）
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
          }
          h1, h2, h3 {
            color: #222;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
          }
          p {
            margin: 0.5em 0;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
    })

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    })

    return {
      pdfUrl: `/generated/${pdfFileName}`,
      pdfPath,
    }
  } finally {
    await browser.close()
  }
}

/**
 * 一時的なPDFを生成する（プレビュー用）
 * @param docxBuffer WordファイルのBuffer
 * @returns PDFのBase64エンコードされた文字列
 */
export async function generatePDFPreview(docxBuffer: Buffer): Promise<string> {
  // WordをHTMLに変換
  const result = await mammoth.convertToHtml({ buffer: docxBuffer })
  const htmlContent = result.value

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  try {
    const page = await browser.newPage()

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
          }
          h1, h2, h3 {
            color: #222;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
          }
          p {
            margin: 0.5em 0;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
    })

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    })

    // Base64エンコード
    return Buffer.from(pdfBuffer).toString("base64")
  } finally {
    await browser.close()
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
