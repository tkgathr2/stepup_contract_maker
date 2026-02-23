declare module "html-to-pdfmake" {
  interface HtmlToPdfmakeOptions {
    window?: Window
    defaultStyles?: Record<string, Record<string, unknown>>
    tableAutoSize?: boolean
    imagesByReference?: boolean
    removeExtraBlanks?: boolean
  }

  function htmlToPdfmake(
    html: string,
    options?: HtmlToPdfmakeOptions
  ): unknown[]

  export default htmlToPdfmake
}
