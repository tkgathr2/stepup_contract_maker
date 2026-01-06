import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("シードデータを投入します...")

  // サンプルテンプレートを作成
  const contractTemplate = await prisma.template.upsert({
    where: { id: "sample-contract-template" },
    update: {},
    create: {
      id: "sample-contract-template",
      name: "標準契約書",
      type: "contract",
      filePath: "/templates/contract_template.docx",
    },
  })
  console.log(`テンプレート作成: ${contractTemplate.name}`)

  const invoiceTemplate = await prisma.template.upsert({
    where: { id: "sample-invoice-template" },
    update: {},
    create: {
      id: "sample-invoice-template",
      name: "標準送り状",
      type: "invoice",
      filePath: "/templates/invoice_template.docx",
    },
  })
  console.log(`テンプレート作成: ${invoiceTemplate.name}`)

  console.log("シードデータの投入が完了しました")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
