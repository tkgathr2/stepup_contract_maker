/**
 * Word バッファを PDF バッファに変換する（DB保存用）
 * Gotenberg API を使用 — LibreOffice ベースで元 docx レイアウトを完全保持
 * 環境変数 GOTENBERG_URL でGotenbergサービスのURLを指定
 */
export async function generatePDFBuffer(docxBuffer: Buffer): Promise<Buffer> {
  const gotenbergUrl = process.env.GOTENBERG_URL
  if (!gotenbergUrl) {
    throw new Error("GOTENBERG_URL 環境変数が設定されていません")
  }

  // Gotenberg の LibreOffice 変換エンドポイント
  const url = `${gotenbergUrl}/forms/libreoffice/convert`

  // multipart/form-data を構築
  const boundary = "----GotenbergBoundary" + Date.now()
  const filename = "document.docx"

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="files"; filename="${filename}"\r\n` +
    `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`
  )
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([header, docxBuffer, footer])

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gotenberg PDF変換エラー (${response.status}): ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * プレビュー用：PDF の Base64 文字列を返す
 */
export async function generatePDFPreview(docxBuffer: Buffer): Promise<string> {
  const pdfBuffer = await generatePDFBuffer(docxBuffer)
  return pdfBuffer.toString("base64")
}
