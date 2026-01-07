# AI_CONTEXT（最優先で読む）

## プロジェクト概要

株式会社ステップアップ向けの契約書・送り状自動生成システム（MVP版）。
Wordテンプレートに会社情報（会社名・住所・代表者名）を埋め込み、PDFとして出力するWebアプリケーション。

### 主要機能（MVP版）
- 会社情報の入力フォーム（会社名・住所・代表者名）
- 契約書と送り状の2つのPDFを同時生成
- 各PDFのダウンロード機能

### 技術スタック（MVP版）
- **フロントエンド**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **バックエンド**: Next.js API Routes
- **PDF生成**: docxtemplater + mammoth + puppeteer
- **デプロイ**: Railway

### MVP版で削除した機能
- Google OAuth認証（認証なし）
- データベース/Prisma（履歴保存なし）
- テンプレート管理機能
- 一括生成機能
- 生成履歴機能

## 現在のフェーズ

**Railwayデプロイ段階**

MVP版の実装は完了。
現在はRailway環境へのデプロイと動作確認を行っている段階。

## 直前にやった作業

- AI_CONTEXT.md を作成し、GitHubにpush済み
- プロジェクトの現状整理が完了

## 未解決の問題

- Railwayの最終デプロイ確認が未完了
- Google OAuthの本番設定は未対応

## 次にやるべきこと

- Railwayのデプロイログ確認
- Google OAuth本番リダイレクトURI設定
- 本番環境でログイン動作確認

## 技術的前提・制約

### MVP版の特徴
- **認証なし**: 誰でもアクセス可能
- **データベースなし**: 履歴保存なし
- **テンプレート固定**: templates/contract_template.docx, templates/invoice_template.docx

### 環境変数（MVP版）
MVP版では環境変数は不要（.env.localはコメントアウト済み）

### ファイル構造（MVP版）
```
app/
├── page.tsx               # メインページ（PDF生成フォーム）
├── layout.tsx             # レイアウト
├── api/
│   └── generate/route.ts  # PDF生成API
templates/
├── contract_template.docx # 契約書テンプレート
└── invoice_template.docx  # 送り状テンプレート
lib/
├── utils.ts               # ユーティリティ
├── logger.ts              # ログ機能
├── pdf-generator.ts       # PDF生成
└── template-processor.ts  # テンプレート処理
```

### テンプレートのプレースホルダー
- `{companyName}` - 会社名
- `{address}` - 住所
- `{representativeName}` - 代表者名

## 注意事項

1. **Puppeteerの制約**
   - サーバーレス環境（Vercel）では動作しない
   - RailwayではChromiumが必要（nixpacksで自動インストールされる予定）

2. **テンプレートファイル**
   - templates/ディレクトリに配置
   - .docx形式のみ対応
   - プレースホルダーは {変数名} 形式

---

**最終更新**: 2026-01-07
**リポジトリ**: https://github.com/tkgathr2/stepup_contract_maker
