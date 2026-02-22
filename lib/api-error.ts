import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export enum ErrorCode {
  NOT_FOUND = "NOT_FOUND",
  INVALID_PAYLOAD = "INVALID_PAYLOAD",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  DUPLICATE = "DUPLICATE",
  EXPIRED = "EXPIRED",
}

/**
 * 統一エラーレスポンスを返す
 */
export function sendError(
  status: number,
  errorCode: ErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: errorCode,
      message,
      ...(details ? { details } : {}),
    },
    { status }
  )
}

/**
 * 内部エラーをログ + Sentry送信する（レスポンスは返さない）
 */
export function captureInternalError(error: unknown, context?: string) {
  const ctx = context ?? "unknown"
  console.error("[RAKURAKU]", ctx, error)

  Sentry.captureException(error, {
    tags: { context: ctx },
  })
}

/**
 * 内部エラーを統一的に処理する
 * 1. console.error("[RAKURAKU]", context, error)
 * 2. Sentry.captureException
 * 3. sendError(500, INTERNAL_ERROR, "内部エラーが発生しました")
 */
export function handleInternalError(error: unknown, context?: string) {
  captureInternalError(error, context)
  return sendError(500, ErrorCode.INTERNAL_ERROR, "内部エラーが発生しました")
}
