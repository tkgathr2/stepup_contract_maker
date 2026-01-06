import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction, logError } from "@/lib/logger"
import * as fs from "fs"
import * as path from "path"
import { v4 as uuidv4 } from "uuid"

const TEMPLATES_DIR = path.join(process.cwd(), "templates")
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// テンプレート一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const templates = await db.template.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: "desc" },
    })

    logAction(
      session.user.id,
      session.user.email || "unknown",
      session.user.name || "unknown",
      "テンプレート一覧取得",
      `${templates.length}件のテンプレートを取得`
    )

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: "テンプレートの取得に失敗しました" },
      { status: 500 }
    )
  }
}

// テンプレートアップロード
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const name = formData.get("name") as string | null
    const type = formData.get("type") as string | null

    // バリデーション
    if (!file) {
      return NextResponse.json(
        { error: "ファイルが必要です" },
        { status: 400 }
      )
    }

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "テンプレート名が必要です" },
        { status: 400 }
      )
    }

    if (!type || (type !== "contract" && type !== "invoice")) {
      return NextResponse.json(
        { error: "タイプは 'contract' または 'invoice' である必要があります" },
        { status: 400 }
      )
    }

    // ファイル検証
    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Word形式（.docx）のファイルのみアップロード可能です" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下である必要があります" },
        { status: 400 }
      )
    }

    // テンプレートディレクトリが存在しない場合は作成
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true })
    }

    // ファイル名を生成（UUIDを使用してユニークに）
    const fileId = uuidv4()
    const fileName = `${fileId}.docx`
    const filePath = path.join(TEMPLATES_DIR, fileName)

    // ファイルを保存
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    // データベースに保存
    const template = await db.template.create({
      data: {
        name: name.trim(),
        type,
        filePath: `/templates/${fileName}`,
      },
    })

    logAction(
      session.user.id,
      session.user.email || "unknown",
      session.user.name || "unknown",
      "テンプレートアップロード",
      `テンプレート「${name}」をアップロード (ID: ${template.id})`
    )

    return NextResponse.json({
      success: true,
      template,
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
    console.error("Error uploading template:", error)
    return NextResponse.json(
      { error: "テンプレートのアップロードに失敗しました" },
      { status: 500 }
    )
  }
}
