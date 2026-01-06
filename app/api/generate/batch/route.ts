import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction, logError } from "@/lib/logger"
import { processTemplate } from "@/lib/template-processor"
import { generatePDF } from "@/lib/pdf-generator"
import { v4 as uuidv4 } from "uuid"

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
    const { templateId, companies } = body as {
      templateId: string
      companies: CompanyData[]
    }

    // バリデーション
    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json(
        { error: "テンプレートを選択してください" },
        { status: 400 }
      )
    }

    if (!Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json(
        { error: "会社情報を1件以上入力してください" },
        { status: 400 }
      )
    }

    // 各会社情報のバリデーション
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i]
      if (!company.companyName || company.companyName.length > 100) {
        return NextResponse.json(
          { error: `${i + 1}番目の会社名が不正です` },
          { status: 400 }
        )
      }
      if (!company.address || company.address.length > 500) {
        return NextResponse.json(
          { error: `${i + 1}番目の住所が不正です` },
          { status: 400 }
        )
      }
      if (!company.representativeName || company.representativeName.length > 100) {
        return NextResponse.json(
          { error: `${i + 1}番目の代表者名が不正です` },
          { status: 400 }
        )
      }
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

    logAction(
      userId,
      email,
      name,
      "一括PDF生成",
      `開始 - ${companies.length}件`
    )

    // 各会社に対してPDFを生成（並列処理）
    const generatePromises = companies.map(async (company, index) => {
      try {
        // テンプレートにデータを埋め込む
        const docxBuffer = await processTemplate(template.filePath, {
          companyName: company.companyName,
          address: company.address,
          representativeName: company.representativeName,
        })

        // PDFを生成
        const fileId = uuidv4()
        const { pdfUrl } = await generatePDF(docxBuffer, fileId)

        // 履歴を保存
        const history = await db.generationHistory.create({
          data: {
            userId,
            templateId,
            companyName: company.companyName,
            address: company.address,
            representativeName: company.representativeName,
            pdfPath: pdfUrl,
          },
        })

        logAction(
          userId,
          email,
          name,
          "一括PDF生成",
          `成功 (${index + 1}/${companies.length}) - 会社名: ${company.companyName}`
        )

        return {
          success: true,
          pdfUrl,
          companyName: company.companyName,
          historyId: history.id,
        }
      } catch (error) {
        logError(userId, email, name, error as Error)
        return {
          success: false,
          companyName: company.companyName,
          error: (error as Error).message,
        }
      }
    })

    const results = await Promise.all(generatePromises)

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
    console.error("Error generating batch PDFs:", error)
    return NextResponse.json(
      { error: "一括PDF生成に失敗しました" },
      { status: 500 }
    )
  }
}
