import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ErrorCode, sendError, handleInternalError } from "@/lib/api-error"

// 単一履歴取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
){
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return sendError(401, ErrorCode.UNAUTHORIZED, "認証が必要です")
    }

    const { id } = await params

    const history = await db.generationHistory.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    })

    if (!history) {
      return sendError(404, ErrorCode.NOT_FOUND, "履歴が見つかりません")
    }

    if (history.userId !== session.user.id) {
      return sendError(403, ErrorCode.UNAUTHORIZED, "アクセス権限がありません")
    }

    return NextResponse.json({
      id: history.id,
      companyName: history.companyName,
      postalCode: history.postalCode || "",
      address: history.address,
      representativeName: history.representativeName,
      templateName: history.template.name,
      templateType: history.template.type,
      pdfUrl: history.pdfPath,
      createdAt: history.createdAt.toISOString(),
    })
  } catch (error) {
    return handleInternalError(error, "history/[id]/GET")
  }
}
