# AI_CONTEXT（最優先で読む）

## プロジェクト概要

株式会社ステップアップ向けの契約書・送り状自動生成システム。
Wordテンプレートに会社情報（会社名・住所・代表者名）を埋め込み、PDFとして出力するWebアプリケーション。

### 主要機能
- Google OAuth認証によるログイン
- 会社情報の入力フォーム
- Wordテンプレートへのデータ埋め込み（docxtemplater）
- PDF生成とダウンロード（mammoth + puppeteer）
- テンプレート管理（アップロード/一覧/削除）
- 一括生成機能（複数会社を同時にPDF化）
- 生成履歴の保存・閲覧・再ダウンロード
- プレビュー機能

### 技術スタック
- **フロントエンド**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **バックエンド**: Next.js API Routes, Prisma, PostgreSQL（本番）/SQLite（ローカル）
- **認証**: NextAuth.js + Google OAuth 2.0
- **PDF生成**: docxtemplater + mammoth + puppeteer
- **デプロイ**: Railway

## 現在のフェーズ

**Railwayデプロイ段階**

全チェックポイント（CP-01〜CP-06）の実装は完了。
現在はRailway環境へのデプロイと動作確認を行っている段階。

## 直前にやった作業

- AI_CONTEXT.md を作成し、GitHubにpush済み
- プロジェクトの現状整理が完了

## 未解決の問題

1. **Railwayの最終デプロイ確認が未完了**
   - PostgreSQL対応の修正をプッシュしたが、デプロイ結果の最終確認が必要

2. **Google OAuthの本番設定は未対応**
   - Railway本番URLでのOAuthリダイレクトURI設定が必要
   - Google Cloud Consoleで本番URLを承認済みリダイレクトURIに追加する必要あり

## 次にやるべきこと

1. Railwayのデプロイログ確認
2. Google OAuth本番リダイレクトURI設定
3. 本番環境でログイン動作確認

## 技術的前提・制約

### データベース
- **本番（Railway）**: PostgreSQL（RailwayのPostgreSQLプラグイン）
- **ローカル**: 現在SQLiteからPostgreSQLに変更済み

### 環境変数（Railway）
```
DATABASE_URL=（Railwayが自動設定）
NEXTAUTH_URL=https://[your-railway-url]
NEXTAUTH_SECRET=kNzzEYVuBo0Lqx09t2hxoT6vK1zCZ5WURL4aizG/fI0=
GOOGLE_CLIENT_ID=982824690996-c0eusd16pndklfbgr2hb6scecpt73le2.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### 環境変数（ローカル .env.local）
```
DATABASE_URL=file:./dev.db（※PostgreSQL変更後は要修正）
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=i1DL5x7og2QJ7K6/hOayhO/wop3FOD9DBCRorKO8RYY=
GOOGLE_CLIENT_ID=982824690996-c0eusd16pndklfbgr2hb6scecpt73le2.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### ファイル構造（重要）
```
app/
├── (auth)/login/          # ログインページ
├── (main)/                # 認証必須ページ
│   ├── dashboard/         # ダッシュボード
│   ├── generate/          # PDF生成
│   ├── batch/             # 一括生成
│   ├── templates/         # テンプレート管理
│   └── history/           # 生成履歴
├── api/
│   ├── auth/[...nextauth]/ # NextAuth.js
│   ├── generate/          # PDF生成API
│   ├── templates/         # テンプレートAPI
│   └── history/           # 履歴API
lib/
├── auth.ts                # NextAuth設定
├── db.ts                  # Prismaクライアント
├── logger.ts              # ログ機能
├── pdf-generator.ts       # PDF生成
└── template-processor.ts  # テンプレート処理
```

## 注意事項（絶対に推測しないこと）

1. **仕様はdocs/plan.mdが唯一の正**
   - 仕様書に記載されていないことは推測で決めない
   - 不明点は必ずユーザーに確認する

2. **ログには必ずユーザー情報を含める**
   - フォーマット: `[YYYY-MM-DD HH:mm:ss] [USER: userId/email/name] [ACTION: 処理名] メッセージ`
   - logs/debug_latest.txt に記録

3. **一括生成はZIPではなく個別PDF**
   - 複数会社の一括生成時は、ZIPファイルではなく個別PDFとして出力
   - 各PDFのダウンロードリンクを一覧表示

4. **エラー発生時の対応**
   - logs/debug_latest.txtに原因が分かる形で記録
   - エラーログには必ずユーザー情報とスタックトレースを含める

5. **セキュリティ要件**
   - すべてのAPI Routeで認証チェックを実施
   - ユーザーごとのデータ分離（自分の履歴のみ閲覧可能）
   - テンプレートは.docx形式のみ、10MB以下

---

**最終更新**: 2026-01-06
**リポジトリ**: https://github.com/tkgathr2/stepup_contract_maker
