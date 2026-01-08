const fs = require("fs")
const { execSync } = require("child_process")

/**
 * デプロイ前の最終チェックスクリプト
 */

function preDeploymentCheck() {
  console.log("=".repeat(70))
  console.log("デプロイ前の最終チェック")
  console.log("=".repeat(70))

  let allChecksPassed = true
  const results = []

  // 1. ビルドの確認
  console.log("\n【1. ビルドの確認】")
  try {
    console.log("  npm run build を実行中...")
    execSync("npm run build", { stdio: "ignore" })
    console.log("  ✓ ビルドが成功しました")
    results.push({ check: "ビルド", passed: true })
  } catch (error) {
    console.log("  ✗ ビルドが失敗しました")
    allChecksPassed = false
    results.push({ check: "ビルド", passed: false })
  }

  // 2. テンプレートファイルの確認
  console.log("\n【2. テンプレートファイルの確認】")
  const templateFiles = [
    "templates/contract_template.docx",
    "templates/invoice_template.docx",
  ]

  templateFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file)
      console.log(`  ✓ ${file} (${stats.size} bytes)`)
      results.push({ check: `テンプレート: ${file}`, passed: true })
    } else {
      console.log(`  ✗ ${file} が見つかりません`)
      allChecksPassed = false
      results.push({ check: `テンプレート: ${file}`, passed: false })
    }
  })

  // 3. 必要なディレクトリの確認
  console.log("\n【3. 必要なディレクトリの確認】")
  const requiredDirs = [
    "public/generated",
    "logs",
    "public/data",
  ]

  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`  ✓ ${dir}`)
      results.push({ check: `ディレクトリ: ${dir}`, passed: true })
    } else {
      console.log(`  ✗ ${dir} が見つかりません`)
      allChecksPassed = false
      results.push({ check: `ディレクトリ: ${dir}`, passed: false })
    }
  })

  // 4. デプロイ設定ファイルの確認
  console.log("\n【4. デプロイ設定ファイルの確認】")
  const configFiles = [
    "railway.toml",
    "nixpacks.toml",
    "package.json",
  ]

  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✓ ${file}`)
      results.push({ check: `設定ファイル: ${file}`, passed: true })
    } else {
      console.log(`  ✗ ${file} が見つかりません`)
      allChecksPassed = false
      results.push({ check: `設定ファイル: ${file}`, passed: false })
    }
  })

  // 5. package.json のスクリプト確認
  console.log("\n【5. package.json のスクリプト確認】")
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"))
  const requiredScripts = ["build", "start"]

  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`  ✓ ${script}: ${packageJson.scripts[script]}`)
      results.push({ check: `スクリプト: ${script}`, passed: true })
    } else {
      console.log(`  ✗ ${script} スクリプトが見つかりません`)
      allChecksPassed = false
      results.push({ check: `スクリプト: ${script}`, passed: false })
    }
  })

  // 6. 依存パッケージの確認
  console.log("\n【6. 依存パッケージの確認】")
  const criticalPackages = [
    "next",
    "react",
    "docxtemplater",
    "libreoffice-convert",
    "puppeteer",
  ]

  criticalPackages.forEach(pkg => {
    if (packageJson.dependencies && packageJson.dependencies[pkg]) {
      console.log(`  ✓ ${pkg}: ${packageJson.dependencies[pkg]}`)
      results.push({ check: `パッケージ: ${pkg}`, passed: true })
    } else {
      console.log(`  ✗ ${pkg} が見つかりません`)
      allChecksPassed = false
      results.push({ check: `パッケージ: ${pkg}`, passed: false })
    }
  })

  // 7. .gitignore の確認
  console.log("\n【7. .gitignore の確認】")
  const gitignoreContent = fs.readFileSync(".gitignore", "utf-8")

  // テンプレートファイルが除外されていないことを確認
  if (!gitignoreContent.includes("templates/")) {
    console.log("  ✓ templates/ が除外されていません（正しい）")
    results.push({ check: ".gitignore: templates/", passed: true })
  } else {
    console.log("  ✗ templates/ が除外されています（誤り）")
    allChecksPassed = false
    results.push({ check: ".gitignore: templates/", passed: false })
  }

  // node_modulesが除外されていることを確認
  if (gitignoreContent.includes("node_modules")) {
    console.log("  ✓ node_modules が除外されています（正しい）")
    results.push({ check: ".gitignore: node_modules", passed: true })
  } else {
    console.log("  ✗ node_modules が除外されていません（誤り）")
    allChecksPassed = false
    results.push({ check: ".gitignore: node_modules", passed: false })
  }

  // 8. Git の状態確認
  console.log("\n【8. Git の状態確認】")
  try {
    const gitStatus = execSync("git status --porcelain", { encoding: "utf-8" })
    if (gitStatus.trim()) {
      console.log("  ⚠ コミットされていない変更があります:")
      console.log(gitStatus)
      console.log("  デプロイ前にコミットすることを推奨します")
      results.push({ check: "Git状態", passed: true, warning: true })
    } else {
      console.log("  ✓ すべての変更がコミットされています")
      results.push({ check: "Git状態", passed: true })
    }
  } catch (error) {
    console.log("  ⚠ Git状態の確認ができませんでした")
    results.push({ check: "Git状態", passed: true, warning: true })
  }

  // 総合結果
  console.log("\n" + "=".repeat(70))
  console.log("【総合結果】")
  console.log("=".repeat(70))

  const passedChecks = results.filter(r => r.passed).length
  const totalChecks = results.length
  const warnings = results.filter(r => r.warning).length

  console.log(`\n合格: ${passedChecks}/${totalChecks}`)
  if (warnings > 0) {
    console.log(`警告: ${warnings}件`)
  }

  if (allChecksPassed) {
    console.log("\n✓ 全てのチェックに合格しました")
    console.log("\n【次のステップ】")
    console.log("1. 変更をGitにコミット:")
    console.log("   git add .")
    console.log("   git commit -m \"デプロイ準備完了\"")
    console.log("   git push")
    console.log("")
    console.log("2. Railwayでデプロイ:")
    console.log("   - https://railway.app にアクセス")
    console.log("   - 「New Project」→「Deploy from GitHub repo」")
    console.log("   - このリポジトリを選択")
    console.log("   - 自動的にデプロイが開始されます")
    console.log("")
    console.log("3. デプロイ後の確認:")
    console.log("   - ビルドログを確認")
    console.log("   - LibreOfficeがインストールされているか確認")
    console.log("   - 提供されたURLにアクセスして動作確認")
    console.log("")
    console.log("詳細は DEPLOYMENT.md を参照してください。")
  } else {
    console.log("\n✗ いくつかのチェックに失敗しました")
    console.log("\n失敗した項目:")
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.check}`)
    })
    console.log("\n上記の項目を修正してから、再度このスクリプトを実行してください。")
  }

  console.log("\n" + "=".repeat(70))

  process.exit(allChecksPassed ? 0 : 1)
}

preDeploymentCheck()
