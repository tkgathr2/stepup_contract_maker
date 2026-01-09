import * as fs from "fs"
import * as path from "path"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"

export interface TemplateData {
  companyName: string
  address: string
  representativeName: string
  postalCode?: string
  currentDate?: string
}

/**
 * Wordテンプレートにデータを埋め込む
 * @param templatePath テンプレートファイルのパス
 * @param data 埋め込むデータ
 * @returns 埋め込み後のWordファイルのBuffer
 */
export async function processTemplate(
  templatePath: string,
  data: TemplateData
): Promise<Buffer> {
  // テンプレートファイルを読み込む
  const absolutePath = path.join(process.cwd(), templatePath.replace(/^\//, ""))

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`テンプレートファイルが見つかりません: ${templatePath}`)
  }

  const content = fs.readFileSync(absolutePath, "binary")
  const zip = new PizZip(content)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  // データを埋め込む
  doc.render({
    companyName: data.companyName,
    address: data.address,
    representativeName: data.representativeName,
    postalCode: data.postalCode || "",
    currentDate: data.currentDate || "",
  })

  // 結果をBufferとして取得
  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  })

  return buf
}

/**
 * テンプレートファイルのプレースホルダーを検証する
 * @param templatePath テンプレートファイルのパス
 * @returns プレースホルダーが正しいかどうか
 */
export async function validateTemplate(templatePath: string): Promise<{
  valid: boolean
  errors: string[]
}> {
  const errors: string[] = []

  try {
    const absolutePath = path.join(process.cwd(), templatePath.replace(/^\//, ""))

    if (!fs.existsSync(absolutePath)) {
      return { valid: false, errors: ["テンプレートファイルが見つかりません"] }
    }

    const content = fs.readFileSync(absolutePath, "binary")
    const zip = new PizZip(content)

    // テストデータで検証
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    doc.render({
      companyName: "テスト会社",
      address: "テスト住所",
      representativeName: "テスト代表者",
      postalCode: "000-0000",
      currentDate: "2026/01/07",
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
