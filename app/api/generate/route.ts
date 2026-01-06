import { NextRequest, NextResponse } from "next/server"
import { logAction, logError } from "@/lib/logger"
import { processTemplate } from "@/lib/template-processor"
import { generatePDF } from "@/lib/pdf-generator"
import { v4 as uuidv4 } from "uuid"

// テンプレートファイルのパス
const CONTRACT_TEMPLATE_PATH = "templates/contract_template.docx"
const INVOICE_TEMPLATE_PATH = "templates/invoice_template.docx"

// PDF生成
export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8)

  try {
    const body = await request.json()
    const { companyName, address, representativeName } = body

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

    logAction(requestId, "system", "anonymous", "PDF生成", `開始 - 会社名: ${companyName}`)

    const templateData = {
      companyName,
      address,
      representativeName,
    }

    // 契約書PDFを生成
    logAction(requestId, "system", "anonymous", "契約書PDF生成", "開始")
    const contractDocxBuffer = await processTemplate(CONTRACT_TEMPLATE_PATH, templateData)
    const contractFileId = `contract_${uuidv4().slice(0, 8)}`
    const { pdfUrl: contractPdfUrl } = await generatePDF(contractDocxBuffer, contractFileId)
    logAction(requestId, "system", "anonymous", "契約書PDF生成", "成功")

    // 送り状PDFを生成
    logAction(requestId, "system", "anonymous", "送り状PDF生成", "開始")
    const invoiceDocxBuffer = await processTemplate(INVOICE_TEMPLATE_PATH, templateData)
    const invoiceFileId = `invoice_${uuidv4().slice(0, 8)}`
    const { pdfUrl: invoicePdfUrl } = await generatePDF(invoiceDocxBuffer, invoiceFileId)
    logAction(requestId, "system", "anonymous", "送り状PDF生成", "成功")

    logAction(requestId, "system", "anonymous", "PDF生成", "完了")

    return NextResponse.json({
      success: true,
      contractPdfUrl,
      invoicePdfUrl,
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
