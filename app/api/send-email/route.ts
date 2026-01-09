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
    const { to, cc, subject, body: emailBody, attachments } = body

    // メールアドレスの形式チェック（RFC 5322準拠の厳密な検証）
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

    // 宛先のバリデーション
    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "送信先メールアドレスは必須です" },
        { status: 400 }
      )
    }

    if (!emailRegex.test(to.trim())) {
      return NextResponse.json(
        { error: "メールアドレスの形式が正しくありません" },
        { status: 400 }
      )
    }

    // メールアドレスの長さチェック（RFC 5321準拠、最大254文字）
    if (to.trim().length > 254) {
      return NextResponse.json(
        { error: "メールアドレスが長すぎます" },
        { status: 400 }
      )
    }

    // CCのバリデーション（オプション）
    let validatedCc: string | undefined
    if (cc && typeof cc === "string" && cc.trim()) {
      if (!emailRegex.test(cc.trim())) {
        return NextResponse.json(
          { error: "CCメールアドレスの形式が正しくありません" },
          { status: 400 }
        )
      }
      if (cc.trim().length > 254) {
        return NextResponse.json(
          { error: "CCメールアドレスが長すぎます" },
          { status: 400 }
        )
      }
      validatedCc = cc.trim()
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
          // 添付ファイルURLのセキュリティ検証
          if (!attachment.url.startsWith("/api/files/")) {
            return NextResponse.json(
              { error: "無効な添付ファイルURLです" },
              { status: 400 }
            )
          }

          // URLからファイルパスを取得（/api/files/xxx.pdf -> public/generated/xxx.pdf）
          const filename = attachment.url.replace("/api/files/", "")

          // ファイル名のセキュリティ検証（パストラバーサル防止）
          if (filename.includes("..") || filename.includes("/") || filename.includes("\\") || filename.includes("\0")) {
            return NextResponse.json(
              { error: "無効なファイル名です" },
              { status: 400 }
            )
          }

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
    const mailOptions: {
      from: string
      to: string
      cc?: string
      subject: string
      text: string
      html: string
      attachments: { filename: string; path: string }[]
    } = {
      from: `"${gmailFromName}" <${gmailUser}>`,
      to,
      subject,
      text: emailBody || "",
      html: emailBody ? emailBody.replace(/\n/g, "<br>") : "",
      attachments: mailAttachments,
    }

    // CCがある場合のみ追加
    if (validatedCc) {
      mailOptions.cc = validatedCc
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
