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

    // セキュリティ: ファイル名にパストラバーサル攻撃を防ぐ
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json(
        { error: "Invalid filename" },
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
    const encodedFilename = encodeURIComponent(filename)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodedFilename}`,
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
