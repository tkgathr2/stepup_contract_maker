import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction, logError } from "@/lib/logger"
import { processTemplate } from "@/lib/template-processor"
import { generatePDFBuffer } from "@/lib/pdf-generator"
import { ErrorCode, sendError, handleInternalError, captureInternalError } from "@/lib/api-error"

interface CompanyData {
  companyName: string
  address: string
  representativeName: string
}

interface GeneratedPDF {
  pdfUrl: string
  companyName: string
  historyId: string
}

// 一括PDF生成
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return sendError(401, ErrorCode.UNAUTHORIZED, "認証が必要です")
  }

  const userId = session.user.id
  const email = session.user.email || "unknown"
  const name = session.user.name || "unknown"

  try {
    const body = await request.json()
    const { templateId, companies } = body as {
      templateId: string
      companies: CompanyData[]
    }

    // バリデーション
    if (!templateId || typeof templateId !== "string") {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "templateId",
        reason: "required",
      })
    }

    if (!Array.isArray(companies) || companies.length === 0) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "companies",
        reason: "required",
      })
    }

    // 各会社情報のバリデーション
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i]
      if (!company.companyName || company.companyName.length > 100) {
        return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
          index: i,
          field: "companyName",
        })
      }
      if (!company.address || company.address.length > 500) {
        return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
          index: i,
          field: "address",
        })
      }
      if (!company.representativeName || company.representativeName.length > 100) {
        return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
          index: i,
          field: "representativeName",
        })
      }
    }

    // テンプレートを取得
    const template = await db.template.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return sendError(404, ErrorCode.NOT_FOUND, "テンプレートが見つかりません")
    }

    logAction(
      userId,
      email,
      name,
      "一括PDF生成",
      `開始 - ${companies.length}件`
    )

    // 各会社に対してPDFを生成（直列処理：Chromiumリソース節約）
    const results: { success: boolean; pdfUrl?: string; companyName: string; historyId?: string; error?: string }[] = []

    for (let index = 0; index < companies.length; index++) {
      const company = companies[index]
      try {
        // テンプレートにデータを埋め込む
        const docxBuffer = await processTemplate(template, {
          companyName: company.companyName,
          address: company.address,
          representativeName: company.representativeName,
        })

        // PDFを生成（バッファとしてDBに保存）
        const pdfBuffer = await generatePDFBuffer(docxBuffer)

        // 履歴を保存（PDF実体をDBに格納）
        const history = await db.generationHistory.create({
          data: {
            userId,
            templateId,
            companyName: company.companyName,
            address: company.address,
            representativeName: company.representativeName,
            pdfPath: `/api/pdf/PLACEHOLDER`,
            pdfData: pdfBuffer,
          },
        })

        await db.generationHistory.update({
          where: { id: history.id },
          data: { pdfPath: `/api/pdf/${history.id}` },
        })

        logAction(
          userId,
          email,
          name,
          "一括PDF生成",
          `成功 (${index + 1}/${companies.length}) - 会社名: ${company.companyName}`
        )

        results.push({
          success: true,
          pdfUrl: `/api/pdf/${history.id}`,
          companyName: company.companyName,
          historyId: history.id,
        })
      } catch (error) {
        logError(userId, email, name, error as Error)
        captureInternalError(error, "generate/batch:item")
        results.push({
          success: false,
          companyName: company.companyName,
          error: (error as Error).message,
        })
      }
    }

    // 成功したものだけを抽出
    const successfulPdfs: GeneratedPDF[] = results
      .filter((r) => r.success)
      .map((r) => ({
        pdfUrl: r.pdfUrl!,
        companyName: r.companyName,
        historyId: r.historyId!,
      }))

    // 失敗したものがあれば警告
    const failedCount = results.filter((r) => !r.success).length
    if (failedCount > 0) {
      logAction(
        userId,
        email,
        name,
        "一括PDF生成",
        `一部失敗 - 成功: ${successfulPdfs.length}件, 失敗: ${failedCount}件`
      )
    } else {
      logAction(
        userId,
        email,
        name,
        "一括PDF生成",
        `完了 - 全${successfulPdfs.length}件成功`
      )
    }

    return NextResponse.json({
      success: true,
      count: successfulPdfs.length,
      pdfs: successfulPdfs,
      failedCount,
    })
  } catch (error) {
    logError(userId, email, name, error as Error)
    return handleInternalError(error, "generate/batch")
  }
}
