import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAction } from "@/lib/logger"
import { ErrorCode, sendError, handleInternalError } from "@/lib/api-error"

// 履歴一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return sendError(401, ErrorCode.UNAUTHORIZED, "認証が必要です")
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)

    // クエリパラメータの取得
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const search = searchParams.get("search") || ""
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    // バリデーション
    const validatedPage = Math.max(1, page)
    const validatedLimit = Math.min(100, Math.max(1, limit))
    const skip = (validatedPage - 1) * validatedLimit

      // 検索条件の構築
      const where: {
        userId: string
        companyName?: { contains: string; mode: "insensitive" }
        createdAt?: { gte?: Date; lte?: Date }
      } = {
        userId,
      }

      if (search) {
        where.companyName = {
          contains: search,
          mode: "insensitive",
        }
      }

    if (from || to) {
      where.createdAt = {}
      if (from) {
        where.createdAt.gte = new Date(from)
      }
      if (to) {
        // toの日付の終わりまでを含める
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }

    // 履歴の取得
    const [histories, total] = await Promise.all([
      db.generationHistory.findMany({
        where,
        include: {
          template: {
            select: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: validatedLimit,
      }),
      db.generationHistory.count({ where }),
    ])

    // レスポンス形式に変換
    const formattedHistories = histories.map((history) => ({
      id: history.id,
      companyName: history.companyName,
      postalCode: history.postalCode || "",
      address: history.address,
      representativeName: history.representativeName,
      templateName: history.template.name,
      templateType: history.template.type,
      pdfUrl: history.pdfPath,
      createdAt: history.createdAt.toISOString(),
    }))

    logAction(
      session.user.id,
      session.user.email || "unknown",
      session.user.name || "unknown",
      "履歴取得",
      `${formattedHistories.length}件取得 (ページ: ${validatedPage})`
    )

    return NextResponse.json({
      histories: formattedHistories,
      total,
      page: validatedPage,
      limit: validatedLimit,
    })
  } catch (error) {
    return handleInternalError(error, "history/GET")
  }
}
