import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ErrorCode, sendError } from "@/lib/api-error"

// Word (docx) バイナリデータを DB から配信する
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
        docxData: true,
        companyName: true,
        userId: true,
        createdAt: true,
        template: {
          select: { name: true },
        },
      },
    })

    if (!history) {
      return sendError(404, ErrorCode.NOT_FOUND, "Wordファイルが見つかりません")
    }

    // 自分の生成履歴のみダウンロード可能
    if (history.userId !== session.user.id) {
      return sendError(403, ErrorCode.FORBIDDEN, "アクセス権限がありません")
    }

    if (!history.docxData) {
      return sendError(404, ErrorCode.NOT_FOUND, "Wordデータが保存されていません。再生成してください。")
    }

    // ファイル名: YYYYMMDD_会社名_テンプレート名.docx
    const d = history.createdAt
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
    const templateName = history.template.name
    const fileName = `${dateStr}_${history.companyName}_${templateName}.docx`
    const docxBytes = new Uint8Array(history.docxData)

    return new NextResponse(docxBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": docxBytes.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Word配信エラー:", error)
    return sendError(500, ErrorCode.INTERNAL_ERROR, "Wordファイルの取得に失敗しました")
  }
}
