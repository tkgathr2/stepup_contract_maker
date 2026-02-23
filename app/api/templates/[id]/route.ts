import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction } from "@/lib/logger"
import * as fs from "fs"
import * as path from "path"
import { ErrorCode, sendError, handleInternalError } from "@/lib/api-error"

const TEMPLATES_DIR = path.join(process.cwd(), "templates")
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

/**
 * テンプレート更新（ファイル差替え対応 + バージョン履歴）
 * - FormData: file(任意), name(任意), type(任意), comment(任意)
 * - fileが含まれる場合: 現在のfileDataをバージョン履歴に保存してから差替え
 */
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

    const existingTemplate = await db.template.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return sendError(404, ErrorCode.NOT_FOUND, "テンプレートが見つかりません")
    }

    // Content-Type で FormData か JSON かを判別
    const contentType = request.headers.get("content-type") || ""
    let name: string | undefined
    let type: string | undefined
    let file: File | null = null
    let comment: string | undefined

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const nameVal = formData.get("name") as string | null
      const typeVal = formData.get("type") as string | null
      const commentVal = formData.get("comment") as string | null
      file = formData.get("file") as File | null
      if (nameVal) name = nameVal
      if (typeVal) type = typeVal
      if (commentVal) comment = commentVal
    } else {
      const body = await request.json()
      name = body.name
      type = body.type
      comment = body.comment
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

    // ファイル差替えの場合
    let newFileData: Buffer | undefined
    if (file) {
      if (!file.name.endsWith(".docx")) {
        return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
          field: "file",
          reason: "invalid_extension",
          expected: ".docx",
        })
      }
      if (file.size > MAX_FILE_SIZE) {
        return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
          field: "file",
          reason: "too_large",
          maxBytes: MAX_FILE_SIZE,
        })
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // docxファイルの基本検証（ZIP形式 = PK マジックバイト）
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        return sendError(400, ErrorCode.INVALID_PAYLOAD, "有効な.docxファイルではありません。", {
          field: "file",
          reason: "invalid_content",
        })
      }

      // 現在のfileDataをバージョン履歴に保存
      if (existingTemplate.fileData && existingTemplate.fileData.length > 0) {
        const latestVersion = await db.templateVersion.findFirst({
          where: { templateId: id },
          orderBy: { version: "desc" },
        })
        const nextVersion = (latestVersion?.version ?? 0) + 1

        await db.templateVersion.create({
          data: {
            templateId: id,
            version: nextVersion,
            name: existingTemplate.name,
            fileData: existingTemplate.fileData,
            editedById: session.user.id,
            editedBy: session.user.name || session.user.email || "unknown",
            comment: comment || `v${nextVersion} バージョン保存`,
          },
        })
      }

      newFileData = buffer
    }

    const updatedTemplate = await db.template.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(newFileData && { fileData: newFileData }),
      },
    })

    logAction(
      session.user.id,
      session.user.email || "unknown",
      session.user.name || "unknown",
      file ? "テンプレートファイル差替え" : "テンプレート更新",
      `テンプレート「${updatedTemplate.name}」を${file ? "差替え" : "更新"} (ID: ${id})`
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

    // データベースから削除（TemplateVersion も Cascade で削除される）
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
