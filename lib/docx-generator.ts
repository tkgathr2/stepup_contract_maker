import * as fs from "fs"
import * as path from "path"
import { v4 as uuidv4 } from "uuid"

const GENERATED_DIR = path.join(process.cwd(), "public", "generated")

/**
 * WordファイルのBufferをファイルとして保存する
 * @param docxBuffer WordファイルのBuffer
 * @param fileName 出力ファイル名（拡張子なし）
 * @returns 生成されたWordファイルのURL
 */
export async function saveDocxFile(
  docxBuffer: Buffer,
  fileName?: string
): Promise<{ docxUrl: string; docxPath: string }> {
  // 生成ディレクトリが存在しない場合は作成
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true })
  }

  // ファイル名を生成
  const fileId = fileName || uuidv4()
  const docxFileName = `${fileId}.docx`
  const docxPath = path.join(GENERATED_DIR, docxFileName)

  // Bufferをファイルとして保存
  fs.writeFileSync(docxPath, docxBuffer)

  return {
    docxUrl: `/generated/${docxFileName}`,
    docxPath,
  }
}

/**
 * Wordファイルを削除する
 * @param docxUrl WordファイルのURL
 */
export async function deleteDocxFile(docxUrl: string): Promise<void> {
  const fileName = path.basename(docxUrl)
  const docxPath = path.join(GENERATED_DIR, fileName)

  if (fs.existsSync(docxPath)) {
    fs.unlinkSync(docxPath)
  }
}
