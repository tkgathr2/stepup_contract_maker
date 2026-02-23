/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs")
const path = require("path")

/**
 * テンプレート .docx ファイルを DB に同期する
 * - 既存テンプレートの fileData を常にローカルファイルで更新（テンプレート差替え対応）
 * - テンプレートが0件なら初期作成
 */
async function syncTemplatesToDB() {
  let PrismaClient
  try {
    PrismaClient = require("@prisma/client").PrismaClient
  } catch {
    console.log("Prisma Client が見つかりません。DB同期をスキップします。")
    return
  }

  const prisma = new PrismaClient()
  try {
    const templatesDir = path.join(__dirname, "..", "templates")
    const templateDefs = [
      { name: "人材紹介契約書", type: "contract", file: "contract_template.docx" },
      { name: "送り状", type: "invoice", file: "invoice_template.docx" },
    ]

    // 既存テンプレートの fileData をローカルファイルで常に更新（テンプレート差替え対応）
    const existingTemplates = await prisma.template.findMany()
    let updatedCount = 0
    for (const existing of existingTemplates) {
      const def = templateDefs.find((d) => d.type === existing.type)
      if (!def) continue

      const localPath = path.join(templatesDir, def.file)
      if (!fs.existsSync(localPath)) continue

      const fileData = fs.readFileSync(localPath)

      // fileData が異なる場合のみ更新（名前も最新に）
      const existingSize = existing.fileData ? existing.fileData.length : 0
      if (existingSize !== fileData.length || !existing.fileData || !fileData.equals(existing.fileData)) {
        await prisma.template.update({
          where: { id: existing.id },
          data: { fileData, name: def.name },
        })
        console.log(`テンプレート更新: ${def.name} (id: ${existing.id})`)
        updatedCount++
      }
    }
    if (updatedCount > 0) {
      console.log(`${updatedCount} 件のテンプレートを更新しました。`)
    }

    // テンプレートが0件の場合のみ初期テンプレートを作成
    const existingCount = await prisma.template.count()
    if (existingCount > 0) {
      console.log(`DB に ${existingCount} 件のテンプレートが存在します。新規作成をスキップします。`)
      return
    }

    console.log("DB にテンプレートが存在しません。初期テンプレートを作成します。")
    for (const tpl of templateDefs) {
      const filePath = path.join(templatesDir, tpl.file)
      if (!fs.existsSync(filePath)) continue

      const fileData = fs.readFileSync(filePath)
      const dbPath = `/templates/${tpl.file}`

      await prisma.template.create({
        data: { name: tpl.name, type: tpl.type, filePath: dbPath, fileData },
      })
      console.log(`DB作成: ${tpl.name}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log("テンプレート DB 同期を開始します。")
  await syncTemplatesToDB()
  console.log("完了しました。")
}

main().catch(console.error)
