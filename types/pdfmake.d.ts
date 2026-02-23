declare module "pdfmake/src/Printer" {
  interface FontDescriptor {
    normal: string
    bold: string
    italics: string
    bolditalics: string
  }

  interface FontDescriptors {
    [fontName: string]: FontDescriptor
  }

  interface DocDefinition {
    content: unknown
    defaultStyle?: Record<string, unknown>
    styles?: Record<string, Record<string, unknown>>
    pageSize?: string
    pageMargins?: [number, number, number, number]
    [key: string]: unknown
  }

  interface PdfKitDocument {
    on(event: "data", callback: (chunk: Uint8Array) => void): void
    on(event: "end", callback: () => void): void
    on(event: "error", callback: (err: Error) => void): void
    end(): void
  }

  class PdfPrinter {
    constructor(fontDescriptors: FontDescriptors)
    createPdfKitDocument(docDefinition: DocDefinition): Promise<PdfKitDocument>
  }

  export default PdfPrinter
}
