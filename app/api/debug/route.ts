import { NextResponse } from "next/server"
import { execSync } from "child_process"

export async function GET() {
  const info: Record<string, unknown> = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    tmpDir: process.env.TMPDIR || "/tmp",
    env: {
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || "not set",
      CHROMIUM_PATH: process.env.CHROMIUM_PATH || "not set",
      PUPPETEER_SKIP_DOWNLOAD: process.env.PUPPETEER_SKIP_DOWNLOAD || "not set",
    },
  }

  // Check which commands
  const cmds = ["which chromium", "which chromium-browser", "which google-chrome", "ls /tmp/", "ls /tmp/chromium* 2>/dev/null || echo 'no chromium in tmp'"]
  for (const cmd of cmds) {
    try {
      info[`cmd_${cmd.replace(/[^a-zA-Z]/g, "_")}`] = execSync(cmd, { encoding: "utf-8", timeout: 5000 }).trim()
    } catch (e) {
      info[`cmd_${cmd.replace(/[^a-zA-Z]/g, "_")}`] = `error: ${(e as Error).message?.substring(0, 200)}`
    }
  }

  // Try @sparticuz/chromium
  try {
    const chromium = (await import("@sparticuz/chromium")).default
    info.sparticuz_args = chromium.args
    info.sparticuz_graphics = chromium.graphics
    try {
      const execPath = await chromium.executablePath()
      info.sparticuz_executablePath = execPath
    } catch (e) {
      info.sparticuz_executablePath_error = (e as Error).message
      info.sparticuz_executablePath_stack = (e as Error).stack?.substring(0, 500)
    }
  } catch (e) {
    info.sparticuz_import_error = (e as Error).message
  }

  // Try puppeteer launch
  try {
    const chromium = (await import("@sparticuz/chromium")).default
    const puppeteer = (await import("puppeteer-core")).default
    const execPath = await chromium.executablePath()
    info.attempting_launch = true
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: execPath,
      args: chromium.args,
    })
    const version = await browser.version()
    info.browser_version = version
    await browser.close()
    info.launch_success = true
  } catch (e) {
    info.launch_error = (e as Error).message
    info.launch_stack = (e as Error).stack?.substring(0, 500)
  }

  return NextResponse.json(info, { status: 200 })
}
