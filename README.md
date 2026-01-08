# 契約書・送付状自動生成システム

WEBから取得した会社情報を使って、人材紹介契約書と送付状をPDFとWord形式で自動生成するシステムです。

## 主な機能

- **テンプレートベースの書類生成**: DOCXテンプレートから契約書と送付状を生成
- **郵便番号自動検索**: 住所から郵便番号を自動的に取得（主要70都市以上対応）
- **PDF・Word両方の出力**: 生成した書類をPDFとWord形式でダウンロード可能
- **プレビュー機能**: 契約書と送付状をブラウザでプレビュー
- **プレビュー切り替え**: 契約書 ↔ 送付状を切り替えて表示
- **和暦（令和）形式**: 日付が令和形式で自動生成
- **WEB UI**: ブラウザから簡単に書類を生成

## 技術スタック

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes
- **書類生成**: docxtemplater (Word), LibreOffice (DOCX→PDF変換), Puppeteer (PDF)
- **郵便番号検索**: ローカルデータベース（主要70都市以上）

## セットアップと起動

### 1. 必要な環境

- Node.js 20以上
- LibreOffice（PDF生成に必要）

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 使い方

### WEB UIから使用

1. ブラウザで http://localhost:3000 にアクセス
2. 会社情報を入力：
   - 会社名
   - 住所（入力後、自動的に郵便番号を検索）
   - 代表者名
3. 「書類を生成」ボタンをクリック
4. 生成された書類をダウンロード：
   - 契約書（PDF / Word）
   - 送付状（PDF / Word）
5. プレビューで確認：
   - 契約書と送付状を切り替えて表示

**自動機能:**
- 日付が自動的に今日の日付に設定されます（令和○年○月○日形式）
- 郵便番号が住所から自動検索されます
- 郵便番号に「〒」が自動的に付加されます

## デプロイ

### Railway へのデプロイ（推奨）

詳細なデプロイ手順は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

1. [Railway](https://railway.app) にアクセス
2. GitHubアカウントでログイン
3. 「New Project」→「Deploy from GitHub repo」
4. このリポジトリを選択
5. 自動的にデプロイが開始されます

**注意**: Railwayは `nixpacks.toml` の設定に基づいて、LibreOfficeを自動的にインストールします。

### デプロイ前のチェック

```bash
node scripts/pre-deployment-check.js
```

このスクリプトは以下をチェックします:
- ビルドが成功するか
- テンプレートファイルが存在するか
- 必要なディレクトリが存在するか
- デプロイ設定ファイルが正しいか

### Vercel へのデプロイ（非推奨）

現在の実装ではLibreOfficeを使用しているため、Vercelでのデプロイはサポートされていません。

## テスト

### テンプレート生成テスト

```bash
npx tsx scripts/test-template-generation.ts
```

生成されたファイルは `test-output/` に保存されます。

### 生成ファイルの検証

```bash
npx tsx scripts/verify-generated-files.ts
```

## 本番環境

### ビルド

```bash
npm run build
```

### 本番サーバーの起動

```bash
npm start
```

## プロジェクト構造

```
stepup_contract_maker/
├── app/
│   ├── api/generate/route.ts     # 書類生成API
│   ├── layout.tsx                 # レイアウト
│   └── page.tsx                   # メインページ
├── lib/
│   ├── docx-generator.ts          # Word出力
│   ├── pdf-generator.ts           # PDF出力
│   ├── template-processor.ts      # テンプレート処理
│   ├── postal-code-lookup.ts      # 郵便番号検索
│   └── logger.ts                  # ログ機能
├── templates/
│   ├── contract_template.docx     # 契約書テンプレート
│   └── invoice_template.docx      # 送付状テンプレート
├── public/
│   ├── generated/                 # 生成されたファイル
│   └── data/
│       └── postal-codes.json      # 郵便番号データ
├── railway.toml                   # Railwayデプロイ設定
├── nixpacks.toml                  # Nixpacks設定（LibreOffice）
├── DEPLOYMENT.md                  # デプロイ手順書
└── scripts/
    └── pre-deployment-check.js    # デプロイ前チェック
```

## トラブルシューティング

### LibreOfficeが見つからない

```bash
# Ubuntu/Debian
sudo apt-get install libreoffice

# macOS
brew install libreoffice

# Windows
# https://www.libreoffice.org/ からダウンロード
```

### Puppeteerが動作しない

```bash
# Ubuntu/Debian
sudo apt-get install -y chromium-browser
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## サポート

- **バグ報告**: GitHubのIssuesで報告してください
- **機能リクエスト**: GitHubのIssuesで提案してください

## 作成者

株式会社ステップアップ
