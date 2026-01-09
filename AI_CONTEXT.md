# AI_CONTEXT（最優先で読む）

## プロジェクト概要

株式会社ステップアップ向けの契約書・送り状自動生成システム（v2版）。
Wordテンプレートに会社情報（会社名・住所・代表者名）を埋め込み、PDFとWord形式で出力するWebアプリケーション。

### 主要機能（v2版）
- **Google OAuth認証**: NextAuth.jsによるログイン機能
- **会社情報の入力フォーム**: 会社名・住所・代表者名・郵便番号自動検索
- **契約書と送付状の同時生成**: PDF・Word両形式で出力
- **生成履歴保存**: ローカルストレージによる履歴管理
- **メール送信機能**: 生成した書類をメールで送信
- **レスポンシブデザイン**: iPhone対応のパステルピンクUI

### 技術スタック
- **フロントエンド**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **バックエンド**: Next.js API Routes
- **認証**: NextAuth.js v4 + Google OAuth
- **PDF生成**: docxtemplater + mammoth + puppeteer
- **メール送信**: nodemailer
- **デプロイ**: Railway

## 現在のフェーズ

**v2開発完了 - テスト済み**

すべてのPhaseが完了し、動作確認済み。

### 完了したPhase
- Phase 1: Google OAuth認証機能
- Phase 2: 生成履歴保存機能・ダッシュボード
- Phase 3-5: UIデザイン改善・メール送信機能・統合テスト

## ファイル構造

```
app/
├── (auth)/
│   └── login/page.tsx       # ログインページ
├── (main)/
│   ├── layout.tsx           # メインレイアウト（ヘッダー付き）
│   ├── dashboard/page.tsx   # ダッシュボード
│   ├── generate/page.tsx    # 書類生成ページ
│   └── history/page.tsx     # 履歴一覧ページ
├── api/
│   ├── auth/[...nextauth]/  # NextAuth API
│   ├── generate/route.ts    # PDF生成API
│   ├── send-email/route.ts  # メール送信API
│   ├── files/[filename]/    # ファイルダウンロード
│   └── health/route.ts      # ヘルスチェック
├── layout.tsx               # ルートレイアウト
└── page.tsx                 # トップ（ダッシュボードへリダイレクト）

components/
├── forms/
│   ├── CompanyForm.tsx      # 会社情報入力フォーム
│   └── EmailForm.tsx        # メール送信フォーム
├── layout/
│   └── header.tsx           # ヘッダーコンポーネント
├── providers/
│   └── session-provider.tsx # セッションプロバイダー
└── ui/                      # shadcn/ui コンポーネント

lib/
├── auth.ts                  # NextAuth設定
├── local-storage.ts         # 履歴管理
├── pdf-generator.ts         # PDF生成
├── template-processor.ts    # テンプレート処理
├── docx-generator.ts        # Word出力
├── postal-code-lookup.ts    # 郵便番号検索
└── logger.ts                # ログ機能

templates/
├── contract_template.docx   # 契約書テンプレート
└── invoice_template.docx    # 送付状テンプレート
```

## 環境変数（必須）

```env
# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

## 動作確認済み項目

- [x] ログインページ表示
- [x] Google OAuth認証プロバイダー設定
- [x] 未認証時のリダイレクト（ダッシュボード、生成、履歴ページ）
- [x] API認証チェック（generate API）
- [x] ヘルスチェックAPI
- [x] ビルド成功

## 注意事項

1. **環境変数**: `.env.local`のGoogle OAuth設定が必須
2. **Puppeteerの制約**: サーバーレス環境（Vercel）では動作しない。Railway推奨
3. **テンプレートファイル**: templates/ディレクトリに配置、.docx形式のみ対応
4. **プレースホルダー**: `{companyName}`, `{address}`, `{representativeName}`

## 次にやるべきこと（本番デプロイ時）

1. Railwayで環境変数を設定
2. Google Cloud ConsoleでリダイレクトURIを本番URLに更新
3. 本番環境でログイン動作確認

---

**最終更新**: 2026-01-09
**ブランチ**: feature/v2-development
**リポジトリ**: https://github.com/tkgathr2/stepup_contract_maker
