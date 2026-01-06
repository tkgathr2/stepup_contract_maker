import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction, logError } from "@/lib/logger"
import { processTemplate } from "@/lib/template-processor"
import { generatePDF, generatePDFPreview } from "@/lib/pdf-generator"
import { v4 as uuidv4 } from "uuid"

// PDF生成
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    )
  }

  const userId = session.user.id
  const email = session.user.email || "unknown"
  const name = session.user.name || "unknown"

  try {
    const body = await request.json()
    const { companyName, address, representativeName, templateId, preview } = body

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

    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json(
        { error: "テンプレートを選択してください" },
        { status: 400 }
      )
    }

    // テンプレートを取得
    const template = await db.template.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      )
    }

    logAction(userId, email, name, "PDF生成", "開始")

    // テンプレートにデータを埋め込む
    logAction(userId, email, name, "テンプレート読み込み", "開始")
    const docxBuffer = await processTemplate(template.filePath, {
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

    // PDFを生成
    const fileId = uuidv4()
    const { pdfUrl } = await generatePDF(docxBuffer, fileId)

    // 履歴を保存
    const history = await db.generationHistory.create({
      data: {
        userId,
        templateId,
        companyName,
        address,
        representativeName,
        pdfPath: pdfUrl,
      },
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
      pdfUrl,
      historyId: history.id,
    })
  } catch (error) {
    logError(userId, email, name, error as Error)
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "PDFの生成に失敗しました" },
      { status: 500 }
    )
  }
}
