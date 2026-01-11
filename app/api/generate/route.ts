import { NextRequest, NextResponse } from "next/server"
import { logAction, logError } from "@/lib/logger"
import { processTemplate } from "@/lib/template-processor"
import { generatePDF } from "@/lib/pdf-generator"
import { saveDocxFile } from "@/lib/docx-generator"
import { lookupPostalCode } from "@/lib/postal-code-lookup"
import { auth } from "@/lib/auth"
import { sanitizeInput } from "@/lib/sanitize"
import { v4 as uuidv4 } from "uuid"

// テンプレートファイルのパス
const CONTRACT_TEMPLATE_PATH = "templates/contract_template.docx"
const INVOICE_TEMPLATE_PATH = "templates/invoice_template.docx"

// PDF生成
export async function POST(request: NextRequest) {
  const requestId = uuidv4().slice(0, 8)

  // 認証チェック
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    let { companyName, address, representativeName, postalCode } = body

    // バリデーション（sanitizeInputを使用して統一的に処理）
    try {
      companyName = sanitizeInput(companyName || "", 100)
    } catch {
      return NextResponse.json(
        { error: "会社名は必須です（100文字以内）" },
        { status: 400 }
      )
    }

    try {
      address = sanitizeInput(address || "", 500)
    } catch {
      return NextResponse.json(
        { error: "住所は必須です（500文字以内）" },
        { status: 400 }
      )
    }

    try {
      representativeName = sanitizeInput(representativeName || "", 100)
    } catch {
      return NextResponse.json(
        { error: "代表者名は必須です（100文字以内）" },
        { status: 400 }
      )
    }

    // 郵便番号が送信されていない場合、住所から自動検索
    if (!postalCode || postalCode.trim() === "") {
      if (address && address.trim() !== "") {
        try {
          console.log(`[PostalCode] Looking up postal code for address: ${address}`)
          const postalCodeResult = await lookupPostalCode(address)
          console.log(`[PostalCode] Lookup result: ${postalCodeResult}`)
          if (postalCodeResult) {
            postalCode = postalCodeResult
          } else {
            postalCode = ""
          }
        } catch (lookupError) {
          console.error(`[PostalCode] Lookup error:`, lookupError)
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

    // 詳細なエラー情報をログに記録
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("[Generate] Error generating PDF:", {
      requestId,
      error: errorMessage,
      stack: errorStack,
    })

    // 開発環境では詳細なエラーを返す
    const isDevelopment = process.env.NODE_ENV === "development"
    return NextResponse.json(
      {
        error: "PDFの生成に失敗しました",
        ...(isDevelopment && {
          details: errorMessage,
          stack: errorStack,
        }),
      },
      { status: 500 }
    )
  }
}
