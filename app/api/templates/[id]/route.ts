import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction } from "@/lib/logger"
import * as fs from "fs"
import * as path from "path"
import { ErrorCode, sendError, handleInternalError } from "@/lib/api-error"

const TEMPLATES_DIR = path.join(process.cwd(), "templates")

// テンプレート取得
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

    return NextResponse.json({ template })
  } catch (error) {
    return handleInternalError(error, "templates/[id]/GET")
  }
}

// テンプレート更新
export async function PUT(
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
    const { name, type } = body

    const existingTemplate = await db.template.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return sendError(404, ErrorCode.NOT_FOUND, "テンプレートが見つかりません")
    }

    // バリデーション
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "name",
        reason: "invalid",
      })
    }

    if (type !== undefined && type !== "contract" && type !== "invoice") {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "type",
        reason: "invalid",
      })
    }

    const updatedTemplate = await db.template.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
      },
    })

    logAction(
      session.user.id,
      session.user.email || "unknown",
      session.user.name || "unknown",
      "テンプレート更新",
      `テンプレート「${updatedTemplate.name}」を更新 (ID: ${id})`
    )

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
    })
  } catch (error) {
    return handleInternalError(error, "templates/[id]/PUT")
  }
}

// テンプレート削除
export async function DELETE(
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

    // ファイルを削除
    const fileName = path.basename(template.filePath)
    const filePath = path.join(TEMPLATES_DIR, fileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // データベースから削除
    await db.template.delete({
      where: { id },
    })

    logAction(
      session.user.id,
      session.user.email || "unknown",
      session.user.name || "unknown",
      "テンプレート削除",
      `テンプレート「${template.name}」を削除 (ID: ${id})`
    )

    return NextResponse.json({
      success: true,
      message: "テンプレートを削除しました",
    })
  } catch (error) {
    return handleInternalError(error, "templates/[id]/DELETE")
  }
}
