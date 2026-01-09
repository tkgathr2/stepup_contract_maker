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

**v2.0開発完了 - 全機能実装済み**

すべてのPhaseが完了し、コード品質改善も完了。

### 完了したPhase（初期開発）
- Phase 1: Google OAuth認証機能
- Phase 2: 生成履歴保存機能・ダッシュボード
- Phase 3-5: UIデザイン改善・メール送信機能・統合テスト
- コード品質改善（セキュリティ・保守性・パフォーマンス）

### 完了したPhase（v2機能追加）
- Phase 1: バージョン表示機能
  - lib/constants.ts追加（APP_VERSION = "2.0"）
  - ヘッダーにバージョンバッジ表示
  - 全ページにフッター追加
- Phase 2: お知らせセクション
  - lib/announcements.ts追加
  - ダッシュボードにお知らせカード表示
  - localStorage永続化（非表示設定）
- Phase 3: メール送信機能改善
  - CCフィールド追加（任意入力）
  - バリデーション対応
- Phase 4: 統合テスト（ビルド・TypeScript・ESLint確認済み）

### コード品質改善の内容
1. **セキュリティ強化**
   - メールアドレス検証の厳密化（RFC 5322準拠）
   - パストラバーサル防止の強化（拡張子チェック、null文字チェック）
   - 添付ファイルURLの検証追加
   - 入力値サニタイズの統一（lib/sanitize.ts）

2. **型定義の厳密化**
   - 共通型定義ファイル作成（types/index.ts）
   - localStorageのランタイムバリデーション追加

3. **コード重複の解消**
   - ダウンロード処理の共通化（lib/download.ts）
   - 日付フォーマットの共通化（lib/date-format.ts）

4. **パフォーマンス改善**
   - useMemo/useCallbackの活用
   - 検索Debounceの実装（300ms）

5. **エラーハンドリング改善**
   - Error Boundaryの追加（components/error-boundary.tsx）
   - ユーザーへのエラー通知統一（toast）

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
├── error-boundary.tsx       # エラーバウンダリー
└── ui/                      # shadcn/ui コンポーネント

lib/
├── auth.ts                  # NextAuth設定
├── local-storage.ts         # 履歴管理
├── pdf-generator.ts         # PDF生成
├── template-processor.ts    # テンプレート処理
├── docx-generator.ts        # Word出力
├── postal-code-lookup.ts    # 郵便番号検索
├── logger.ts                # ログ機能
├── sanitize.ts              # 入力値サニタイズ
├── download.ts              # ファイルダウンロード
├── date-format.ts           # 日付フォーマット
├── constants.ts             # アプリ定数（バージョン等）
└── announcements.ts         # お知らせ機能

types/
└── index.ts                 # 共通型定義

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
