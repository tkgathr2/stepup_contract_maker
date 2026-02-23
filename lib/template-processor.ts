import * as fs from "fs"
import * as path from "path"
import PizZip from "pizzip"

export interface TemplateData {
  companyName: string
  postalCode: string
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
function loadTemplateContent(template: TemplateRecord): Buffer {
  if (template.fileData && template.fileData.length > 0) {
    return template.fileData
  }

  const absolutePath = path.join(process.cwd(), template.filePath.replace(/^\//, ""))
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`テンプレートファイルが見つかりません: ${template.filePath}`)
  }
  return fs.readFileSync(absolutePath)
}

/**
 * 今日の日付を日本語フォーマットで返す（例: 令和8年2月23日）
 */
function getTodayDateJP(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()

  // 令和変換（2019年5月1日〜）
  const reiwaYear = year - 2018
  return `令和${reiwaYear}年${month}月${day}日`
}

/**
 * docx の XML 内で【プレースホルダー】テキストを置換する
 * Word は【】の中のテキストを複数の <w:r> に分割することがあるため、
 * 分割パターンも考慮して置換する
 */
function replaceInXml(xml: string, placeholder: string, value: string): string {
  // まず単純な置換を試みる（分割されていない場合）
  const simplePattern = `【${placeholder}】`
  if (xml.includes(simplePattern)) {
    return xml.split(simplePattern).join(value)
  }

  // Word が【】内のテキストを複数の <w:r> に分割している場合の処理
  // 各文字間に XML タグが挿入される可能性があるため、柔軟なパターンで検索
  const xmlTagPattern = `(?:</w:t>(?:\\s*</w:r>\\s*<w:r>(?:\\s*<w:rPr>[\\s\\S]*?</w:rPr>)?\\s*<w:t[^>]*>)?)?`
  const chars = placeholder.split("")
  const regexStr = "【" + chars.map(c => {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return xmlTagPattern + escaped
  }).join("") + xmlTagPattern + "】"

  const regex = new RegExp(regexStr, "g")
  return xml.replace(regex, value)
}

/**
 * Wordテンプレートにデータを埋め込む（【】形式プレースホルダー対応）
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

  // 置換マッピング
  const replacements: Record<string, string> = {
    "会社名": data.companyName,
    "郵便番号": data.postalCode,
    "住所": data.address,
    "氏名": data.representativeName,
    "今日の日付け": getTodayDateJP(),
    "契約書 1部": "契約書 1部",
  }

  // docx内の主要XMLファイルを処理
  const xmlFiles = [
    "word/document.xml",
    "word/header1.xml", "word/header2.xml", "word/header3.xml",
    "word/footer1.xml", "word/footer2.xml", "word/footer3.xml",
  ]

  for (const xmlFile of xmlFiles) {
    const file = zip.file(xmlFile)
    if (!file) continue

    let xmlContent = file.asText()

    for (const [placeholder, value] of Object.entries(replacements)) {
      xmlContent = replaceInXml(xmlContent, placeholder, value)
    }

    zip.file(xmlFile, xmlContent)
  }

  const buf = zip.generate({
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

    // ファイルが有効なdocxか確認
    const docXml = zip.file("word/document.xml")
    if (!docXml) {
      errors.push("有効なdocxファイルではありません")
      return { valid: false, errors }
    }

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
