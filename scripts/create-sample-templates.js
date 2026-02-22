/* eslint-disable @typescript-eslint/no-require-imports */
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx")
const fs = require("fs")
const path = require("path")

async function createContractTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "契約書",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "甲: 株式会社ステップアップ", bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "乙: {companyName}", bold: true }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "第1条（目的）",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "本契約は、甲と乙の間における取引について定めるものとする。",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "第2条（契約者情報）",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "乙の情報は以下の通りとする。",
          }),
          new Paragraph({
            children: [
              new TextRun("会社名: {companyName}"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun("住所: {address}"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun("代表者: {representativeName}"),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "第3条（有効期間）",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "本契約の有効期間は、締結日より1年間とする。",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "上記の契約を証するため、本書を2通作成し、甲乙記名押印の上、各1通を保有する。",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun("甲: 株式会社ステップアップ"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun("乙: {companyName} 代表取締役 {representativeName}"),
            ],
          }),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const templatesDir = path.join(__dirname, "..", "templates")

  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true })
  }

  fs.writeFileSync(path.join(templatesDir, "contract_template.docx"), buffer)
  console.log("契約書テンプレートを作成しました: templates/contract_template.docx")
}

async function createInvoiceTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "送り状",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "送付先",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "{companyName} 御中", bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun("〒"),
              new TextRun("{address}"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun("{representativeName} 様"),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "送付元",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "株式会社ステップアップ",
          }),
          new Paragraph({
            text: "東京都渋谷区〇〇1-2-3",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "送付内容",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "下記書類をお送りいたします。ご査収くださいますようお願い申し上げます。",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "記",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "1. 契約書 1部",
          }),
          new Paragraph({
            text: "2. 請求書 1部",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "以上",
            alignment: AlignmentType.RIGHT,
          }),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const templatesDir = path.join(__dirname, "..", "templates")

  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true })
  }

  fs.writeFileSync(path.join(templatesDir, "invoice_template.docx"), buffer)
  console.log("送り状テンプレートを作成しました: templates/invoice_template.docx")
}

async function main() {
  await createContractTemplate()
  await createInvoiceTemplate()
  console.log("\nサンプルテンプレートの作成が完了しました。")
}

main().catch(console.error)
