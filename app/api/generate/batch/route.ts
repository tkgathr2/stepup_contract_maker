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
  postalCode: string
  address: string
  representativeName: string
}

interface GeneratedPDF {
  pdfUrl: string
  companyName: string
  templateName: string
  templateType: string
  historyId: string
}

// 一括PDF生成（複数テンプレート対応）
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
    const { templateIds, companies } = body as {
      templateIds: string[]
      companies: CompanyData[]
    }

    // バリデーション
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "templateIds",
        reason: "required",
      })
    }

    if (!Array.isArray(companies) || companies.length === 0) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "companies",
        reason: "required",
      })
    }

    if (companies.length > 50) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "一括生成は50件までです", {
        field: "companies",
        reason: "too_many",
        maxCount: 50,
        actualCount: companies.length,
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
      if (!company.postalCode) {
        return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
          index: i,
          field: "postalCode",
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

    // 全テンプレートを取得
    const templates = await db.template.findMany({
      where: { id: { in: templateIds } },
    })

    if (templates.length === 0) {
      return sendError(404, ErrorCode.NOT_FOUND, "テンプレートが見つかりません")
    }

    const totalCount = companies.length * templates.length
    logAction(
      userId,
      email,
      name,
      "一括PDF生成",
      `開始 - ${companies.length}社 × ${templates.length}テンプレート = ${totalCount}件`
    )

    // 各会社×各テンプレートに対してPDFを生成（直列処理）
    const results: { success: boolean; pdfUrl?: string; companyName: string; templateName?: string; templateType?: string; historyId?: string; error?: string }[] = []

    for (let ci = 0; ci < companies.length; ci++) {
      const company = companies[ci]
      for (let ti = 0; ti < templates.length; ti++) {
        const template = templates[ti]
        try {
          // テンプレートにデータを埋め込む
          const templateData = {
            companyName: company.companyName,
            postalCode: company.postalCode,
            address: company.address,
            representativeName: company.representativeName,
          }
          // PDF変換用（レイアウト最適化あり）
          const docxBuffer = await processTemplate(template, templateData)
          // Word DL用（レイアウト最適化なし — keepNextの■マーカーを防止）
          const wordBuffer = await processTemplate(template, templateData, { skipLayoutOptimization: true })

          // PDFを生成（バッファとしてDBに保存）
          const pdfBuffer = await generatePDFBuffer(docxBuffer)

          // 履歴を保存（PDF実体とWord実体をDBに格納）
          const history = await db.generationHistory.create({
            data: {
              userId,
              templateId: template.id,
              companyName: company.companyName,
              address: company.address,
              representativeName: company.representativeName,
              pdfPath: `/api/pdf/PLACEHOLDER`,
              pdfData: pdfBuffer,
              docxData: wordBuffer,
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
            `成功 (${ci * templates.length + ti + 1}/${totalCount}) - ${company.companyName} × ${template.name}`
          )

          results.push({
            success: true,
            pdfUrl: `/api/pdf/${history.id}`,
            companyName: company.companyName,
            templateName: template.name,
            templateType: template.type,
            historyId: history.id,
          })
        } catch (error) {
          logError(userId, email, name, error as Error)
          captureInternalError(error, "generate/batch:item")
          results.push({
            success: false,
            companyName: company.companyName,
            templateName: template.name,
            templateType: template.type,
            error: (error as Error).message,
          })
        }
      }
    }

    // 成功したものだけを抽出
    const successfulPdfs: GeneratedPDF[] = results
      .filter((r) => r.success)
      .map((r) => ({
        pdfUrl: r.pdfUrl!,
        companyName: r.companyName,
        templateName: r.templateName!,
        templateType: r.templateType!,
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
