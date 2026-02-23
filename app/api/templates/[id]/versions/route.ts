import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction } from "@/lib/logger"
import { ErrorCode, sendError, handleInternalError } from "@/lib/api-error"

// バージョン履歴取得
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

    const versions = await db.templateVersion.findMany({
      where: { templateId: id },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        name: true,
        editedById: true,
        editedBy: true,
        comment: true,
        createdAt: true,
        // fileData は大きいのでリスト取得時は除外
      },
    })

    return NextResponse.json({ versions })
  } catch (error) {
    return handleInternalError(error, "templates/[id]/versions/GET")
  }
}

// バージョン戻し（revert）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return sendError(401, ErrorCode.UNAUTHORIZED, "認証が必要です")
    }

    const { id } = await params
    const body = await request.json()
    const { versionId } = body

    if (!versionId) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "versionId が必要です")
    }

    const template = await db.template.findUnique({
      where: { id },
    })

    if (!template) {
      return sendError(404, ErrorCode.NOT_FOUND, "テンプレートが見つかりません")
    }

    const targetVersion = await db.templateVersion.findUnique({
      where: { id: versionId },
    })

    if (!targetVersion || targetVersion.templateId !== id) {
      return sendError(404, ErrorCode.NOT_FOUND, "指定されたバージョンが見つかりません")
    }

    // 現在のファイルをバージョン履歴に保存
    if (template.fileData && template.fileData.length > 0) {
      const latestVersion = await db.templateVersion.findFirst({
        where: { templateId: id },
        orderBy: { version: "desc" },
      })
      const nextVersion = (latestVersion?.version ?? 0) + 1

      await db.templateVersion.create({
        data: {
          templateId: id,
          version: nextVersion,
          name: template.name,
          fileData: template.fileData,
          editedById: session.user.id,
          editedBy: session.user.name || session.user.email || "unknown",
          comment: `v${targetVersion.version} に戻す前の自動保存`,
        },
      })
    }

    // 指定バージョンのfileDataで現在のテンプレートを更新
    const updatedTemplate = await db.template.update({
      where: { id },
      data: {
        fileData: targetVersion.fileData,
        name: targetVersion.name,
      },
    })

    logAction(
      session.user.id,
      session.user.email || "unknown",
      session.user.name || "unknown",
      "テンプレートバージョン戻し",
      `テンプレート「${updatedTemplate.name}」を v${targetVersion.version} に戻し (ID: ${id})`
    )

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: `v${targetVersion.version} に戻しました`,
    })
  } catch (error) {
    return handleInternalError(error, "templates/[id]/versions/POST")
  }
}
