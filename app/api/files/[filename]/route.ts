import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: encodedFilename } = await params
    const filename = decodeURIComponent(encodedFilename)

    // セキュリティ: ファイル名の厳密なバリデーション
    // 1. パストラバーサル攻撃を防ぐ（"..", "/", "\", null文字）
    // 2. 許可する文字: 日本語、英数字、記号（ハイフン、アンダースコア、括弧、ドット、スペース）
    // 3. 許可する拡張子: .pdf, .docx のみ
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\") ||
      filename.includes("\0") ||
      filename === "." ||
      filename === ".."
    ) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      )
    }

    // 許可する拡張子のチェック
    const allowedExtensions = [".pdf", ".docx"]
    const hasValidExtension = allowedExtensions.some(ext => filename.toLowerCase().endsWith(ext))
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      )
    }

    // ファイル名の長さチェック（255文字制限）
    if (filename.length > 255) {
      return NextResponse.json(
        { error: "Filename too long" },
        { status: 400 }
      )
    }

    // ファイルパスを構築
    const generatedDir = path.join(process.cwd(), "public", "generated")
    const filePath = path.join(generatedDir, filename)

    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    // ファイルを読み込む
    const fileBuffer = fs.readFileSync(filePath)

    // Content-Typeを設定
    const contentType = filename.endsWith(".pdf")
      ? "application/pdf"
      : filename.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/octet-stream"

    // ファイルを返す
    // RFC 5987形式でファイル名をエンコード（日本語対応）
    const encodedFilenameForHeader = encodeURIComponent(filename)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodedFilenameForHeader}`,
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    )
  }
}
