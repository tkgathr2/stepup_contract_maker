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
      ...(details && { details }),
    },
    { status }
  )
}

export function handleInternalError(error: unknown, context?: string) {
  console.error("[RAKURAKU]", context, error)
  Sentry.captureException(error, { tags: { context: context ?? "unknown" } })
  return sendError(500, ErrorCode.INTERNAL_ERROR, "内部エラーが発生しました")
}
