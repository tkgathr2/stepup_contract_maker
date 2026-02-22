import { NextResponse } from "next/server"
import { execSync } from "child_process"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 10000 }).trim()
  } catch (e: unknown) {
    const err = e as { message?: string }
    return `ERROR: ${err.message?.substring(0, 200) || "unknown"}`
  }
}

export async function GET() {
  const info: Record<string, unknown> = {}

  // Environment
  info.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH || "(not set)"
  info.NODE_ENV = process.env.NODE_ENV
  info.platform = process.platform
  info.arch = process.arch

  // Find marker libraries
  info.find_libnspr4 = run("find / -name 'libnspr4.so' -type f 2>/dev/null | head -10")
  info.find_libnss3 = run("find / -name 'libnss3.so' -type f 2>/dev/null | head -10")
  info.find_libgbm = run("find / -name 'libgbm.so*' -type f 2>/dev/null | head -10")
  info.find_libasound = run("find / -name 'libasound.so*' -type f 2>/dev/null | head -10")

  // Check standard paths
  info.ls_usr_lib_x86 = run("ls /usr/lib/x86_64-linux-gnu/libnspr4* /usr/lib/x86_64-linux-gnu/libnss3* 2>/dev/null || echo 'not found'")
  info.ls_nix_store = run("ls /nix/store/ 2>/dev/null | head -20 || echo 'no /nix/store'")

  // Check if apt packages were installed
  info.dpkg_libnspr4 = run("dpkg -l libnspr4 2>/dev/null | tail -1 || echo 'dpkg not found or not installed'")
  info.dpkg_libnss3 = run("dpkg -l libnss3 2>/dev/null | tail -1 || echo 'dpkg not found or not installed'")

  // @sparticuz/chromium info
  try {
    const execPath = await chromium.executablePath()
    info.chromium_execPath = execPath
    info.chromium_exists = run(`test -f '${execPath}' && echo 'exists' || echo 'not found'`)
    info.chromium_file = run(`file '${execPath}' 2>/dev/null || echo 'file cmd failed'`)
    info.chromium_ldd = run(`ldd '${execPath}' 2>&1 | head -30 || echo 'ldd failed'`)
  } catch (e: unknown) {
    const err = e as { message?: string }
    info.chromium_error = err.message
  }

  // Try launching puppeteer with detailed error
  try {
    // First run ensureLibraryPaths equivalent
    const markers = ["libnspr4.so", "libnss3.so", "libgbm.so.1"]
    const dirs = new Set<string>()
    for (const lib of markers) {
      try {
        const result = execSync(`find /nix /usr /lib -name '${lib}' 2>/dev/null || true`, {
          encoding: "utf-8",
          timeout: 5000,
        }).trim()
        for (const line of result.split("\n")) {
          if (line) {
            const dir = line.substring(0, line.lastIndexOf("/"))
            if (dir) dirs.add(dir)
          }
        }
      } catch {
        // ignore
      }
    }
    info.discovered_lib_dirs = [...dirs]

    const existing = process.env.LD_LIBRARY_PATH || ""
    const newPath = [...dirs, ...existing.split(":").filter(Boolean)].join(":")
    process.env.LD_LIBRARY_PATH = newPath
    info.updated_LD_LIBRARY_PATH = newPath

    const execPath = await chromium.executablePath()
    info.chromium_ldd_after_fix = run(`LD_LIBRARY_PATH='${newPath}' ldd '${execPath}' 2>&1 | head -40 || echo 'ldd failed'`)

    const browser = await puppeteer.launch({
      headless: true as const,
      executablePath: execPath,
      args: chromium.args,
    })
    info.launch_success = true
    await browser.close()
  } catch (e: unknown) {
    const err = e as { message?: string; stack?: string }
    info.launch_success = false
    info.launch_error = err.message?.substring(0, 500)
    info.launch_stack = err.stack?.substring(0, 500)
  }

  return NextResponse.json(info, { status: 200 })
}
