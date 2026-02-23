import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { handleInternalError, ErrorCode, sendError } from "@/lib/api-error"

// テンプレートファイルダウンロード
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

    const template = await db.template.findUnique({
      where: { id },
    })

    if (!template) {
      return sendError(404, ErrorCode.NOT_FOUND, "テンプレートが見つかりません")
    }

    if (!template.fileData || template.fileData.length === 0) {
      return sendError(404, ErrorCode.NOT_FOUND, "テンプレートファイルが見つかりません")
    }

    // ファイル名を生成（テンプレート名 + .docx）
    const fileName = `${template.name}.docx`

    const body = new Uint8Array(template.fileData)

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": template.fileData.length.toString(),
      },
    })
  } catch (error) {
    return handleInternalError(error, "templates/[id]/download/GET")
  }
}
