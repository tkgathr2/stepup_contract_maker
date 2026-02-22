import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction, logError } from "@/lib/logger"
import { processTemplate } from "@/lib/template-processor"
import { generatePDFBuffer, generatePDFPreview } from "@/lib/pdf-generator"
import { ErrorCode, sendError, handleInternalError } from "@/lib/api-error"

// PDF生成
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
    const { companyName, address, representativeName, templateId, preview } = body

    // バリデーション
    if (!companyName || typeof companyName !== "string") {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "companyName",
        reason: "required",
      })
    }
    if (companyName.length > 100) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "companyName",
        reason: "too_long",
        maxLength: 100,
      })
    }

    if (!address || typeof address !== "string") {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "address",
        reason: "required",
      })
    }
    if (address.length > 500) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "address",
        reason: "too_long",
        maxLength: 500,
      })
    }

    if (!representativeName || typeof representativeName !== "string") {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "representativeName",
        reason: "required",
      })
    }
    if (representativeName.length > 100) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "representativeName",
        reason: "too_long",
        maxLength: 100,
      })
    }

    if (!templateId || typeof templateId !== "string") {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "templateId",
        reason: "required",
      })
    }

    // テンプレートを取得
    const template = await db.template.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return sendError(404, ErrorCode.NOT_FOUND, "テンプレートが見つかりません")
    }

    logAction(userId, email, name, "PDF生成", "開始")

    // テンプレートにデータを埋め込む
    logAction(userId, email, name, "テンプレート読み込み", "開始")
    const docxBuffer = await processTemplate(template, {
      companyName,
      address,
      representativeName,
    })
    logAction(userId, email, name, "テンプレート読み込み", "成功")

    // プレビューモードの場合
    if (preview) {
      logAction(userId, email, name, "PDF生成", "プレビュー生成開始")
      const pdfBase64 = await generatePDFPreview(docxBuffer)
      logAction(userId, email, name, "PDF生成", "プレビュー生成成功")

      return NextResponse.json({
        success: true,
        preview: true,
        pdfBase64,
      })
    }

    // PDFを生成（バッファとしてDBに保存）
    const pdfBuffer = await generatePDFBuffer(docxBuffer)

    // 履歴を保存（PDF実体をDBに格納）
    const history = await db.generationHistory.create({
      data: {
        userId,
        templateId,
        companyName,
        address,
        representativeName,
        pdfPath: `/api/pdf/PLACEHOLDER`,
        pdfData: pdfBuffer,
      },
    })

    // pdfPath を正しい API URL に更新
    await db.generationHistory.update({
      where: { id: history.id },
      data: { pdfPath: `/api/pdf/${history.id}` },
    })

    logAction(
      userId,
      email,
      name,
      "PDF生成",
      `成功 - 会社名: ${companyName}, 履歴ID: ${history.id}`
    )

    return NextResponse.json({
      success: true,
      pdfUrl: `/api/pdf/${history.id}`,
      historyId: history.id,
    })
  } catch (error) {
    logError(userId, email, name, error as Error)
    return handleInternalError(error, "generate")
  }
}
