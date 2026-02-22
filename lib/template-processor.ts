import * as fs from "fs"
import * as path from "path"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"

export interface TemplateData {
  companyName: string
  address: string
  representativeName: string
}

/** DB から取得したテンプレート行 */
export interface TemplateRecord {
  filePath: string
  fileData?: Buffer | null
}

/**
 * テンプレートの .docx バイナリを取得する
 * 1. DB に fileData があればそれを使う（エフェメラルFS対策）
 * 2. なければファイルシステムから読み込む
 */
function loadTemplateContent(template: TemplateRecord): string {
  if (template.fileData && template.fileData.length > 0) {
    return template.fileData.toString("binary")
  }

  const absolutePath = path.join(process.cwd(), template.filePath.replace(/^\//, ""))
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`テンプレートファイルが見つかりません: ${template.filePath}`)
  }
  return fs.readFileSync(absolutePath, "binary")
}

/**
 * Wordテンプレートにデータを埋め込む
 * @param template DB テンプレート行（filePath + fileData）
 * @param data 埋め込むデータ
 * @returns 埋め込み後のWordファイルのBuffer
 */
export async function processTemplate(
  template: TemplateRecord,
  data: TemplateData
): Promise<Buffer> {
  const content = loadTemplateContent(template)
  const zip = new PizZip(content)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  doc.render({
    companyName: data.companyName,
    address: data.address,
    representativeName: data.representativeName,
  })

  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  })

  return buf
}

/**
 * テンプレートファイルのプレースホルダーを検証する
 */
export async function validateTemplate(template: TemplateRecord): Promise<{
  valid: boolean
  errors: string[]
}> {
  const errors: string[] = []

  try {
    const content = loadTemplateContent(template)
    const zip = new PizZip(content)

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    doc.render({
      companyName: "テスト会社",
      address: "テスト住所",
      representativeName: "テスト代表者",
    })

    return { valid: true, errors: [] }
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message)
    } else {
      errors.push("不明なエラーが発生しました")
    }
    return { valid: false, errors }
  }
}
