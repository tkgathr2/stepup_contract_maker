import { NextRequest, NextResponse } from "next/server"
import { logAction, logError } from "@/lib/logger"
import { processTemplate } from "@/lib/template-processor"
import { generatePDF } from "@/lib/pdf-generator"
import { saveDocxFile } from "@/lib/docx-generator"
import { lookupPostalCode } from "@/lib/postal-code-lookup"
import { v4 as uuidv4 } from "uuid"

// テンプレートファイルのパス
const CONTRACT_TEMPLATE_PATH = "templates/contract_template.docx"
const INVOICE_TEMPLATE_PATH = "templates/invoice_template.docx"

// PDF生成
export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8)

  try {
    const body = await request.json()
    let { companyName, address, representativeName, postalCode } = body

    // バリデーション
    if (!companyName || typeof companyName !== "string") {
      return NextResponse.json(
        { error: "会社名は必須です" },
        { status: 400 }
      )
    }
    if (companyName.length > 100) {
      return NextResponse.json(
        { error: "会社名は100文字以内で入力してください" },
        { status: 400 }
      )
    }

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "住所は必須です" },
        { status: 400 }
      )
    }
    if (address.length > 500) {
      return NextResponse.json(
        { error: "住所は500文字以内で入力してください" },
        { status: 400 }
      )
    }

    if (!representativeName || typeof representativeName !== "string") {
      return NextResponse.json(
        { error: "代表者名は必須です" },
        { status: 400 }
      )
    }
    if (representativeName.length > 100) {
      return NextResponse.json(
        { error: "代表者名は100文字以内で入力してください" },
        { status: 400 }
      )
    }

    // 郵便番号が送信されていない場合、住所から自動検索
    if (!postalCode || postalCode.trim() === "") {
      if (address && address.trim() !== "") {
        const postalCodeResult = await lookupPostalCode(address)
        if (postalCodeResult) {
          postalCode = postalCodeResult
        } else {
          postalCode = ""
        }
      } else {
        postalCode = ""
      }
    }

    logAction(requestId, "system", "anonymous", "書類生成", `開始 - 会社名: ${companyName}`)

    // 西暦から令和への変換関数
    function toReiwaDate(date: Date): string {
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()

      // 令和の開始：2019年5月1日
      let reiwaYear = year - 2018
      if (year === 2019 && month < 5) {
        // 2019年1-4月は平成31年（ここでは令和1年として扱う）
        reiwaYear = 1
      }

      return `令和${reiwaYear}年${month}月${day}日`
    }

    // 今日の日付を生成（令和○年○月○日形式）
    const now = new Date()
    const currentDate = toReiwaDate(now)

    // 郵便番号に「〒」を付ける（postalCodeが空でない場合のみ）
    const formattedPostalCode = postalCode ? `〒${postalCode}` : ""

    const templateData = {
      companyName,
      address,
      representativeName,
      postalCode: formattedPostalCode,
      currentDate,
    }

    // 契約書を生成（PDFとWord）
    const contractDocxBuffer = await processTemplate(CONTRACT_TEMPLATE_PATH, templateData)
    const contractFileId = `人材紹介契約書(${companyName}様)`

    // PDF生成
    const { pdfUrl: contractPdfUrl } = await generatePDF(contractDocxBuffer, contractFileId)

    // Word生成
    const { docxUrl: contractDocxUrl } = await saveDocxFile(contractDocxBuffer, contractFileId)

    // 送り状を生成（PDFとWord）
    const invoiceDocxBuffer = await processTemplate(INVOICE_TEMPLATE_PATH, templateData)
    const invoiceFileId = `送付状(${companyName}様)`

    // PDF生成
    const { pdfUrl: invoicePdfUrl } = await generatePDF(invoiceDocxBuffer, invoiceFileId)

    // Word生成
    const { docxUrl: invoiceDocxUrl } = await saveDocxFile(invoiceDocxBuffer, invoiceFileId)

    logAction(requestId, "system", "anonymous", "書類生成", "完了")

    return NextResponse.json({
      success: true,
      contractPdfUrl,
      contractDocxUrl,
      invoicePdfUrl,
      invoiceDocxUrl,
      postalCode: formattedPostalCode,
    })
  } catch (error) {
    logError(requestId, "system", "anonymous", error as Error)
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "PDFの生成に失敗しました" },
      { status: 500 }
    )
  }
}
