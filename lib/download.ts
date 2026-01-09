/**
 * ファイルダウンロード用ユーティリティ
 */

/**
 * URLからファイルをダウンロード
 * @param url ダウンロードするファイルのURL
 * @param filename 保存時のファイル名
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 契約書PDFをダウンロード
 * @param url PDFのURL
 * @param companyName 会社名
 */
export function downloadContractPdf(url: string, companyName: string): void {
  downloadFile(url, `人材紹介契約書(${companyName}様).pdf`)
}

/**
 * 契約書Wordをダウンロード
 * @param url WordファイルのURL
 * @param companyName 会社名
 */
export function downloadContractDocx(url: string, companyName: string): void {
  downloadFile(url, `人材紹介契約書(${companyName}様).docx`)
}

/**
 * 送付状PDFをダウンロード
 * @param url PDFのURL
 * @param companyName 会社名
 */
export function downloadInvoicePdf(url: string, companyName: string): void {
  downloadFile(url, `送付状(${companyName}様).pdf`)
}

/**
 * 送付状Wordをダウンロード
 * @param url WordファイルのURL
 * @param companyName 会社名
 */
export function downloadInvoiceDocx(url: string, companyName: string): void {
  downloadFile(url, `送付状(${companyName}様).docx`)
}
