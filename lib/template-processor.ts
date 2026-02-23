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
 * numbering.xml から numId+ilvl → indent(left, hanging) のマッピングを構築する
 */
function buildNumberingIndentMap(numbXml: string): Record<string, { left: string; hanging: string }> {
  const map: Record<string, { left: string; hanging: string }> = {}

  // abstractNum の indent 定義を解析
  const abstractNums: Record<string, Record<string, { left: string; hanging: string }>> = {}
  const absRegex = /<w:abstractNum w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g
  let am
  while ((am = absRegex.exec(numbXml)) !== null) {
    const levels: Record<string, { left: string; hanging: string }> = {}
    const lvlRegex = /<w:lvl w:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvl>/g
    let lm
    while ((lm = lvlRegex.exec(am[2])) !== null) {
      const indMatch = lm[2].match(/<w:ind ([^/]*)\/>/);
      if (indMatch) {
        const leftM = indMatch[1].match(/w:left="(\d+)"/)
        const hangM = indMatch[1].match(/w:hanging="(\d+)"/)
        if (leftM) {
          levels[lm[1]] = { left: leftM[1], hanging: hangM ? hangM[1] : "0" }
        }
      }
    }
    abstractNums[am[1]] = levels
  }

  // numId → abstractNumId マッピング
  const numRegex = /<w:num w:numId="(\d+)"[^>]*>[\s\S]*?<w:abstractNumId w:val="(\d+)"\/>/g
  let nm
  while ((nm = numRegex.exec(numbXml)) !== null) {
    const absLevels = abstractNums[nm[2]]
    if (absLevels) {
      for (const [ilvl, ind] of Object.entries(absLevels)) {
        map[`${nm[1]}_${ilvl}`] = ind
      }
    }
  }

  return map
}

/**
 * Word文書からナンバリングプロパティ（w:numPr）を除去する
 * テンプレートの番号付きリスト定義が Word で ■ マーカーとしてレンダリングされるのを防止する
 * numbering.xml のインデント定義を読み取り、明示的な w:ind として段落に埋め込むことで
 * ■マーカーは消しつつインデント構造を保持する
 */
function stripNumberingProperties(zip: PizZip): void {
  // 1. numbering.xml からインデントマップを構築（削除前に読む）
  const numberingFile = zip.file("word/numbering.xml")
  const indentMap = numberingFile
    ? buildNumberingIndentMap(numberingFile.asText())
    : {}

  // 2. document.xml と styles.xml から numPr を除去し、インデントを明示的に設定
  const targets = ["word/document.xml", "word/styles.xml"]
  for (const target of targets) {
    const file = zip.file(target)
    if (!file) continue
    let xml = file.asText()

    xml = xml.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/g, (_match, inner: string) => {
      if (!inner.includes("<w:numPr>") && !inner.includes("<w:numPr/>")) {
        return _match
      }

      // numId と ilvl を取得
      const numIdMatch = inner.match(/<w:numId w:val="(\d+)"/)
      const ilvlMatch = inner.match(/<w:ilvl w:val="(\d+)"/)
      const numId = numIdMatch ? numIdMatch[1] : "0"
      const ilvl = ilvlMatch ? ilvlMatch[1] : "0"

      // numbering.xml から解決したインデント
      const resolvedInd = indentMap[`${numId}_${ilvl}`]

      // 既存の pPr 内 w:ind 属性を取得（numPr と共存する場合はオーバーライド値）
      const existingIndMatch = inner.match(/<w:ind([^/]*)\/>/);
      const existingAttrs: Record<string, string> = {}
      if (existingIndMatch) {
        const attrRegex = /w:(\w+)="([^"]*)"/g
        let attrM
        while ((attrM = attrRegex.exec(existingIndMatch[1])) !== null) {
          existingAttrs[attrM[1]] = attrM[2]
        }
      }

      // numPr を除去
      let cleaned = inner.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/g, "")
      cleaned = cleaned.replace(/<w:numPr\/>/g, "")

      // 既存の w:ind を除去（マージした値で再構築するため）
      cleaned = cleaned.replace(/<w:ind[^/]*\/>/g, "")

      // numbering.xml のインデントをベースに、pPr の既存 w:ind でオーバーライドしてマージ
      // Word の仕様: numPr + pPr w:ind 共存時、pPr の属性が numbering.xml を上書きする
      if (resolvedInd || Object.keys(existingAttrs).length > 0) {
        const merged: Record<string, string> = {}
        // ベース: numbering.xml の値
        if (resolvedInd) {
          merged["left"] = resolvedInd.left
          merged["hanging"] = resolvedInd.hanging
        }
        // オーバーライド: pPr の既存 w:ind 属性で上書き
        for (const [key, val] of Object.entries(existingAttrs)) {
          merged[key] = val
        }
        const attrs = Object.entries(merged).map(([k, v]) => `w:${k}="${v}"`).join(" ")
        cleaned = cleaned + `<w:ind ${attrs}/>`
      }

      return `<w:pPr>${cleaned}</w:pPr>`
    })

    zip.file(target, xml)
  }

  // 3. numbering.xml を除去
  if (numberingFile) {
    zip.remove("word/numbering.xml")

    // [Content_Types].xml から numbering.xml の参照を除去（Word修復ダイアログ防止）
    const ctFile = zip.file("[Content_Types].xml")
    if (ctFile) {
      let ct = ctFile.asText()
      ct = ct.replace(/<Override[^>]*PartName="\/word\/numbering\.xml"[^>]*\/>/g, "")
      zip.file("[Content_Types].xml", ct)
    }

    // word/_rels/document.xml.rels から numbering.xml の参照を除去
    const relsFile = zip.file("word/_rels/document.xml.rels")
    if (relsFile) {
      let rels = relsFile.asText()
      rels = rels.replace(/<Relationship[^>]*Target="numbering\.xml"[^>]*\/>/g, "")
      zip.file("word/_rels/document.xml.rels", rels)
    }
  }
}

export interface ProcessTemplateOptions {
  /** true の場合、PDF変換向けレイアウト最適化（keepNext, spacing圧縮, マージン縮小, 空段落削除）をスキップする */
  skipLayoutOptimization?: boolean
  /** true の場合、Word文書から中黒（■）マーカー（numPr）を削除する */
  removeNumbering?: boolean
}

/**
 * Wordテンプレートにデータを埋め込む（【】形式プレースホルダー対応）
 * @param template DB テンプレート行（filePath + fileData）
 * @param data 埋め込むデータ
 * @param options オプション（skipLayoutOptimization: Word DL用にレイアウト最適化をスキップ）
 * @returns 埋め込み後のWordファイルのBuffer
 */
export async function processTemplate(
  template: TemplateRecord,
  data: TemplateData,
  options?: ProcessTemplateOptions
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
    // Word DL用の場合はスキップ（keepNextの■マーカーやspacing変更が不要）
    if (xmlFile === "word/document.xml" && !options?.skipLayoutOptimization) {
      // 1. 連続する空段落を圧縮（2つ以上→1つ）
      xmlContent = removeConsecutiveEmptyParagraphs(xmlContent)

      // 2. 段落間スペース・ページマージンを圧縮して前に詰める
      xmlContent = compactSpacing(xmlContent)

      // 3. 末尾の署名ブロックに keepNext を追加してページ分割を防止
      xmlContent = addKeepNextToEndBlock(xmlContent)
    }

    zip.file(xmlFile, xmlContent)
  }

  // Word DL用: ナンバリングプロパティを除去して■マーカーを防止
  if (options?.removeNumbering) {
    stripNumberingProperties(zip)
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
