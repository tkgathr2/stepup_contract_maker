import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction, logError } from "@/lib/logger"
import * as fs from "fs"
import * as path from "path"

const TEMPLATES_DIR = path.join(process.cwd(), "templates")

// テンプレート取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { id } = await params

    const template = await db.template.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: "テンプレートの取得に失敗しました" },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, type } = body

    const existingTemplate = await db.template.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      )
    }

    // バリデーション
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return NextResponse.json(
        { error: "テンプレート名が無効です" },
        { status: 400 }
      )
    }

    if (type !== undefined && type !== "contract" && type !== "invoice") {
      return NextResponse.json(
        { error: "タイプは 'contract' または 'invoice' である必要があります" },
        { status: 400 }
      )
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
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      logError(
        session.user.id,
        session.user.email || "unknown",
        session.user.name || "unknown",
        error as Error
      )
    }
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: "テンプレートの更新に失敗しました" },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { id } = await params

    const template = await db.template.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { error: "テンプレートが見つかりません" },
        { status: 404 }
      )
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
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      logError(
        session.user.id,
        session.user.email || "unknown",
        session.user.name || "unknown",
        error as Error
      )
    }
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: "テンプレートの削除に失敗しました" },
      { status: 500 }
    )
  }
}
