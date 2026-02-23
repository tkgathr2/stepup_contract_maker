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
 * 文書末尾の署名ブロックに w:keepNext を追加してページ分割を防止する
 * </w:body> 直前の段落群（署名ブロック＋日付行）を検出し、
 * 各段落の <w:pPr> に <w:keepNext/> を挿入する
 * これにより LibreOffice が署名ブロックをページ境界で分断しなくなる
 */
function addKeepNextToEndBlock(xml: string): string {
  // </w:body> の位置を探す
  const bodyEndIdx = xml.lastIndexOf("</w:body>")
  if (bodyEndIdx === -1) return xml

  // </w:body> 直前の sectPr を除いた最後の段落群を対象にする
  // 「本契約の成立を証する」「令和」「（甲）」「（乙）」等を含む末尾ブロック
  // 末尾から最大20段落（十分な範囲）に keepNext を追加

  // 末尾の <w:p> ... </w:p> を全て収集
  const allParas: Array<{ start: number; end: number }> = []
  const paraRegex = /<w:p[\s>]/g
  let match
  while ((match = paraRegex.exec(xml)) !== null) {
    const paraStart = match.index
    // この <w:p の閉じ </w:p> を見つける
    const closeTag = "</w:p>"
    const closeIdx = xml.indexOf(closeTag, paraStart)
    if (closeIdx !== -1) {
      allParas.push({ start: paraStart, end: closeIdx + closeTag.length })
    }
  }

  // bodyEnd より前の段落のみを対象
  const parasBeforeBody = allParas.filter(p => p.end <= bodyEndIdx)

  // 末尾20段落に keepNext を追加（署名ブロック全体をカバー）
  const targetParas = parasBeforeBody.slice(-20)

  // 後ろから処理（インデックスがずれないように）
  let result = xml
  for (let i = targetParas.length - 1; i >= 0; i--) {
    const para = targetParas[i]
    const paraContent = result.substring(para.start, para.end)

    // 既に keepNext がある場合はスキップ
    if (paraContent.includes("<w:keepNext/>") || paraContent.includes("<w:keepNext ")) {
      continue
    }

    // <w:pPr> がある場合はその中に追加
    const pPrIdx = paraContent.indexOf("<w:pPr>")
    if (pPrIdx !== -1) {
      const insertPos = para.start + pPrIdx + "<w:pPr>".length
      result = result.substring(0, insertPos) + "<w:keepNext/>" + result.substring(insertPos)
    } else {
      // <w:pPr> がない場合は <w:p...> の直後に追加
      const pTagEnd = result.indexOf(">", para.start)
      if (pTagEnd !== -1) {
        const insertPos = pTagEnd + 1
        result = result.substring(0, insertPos) + "<w:pPr><w:keepNext/></w:pPr>" + result.substring(insertPos)
      }
    }
  }

  return result
}

/**
 * 段落間の過剰な空白を圧縮する（全テンプレート共通）
 * - w:spacing w:after / w:before の大きな値を縮小
 * - ページマージン（上下）を縮小して縦方向の余裕を確保
 */
function compactSpacing(xml: string): string {
  let result = xml

  // w:spacing w:after="240" 以上の値を "80" に圧縮
  result = result.replace(
    /(<w:spacing\s[^/]*?)w:after="(\d+)"([^/]*?\/>)/g,
    (_match, prefix: string, afterVal: string, suffix: string) => {
      const val = parseInt(afterVal, 10)
      if (val > 100) {
        return `${prefix}w:after="80"${suffix}`
      }
      return `${prefix}w:after="${afterVal}"${suffix}`
    }
  )

  // w:spacing w:before="240" 以上の値を "80" に圧縮
  result = result.replace(
    /(<w:spacing\s[^/]*?)w:before="(\d+)"([^/]*?\/>)/g,
    (_match, prefix: string, beforeVal: string, suffix: string) => {
      const val = parseInt(beforeVal, 10)
      if (val > 100) {
        return `${prefix}w:before="80"${suffix}`
      }
      return `${prefix}w:before="${beforeVal}"${suffix}`
    }
  )

  // ページマージン（上下）を縮小: top 1985→1440 (3.5cm→2.54cm), bottom 1701→1134 (3.0cm→2.0cm)
  // 左右はそのまま維持
  result = result.replace(
    /(<w:pgMar\s[^/]*?)w:top="(\d+)"([^/]*?\/>)/g,
    (_match, prefix: string, topVal: string, suffix: string) => {
      const val = parseInt(topVal, 10)
      if (val > 1440) {
        return `${prefix}w:top="1440"${suffix}`
      }
      return `${prefix}w:top="${topVal}"${suffix}`
    }
  )
  result = result.replace(
    /(<w:pgMar\s[^/]*?)w:bottom="(\d+)"([^/]*?\/>)/g,
    (_match, prefix: string, bottomVal: string, suffix: string) => {
      const val = parseInt(bottomVal, 10)
      if (val > 1134) {
        return `${prefix}w:bottom="1134"${suffix}`
      }
      return `${prefix}w:bottom="${bottomVal}"${suffix}`
    }
  )

  return result
}

/**
 * 連続する空段落（テキストなし）を圧縮する
 * 2つ以上連続する空段落を1つに削減する
 */
function removeConsecutiveEmptyParagraphs(xml: string): string {
  // 空段落 = <w:p> ... </w:p> の中に <w:t> がないもの
  // 2つ以上連続する空段落を1つに減らす
  let result = xml

  // パターン: 空段落が2つ以上連続しているケースを検出
  // 空段落 = w:r(テキスト要素)を含まない <w:p>...</w:p>
  // 繰り返し適用して3つ→2つ→1つと段階的に削減
  for (let i = 0; i < 5; i++) {
    const before = result
    // 空段落（w:t を含まない w:p）が2つ連続するパターンを1つに削減
    result = result.replace(
      /(<w:p\s[^>]*>\s*<w:pPr>(?:(?!<w:t)[\s\S])*?<\/w:pPr>\s*<\/w:p>)\s*(<w:p\s[^>]*>\s*<w:pPr>(?:(?!<w:t)[\s\S])*?<\/w:pPr>\s*<\/w:p>)/g,
      '$1'
    )
    if (result === before) break
  }

  return result
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

    // Gotenberg の LibreOffice (v26+) は docGrid type="lines" を Word と異なる行間で
    // レンダリングするため、type 属性を除去して行間の互換性を確保する
    // （linePitch はそのまま残す）
    xmlContent = xmlContent.replace(
      /<w:docGrid\s+w:type="lines"\s+w:linePitch="(\d+)"\/>/g,
      '<w:docGrid w:linePitch="$1"/>'
    )

    // Word テンプレートの言語属性 zh-CN / zh-TW を ja-JP に修正
    // これにより LibreOffice が中国語フォント（WenQuanYi, NotoSansCJKsc）ではなく
    // 日本語フォント（IPAGothic, NotoSansCJKjp）を選択する
    xmlContent = xmlContent.replace(/w:eastAsia="zh-CN"/g, 'w:eastAsia="ja-JP"')
    xmlContent = xmlContent.replace(/w:eastAsia="zh-TW"/g, 'w:eastAsia="ja-JP"')

    // document.xml のみ: レイアウト最適化（全テンプレート共通）
    if (xmlFile === "word/document.xml") {
      // 1. 連続する空段落を圧縮（2つ以上→1つ）
      xmlContent = removeConsecutiveEmptyParagraphs(xmlContent)

      // 2. 段落間スペース・ページマージンを圧縮して前に詰める
      xmlContent = compactSpacing(xmlContent)

      // 3. 末尾の署名ブロックに keepNext を追加してページ分割を防止
      xmlContent = addKeepNextToEndBlock(xmlContent)
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
