import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { auth } from "@/lib/auth"
import path from "path"
import fs from "fs"

// メール送信API
export async function POST(request: NextRequest) {
  // 認証チェック
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { to, subject, body: emailBody, attachments } = body

    // バリデーション
    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "送信先メールアドレスは必須です" },
        { status: 400 }
      )
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "メールアドレスの形式が正しくありません" },
        { status: 400 }
      )
    }

    if (!subject || typeof subject !== "string") {
      return NextResponse.json(
        { error: "件名は必須です" },
        { status: 400 }
      )
    }

    // 環境変数のチェック
    const gmailUser = process.env.GMAIL_USER
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
    const gmailFromName = process.env.GMAIL_FROM_NAME || "契約書生成システム"

    if (!gmailUser || !gmailAppPassword) {
      console.error("Gmail credentials not configured")
      return NextResponse.json(
        { error: "Gmail認証に失敗しました。環境変数を確認してください。" },
        { status: 500 }
      )
    }

    // Nodemailer トランスポーターの作成
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    // 添付ファイルの準備
    const mailAttachments: { filename: string; path: string }[] = []

    if (attachments && Array.isArray(attachments)) {
      for (const attachment of attachments) {
        if (attachment.url && attachment.filename) {
          // URLからファイルパスを取得（/api/files/xxx.pdf -> public/generated/xxx.pdf）
          const filename = attachment.url.replace("/api/files/", "")
          const filePath = path.join(process.cwd(), "public", "generated", filename)

          // ファイルの存在確認
          if (fs.existsSync(filePath)) {
            // ファイルサイズチェック（25MB制限）
            const stats = fs.statSync(filePath)
            if (stats.size > 25 * 1024 * 1024) {
              return NextResponse.json(
                { error: "添付ファイルのサイズが大きすぎます（最大25MB）" },
                { status: 400 }
              )
            }

            mailAttachments.push({
              filename: attachment.filename,
              path: filePath,
            })
          }
        }
      }
    }

    // メール送信
    const mailOptions = {
      from: `"${gmailFromName}" <${gmailUser}>`,
      to,
      subject,
      text: emailBody || "",
      html: emailBody ? emailBody.replace(/\n/g, "<br>") : "",
      attachments: mailAttachments,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({
      success: true,
      message: "メールを送信しました",
    })
  } catch (error) {
    console.error("Email send error:", error)

    // エラーの種類に応じたメッセージ
    if (error instanceof Error) {
      if (error.message.includes("Invalid login") || error.message.includes("auth")) {
        return NextResponse.json(
          { error: "Gmail認証に失敗しました。環境変数を確認してください。" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: "メール送信に失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 }
    )
  }
}
