import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), "public", "data", "postal-codes.json")

    // ファイルの存在確認
    const exists = fs.existsSync(dataPath)

    if (!exists) {
      return NextResponse.json({
        status: "error",
        message: "postal-codes.json not found",
        path: dataPath,
        cwd: process.cwd(),
      })
    }

    // ファイルを読み込み
    const fileContent = fs.readFileSync(dataPath, "utf-8")
    const postalData = JSON.parse(fileContent)
    const keys = Object.keys(postalData)

    // テスト検索
    const testAddress = "東京都港区六本木1-2-3"
    let matchedKey = ""
    let matchedValue = ""

    for (const key of keys) {
      if (testAddress.startsWith(key)) {
        if (key.length > matchedKey.length) {
          matchedKey = key
          matchedValue = postalData[key]
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      path: dataPath,
      totalEntries: keys.length,
      sampleKeys: keys.slice(0, 5),
      testAddress,
      matchedKey,
      matchedValue,
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
