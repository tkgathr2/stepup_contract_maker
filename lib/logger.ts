import * as fs from "fs"
import * as path from "path"

const LOG_DIR = path.join(process.cwd(), "logs")
const LOG_FILE = path.join(LOG_DIR, "debug_latest.txt")

// ログディレクトリが存在しない場合は作成
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function formatTimestamp(): string {
  const now = new Date()
  return now.toISOString().replace("T", " ").substring(0, 19)
}

/**
 * アクションをログに記録する
 * @param userId ユーザーID
 * @param email ユーザーのメールアドレス
 * @param name ユーザー名
 * @param action アクション名
 * @param message メッセージ
 */
export function logAction(
  userId: string,
  email: string,
  name: string,
  action: string,
  message: string
): void {
  const timestamp = formatTimestamp()
  const logMessage = `[${timestamp}] [USER: ${userId}/${email}/${name}] [ACTION: ${action}] ${message}\n`

  try {
    ensureLogDir()
    fs.appendFileSync(LOG_FILE, logMessage, "utf8")
  } catch (error) {
    console.error("Failed to write log:", error)
  }

  // 開発環境ではコンソールにも出力
  if (process.env.NODE_ENV !== "production") {
    console.log(logMessage.trim())
  }
}

/**
 * エラーをログに記録する
 * @param userId ユーザーID
 * @param email ユーザーのメールアドレス
 * @param name ユーザー名
 * @param error エラーオブジェクト
 */
export function logError(
  userId: string,
  email: string,
  name: string,
  error: Error
): void {
  const timestamp = formatTimestamp()
  const logMessage = `[${timestamp}] [USER: ${userId}/${email}/${name}] [ERROR] ${error.message}\n${error.stack}\n`

  try {
    ensureLogDir()
    fs.appendFileSync(LOG_FILE, logMessage, "utf8")
  } catch (writeError) {
    console.error("Failed to write error log:", writeError)
  }

  // 開発環境ではコンソールにも出力
  if (process.env.NODE_ENV !== "production") {
    console.error(logMessage.trim())
  }
}

/**
 * 認証イベントをログに記録する
 * @param action アクション（ログイン/ログアウト）
 * @param userId ユーザーID（オプション）
 * @param email メールアドレス（オプション）
 * @param name ユーザー名（オプション）
 * @param success 成功したかどうか
 */
export function logAuth(
  action: "LOGIN" | "LOGOUT",
  userId: string = "unknown",
  email: string = "unknown",
  name: string = "unknown",
  success: boolean = true
): void {
  const timestamp = formatTimestamp()
  const status = success ? "成功" : "失敗"
  const logMessage = `[${timestamp}] [USER: ${userId}/${email}/${name}] [AUTH: ${action}] ${status}\n`

  try {
    ensureLogDir()
    fs.appendFileSync(LOG_FILE, logMessage, "utf8")
  } catch (error) {
    console.error("Failed to write auth log:", error)
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(logMessage.trim())
  }
}

/**
 * システムログを記録する（ユーザー情報なし）
 * @param level ログレベル
 * @param message メッセージ
 */
export function logSystem(
  level: "INFO" | "WARN" | "ERROR",
  message: string
): void {
  const timestamp = formatTimestamp()
  const logMessage = `[${timestamp}] [SYSTEM] [${level}] ${message}\n`

  try {
    ensureLogDir()
    fs.appendFileSync(LOG_FILE, logMessage, "utf8")
  } catch (error) {
    console.error("Failed to write system log:", error)
  }

  if (process.env.NODE_ENV !== "production") {
    if (level === "ERROR") {
      console.error(logMessage.trim())
    } else if (level === "WARN") {
      console.warn(logMessage.trim())
    } else {
      console.log(logMessage.trim())
    }
  }
}
