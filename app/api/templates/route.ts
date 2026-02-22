import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction } from "@/lib/logger"
import * as fs from "fs"
import * as path from "path"
import { v4 as uuidv4 } from "uuid"
import { ErrorCode, sendError, handleInternalError } from "@/lib/api-error"

const TEMPLATES_DIR = path.join(process.cwd(), "templates")
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// テンプレート一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return sendError(401, ErrorCode.UNAUTHORIZED, "認証が必要です")
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
    return handleInternalError(error, "templates/GET")
  }
}

// テンプレートアップロード
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return sendError(401, ErrorCode.UNAUTHORIZED, "認証が必要です")
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const name = formData.get("name") as string | null
    const type = formData.get("type") as string | null

    // バリデーション
    if (!file) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "file",
        reason: "required",
      })
    }

    if (!name || name.trim() === "") {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "name",
        reason: "required",
      })
    }

    if (!type || (type !== "contract" && type !== "invoice")) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "入力が不正です", {
        field: "type",
        reason: "invalid",
      })
    }

    // ファイル検証
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

    // ファイル内容を読み込み
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // docxファイルの基本検証（ZIP形式 = PK マジックバイト）
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return sendError(400, ErrorCode.INVALID_PAYLOAD, "有効な.docxファイルではありません。正しいWord文書をアップロードしてください。", {
        field: "file",
        reason: "invalid_content",
      })
    }

    // ファイル名を生成（UUIDを使用してユニークに）
    const fileId = uuidv4()
    const fileName = `${fileId}.docx`
    const filePath = path.join(TEMPLATES_DIR, fileName)

    // ファイルシステムにも書き込み（ローカル開発用フォールバック）
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true })
    }
    fs.writeFileSync(filePath, buffer)

    // データベースに保存（fileData にバイナリも格納）
    const template = await db.template.create({
      data: {
        name: name.trim(),
        type,
        filePath: `/templates/${fileName}`,
        fileData: buffer,
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
    return handleInternalError(error, "templates/POST")
  }
}
