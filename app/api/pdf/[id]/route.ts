import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ErrorCode, sendError } from "@/lib/api-error"

// PDF バイナリデータを DB から配信する
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return sendError(401, ErrorCode.UNAUTHORIZED, "認証が必要です")
    }

    const { id } = await params

    const history = await db.generationHistory.findUnique({
      where: { id },
      select: {
        pdfData: true,
        companyName: true,
        userId: true,
      },
    })

    if (!history) {
      return sendError(404, ErrorCode.NOT_FOUND, "PDFが見つかりません")
    }

    // 自分の生成履歴のみダウンロード可能
    if (history.userId !== session.user.id) {
      return sendError(403, ErrorCode.FORBIDDEN, "アクセス権限がありません")
    }

    if (!history.pdfData) {
      return sendError(404, ErrorCode.NOT_FOUND, "PDFデータが保存されていません。再生成してください。")
    }

    const fileName = `${history.companyName}.pdf`
    const pdfBytes = new Uint8Array(history.pdfData)

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": pdfBytes.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("PDF配信エラー:", error)
    return sendError(500, ErrorCode.INTERNAL_ERROR, "PDFの取得に失敗しました")
  }
}
