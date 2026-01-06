# 契約書・送り状PDF生成Webアプリケーション 仕様書

## 1. プロジェクト概要

### 1.1 目的
株式会社ステップアップ向けの契約書・送り状自動生成システム。Wordテンプレートに会社情報を埋め込み、PDFとして出力するWebアプリケーション。

### 1.2 対象ユーザー
- 株式会社ステップアップの社員
- Googleアカウントを持つユーザー

### 1.3 主要機能
- Google OAuth認証によるログイン
- 会社情報（会社名・住所・代表者名）の入力
- Wordテンプレートへのデータ埋め込み
- PDF生成とダウンロード
- テンプレート選択・管理
- 生成履歴の保存・閲覧
- 一括生成機能
- プレビュー機能

## 2. 技術仕様

### 2.1 技術スタック

#### フロントエンド
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS** (モダンなUI)
- **shadcn/ui** (コンポーネントライブラリ)

#### バックエンド
- **Next.js API Routes** (サーバーサイド処理)
- **docxtemplater** (Wordテンプレート処理)
- **puppeteer** または **@react-pdf/renderer** (PDF生成)
- **Prisma** (データベースORM)
- **SQLite** (開発) / **PostgreSQL** (本番)

#### 認証
- **NextAuth.js** (Google OAuth認証)
- **Google OAuth 2.0** (Googleアカウントでログイン)

#### デプロイ
- **Vercel** (推奨) または **Netlify**

### 2.2 ディレクトリ構造

```
stepup_contract_maker/
├── app/
│   ├── (auth)/
│   │   └── login/          # ログインページ（Google認証）
│   ├── (main)/
│   │   ├── dashboard/       # ダッシュボード
│   │   ├── generate/        # PDF生成ページ
│   │   ├── templates/       # テンプレート管理ページ
│   │   ├── history/         # 生成履歴ページ
│   │   └── batch/           # 一括生成ページ
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/  # NextAuth.js設定
│   │   ├── generate/
│   │   │   └── route.ts     # PDF生成API
│   │   ├── templates/
│   │   │   ├── route.ts     # テンプレート一覧取得
│   │   │   └── [id]/route.ts # テンプレート操作
│   │   └── history/
│   │       └── route.ts     # 履歴取得API
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── forms/
│   │   ├── CompanyForm.tsx  # 会社情報入力フォーム
│   │   └── BatchForm.tsx    # 一括入力フォーム
│   └── templates/
│       ├── TemplateSelector.tsx
│       └── TemplateEditor.tsx
├── lib/
│   ├── db.ts                # Prismaクライアント
│   ├── auth.ts              # NextAuth.js設定
│   ├── pdf-generator.ts     # PDF生成ロジック
│   ├── template-processor.ts # テンプレート処理
│   └── logger.ts            # ログ記録（ユーザー情報含む）
├── templates/               # Wordテンプレートファイル格納
│   ├── contract_template.docx
│   └── invoice_template.docx
├── public/
│   └── generated/          # 生成されたPDFファイル
├── logs/
│   └── debug_latest.txt     # デバッグログ
├── prisma/
│   └── schema.prisma        # データベーススキーマ
└── docs/
    ├── plan.md              # 本仕様書
    └── checkpoints.md       # チェックポイント
```

## 3. 機能仕様

### 3.1 認証機能

#### 3.1.1 Google OAuth認証
- **目的**: Googleアカウントでログイン
- **入力**: なし（Google認証画面で入力）
- **出力**: セッション確立、ダッシュボードへリダイレクト
- **処理フロー**:
  1. ユーザーが「Googleでログイン」ボタンをクリック
  2. Google OAuth認証画面にリダイレクト
  3. ユーザーがGoogleアカウントで認証
  4. 認証成功後、ユーザー情報（email, name, image, googleId）を取得
  5. データベースにユーザー情報を保存（初回ログイン時は新規作成）
  6. NextAuth.jsセッションを確立
  7. ダッシュボードにリダイレクト

#### 3.1.2 セッション管理
- NextAuth.jsのセッションを使用
- セッション情報: userId, email, name, image
- すべてのAPI Routeでセッション確認を実施

### 3.2 PDF生成機能（通常生成）

#### 3.2.1 入力項目
- **会社名** (必須): 文字列、最大100文字
- **住所** (必須): 文字列、最大500文字
- **代表者名** (必須): 文字列、最大100文字
- **テンプレート選択** (必須): 契約書 or 送り状

#### 3.2.2 処理フロー
1. ユーザーが会社情報を入力
2. テンプレートを選択
3. 「生成」ボタンをクリック
4. API Route (`/api/generate`) にPOSTリクエスト
5. セッション確認（認証チェック）
6. Wordテンプレートファイルを読み込み
7. docxtemplaterでデータ埋め込み
   - `{companyName}` → 入力された会社名
   - `{address}` → 入力された住所
   - `{representativeName}` → 入力された代表者名
8. PDFに変換（puppeteer使用）
9. PDFファイルを `/public/generated/` に保存
10. 生成履歴をデータベースに保存
11. PDFダウンロードURLを返却
12. ブラウザでPDFダウンロード開始

#### 3.2.3 出力
- PDFファイル（ダウンロード）
- 生成履歴への記録

### 3.3 一括生成機能

#### 3.3.1 入力方式
- **Webフォームで複数の会社情報を直接入力**
- 入力欄は動的に追加・削除可能
- 最低1件、上限なし（実用的には10-20件程度を想定）

#### 3.3.2 入力項目（各会社ごと）
- **会社名** (必須): 文字列、最大100文字
- **住所** (必須): 文字列、最大500文字
- **代表者名** (必須): 文字列、最大100文字

#### 3.3.3 処理フロー
1. ユーザーが一括生成ページを開く
2. テンプレートを選択
3. 複数の会社情報を入力（「+ 会社を追加」ボタンで追加）
4. 「一括生成」ボタンをクリック
5. 各会社情報に対してPDF生成処理を実行（並列処理推奨）
6. 各PDFファイルを個別に保存
7. 各PDFのダウンロードリンクを一覧表示

#### 3.3.4 出力
- 個別のPDFファイル（各会社ごとに1つのPDF）
- 各PDFのダウンロードリンク一覧
- 各PDFの生成履歴への記録

### 3.4 テンプレート管理機能

#### 3.4.1 テンプレート選択
- 利用可能なテンプレート一覧を表示
- テンプレートタイプでフィルタ（契約書/送り状）
- テンプレート名とプレビュー画像を表示

#### 3.4.2 テンプレートアップロード
- Word形式（.docx）のテンプレートファイルをアップロード
- ファイル名、タイプ（contract/invoice）を設定
- アップロード後、データベースに登録

#### 3.4.3 テンプレート編集
- 完全なエディタでテンプレートを編集
- プレースホルダーの確認・編集
- 保存後、テンプレートファイルを更新

### 3.5 プレビュー機能

#### 3.5.1 機能概要
- PDF生成前に内容を確認
- テンプレートと入力データの組み合わせをプレビュー表示

#### 3.5.2 処理フロー
1. 会社情報を入力
2. テンプレートを選択
3. 「プレビュー」ボタンをクリック
4. 一時的にPDFを生成（保存しない）
5. ブラウザ内でPDFを表示
6. 問題なければ「生成」ボタンで正式に生成

### 3.6 生成履歴機能

#### 3.6.1 履歴一覧表示
- ログインユーザーが生成したPDFの一覧を表示
- 生成日時、会社名、テンプレート名を表示
- ページネーション対応
- 検索・フィルタ機能（会社名、日付範囲）

#### 3.6.2 再ダウンロード
- 履歴からPDFを再ダウンロード可能
- PDFファイルが存在する場合のみダウンロード可能

### 3.7 ログ機能

#### 3.7.1 ログ記録対象
- PDF生成処理（開始・成功・失敗）
- テンプレート操作（アップロード・編集・削除）
- 認証処理（ログイン・ログアウト）
- エラー発生時

#### 3.7.2 ログフォーマット
```
[YYYY-MM-DD HH:mm:ss] [USER: userId/email/name] [ACTION: 処理名] メッセージ
```

#### 3.7.3 ログ例
```
[2024-01-15 14:30:25] [USER: user123/tanaka@example.com/田中太郎] [ACTION: PDF生成] 開始
[2024-01-15 14:30:26] [USER: user123/tanaka@example.com/田中太郎] [ACTION: テンプレート読み込み] 成功
[2024-01-15 14:30:27] [USER: user123/tanaka@example.com/田中太郎] [ACTION: PDF生成] 成功
[2024-01-15 14:35:10] [USER: user456/suzuki@example.com/鈴木花子] [ERROR] テンプレートファイルが見つかりません
```

#### 3.7.4 ログ保存先
- 開発環境: `logs/debug_latest.txt` (テキスト形式)
- 本番環境: 構造化ログ（JSON形式） + ファイルまたはログサービス

## 4. データモデル

### 4.1 User（ユーザー）

| フィールド名 | 型 | 説明 | 制約 |
|------------|-----|------|------|
| id | String | ユーザーID（UUID） | PK, 自動生成 |
| email | String | メールアドレス | UK, 必須 |
| name | String | ユーザー名 | 必須 |
| image | String | プロフィール画像URL | オプション |
| googleId | String | GoogleアカウントID | UK, 必須 |
| createdAt | DateTime | 作成日時 | 自動設定 |
| updatedAt | DateTime | 更新日時 | 自動更新 |

### 4.2 Template（テンプレート）

| フィールド名 | 型 | 説明 | 制約 |
|------------|-----|------|------|
| id | String | テンプレートID（UUID） | PK, 自動生成 |
| name | String | テンプレート名 | 必須 |
| type | String | タイプ（contract/invoice） | 必須 |
| filePath | String | ファイルパス | 必須 |
| createdAt | DateTime | 作成日時 | 自動設定 |
| updatedAt | DateTime | 更新日時 | 自動更新 |

### 4.3 GenerationHistory（生成履歴）

| フィールド名 | 型 | 説明 | 制約 |
|------------|-----|------|------|
| id | String | 履歴ID（UUID） | PK, 自動生成 |
| userId | String | ユーザーID | FK, 必須 |
| templateId | String | テンプレートID | FK, 必須 |
| companyName | String | 会社名 | 必須、最大100文字 |
| address | String | 住所 | 必須 |
| representativeName | String | 代表者名 | 必須 |
| pdfPath | String | PDFファイルパス | 必須 |
| createdAt | DateTime | 作成日時 | 自動設定 |

### 4.4 リレーション

- User 1:N GenerationHistory
- Template 1:N GenerationHistory

## 5. API仕様

### 5.1 認証API

#### GET /api/auth/signin
- **説明**: Google認証の開始
- **認証**: 不要
- **レスポンス**: Google認証画面へリダイレクト

#### GET /api/auth/callback/google
- **説明**: Google認証コールバック
- **認証**: 不要
- **レスポンス**: ダッシュボードへリダイレクト

#### POST /api/auth/signout
- **説明**: ログアウト
- **認証**: 必須
- **レスポンス**: ログインページへリダイレクト

### 5.2 PDF生成API

#### POST /api/generate
- **説明**: PDF生成
- **認証**: 必須
- **リクエストボディ**:
```json
{
  "companyName": "株式会社ABC",
  "address": "東京都渋谷区...",
  "representativeName": "山田太郎",
  "templateId": "template-uuid"
}
```
- **レスポンス**:
```json
{
  "success": true,
  "pdfUrl": "/generated/xxx.pdf",
  "historyId": "history-uuid"
}
```

### 5.3 一括生成API

#### POST /api/generate/batch
- **説明**: 一括PDF生成
- **認証**: 必須
- **リクエストボディ**:
```json
{
  "templateId": "template-uuid",
  "companies": [
    {
      "companyName": "株式会社ABC",
      "address": "東京都...",
      "representativeName": "山田太郎"
    },
    {
      "companyName": "株式会社XYZ",
      "address": "大阪府...",
      "representativeName": "佐藤花子"
    }
  ]
}
```
- **レスポンス**:
```json
{
  "success": true,
  "count": 2,
  "pdfs": [
    {
      "pdfUrl": "/generated/xxx-1.pdf",
      "companyName": "株式会社ABC",
      "historyId": "history-uuid-1"
    },
    {
      "pdfUrl": "/generated/xxx-2.pdf",
      "companyName": "株式会社XYZ",
      "historyId": "history-uuid-2"
    }
  ]
}
```

### 5.4 テンプレートAPI

#### GET /api/templates
- **説明**: テンプレート一覧取得
- **認証**: 必須
- **クエリパラメータ**: `?type=contract` (オプション)
- **レスポンス**:
```json
{
  "templates": [
    {
      "id": "template-uuid",
      "name": "標準契約書",
      "type": "contract",
      "filePath": "/templates/contract_template.docx"
    }
  ]
}
```

#### POST /api/templates
- **説明**: テンプレートアップロード
- **認証**: 必須
- **リクエスト**: multipart/form-data
  - file: Wordファイル
  - name: テンプレート名
  - type: contract/invoice

#### PUT /api/templates/[id]
- **説明**: テンプレート更新
- **認証**: 必須

#### DELETE /api/templates/[id]
- **説明**: テンプレート削除
- **認証**: 必須

### 5.5 履歴API

#### GET /api/history
- **説明**: 生成履歴一覧取得
- **認証**: 必須
- **クエリパラメータ**: 
  - `page`: ページ番号（デフォルト: 1）
  - `limit`: 1ページあたりの件数（デフォルト: 20）
  - `search`: 検索キーワード（会社名）
  - `from`: 開始日（YYYY-MM-DD）
  - `to`: 終了日（YYYY-MM-DD）
- **レスポンス**:
```json
{
  "histories": [
    {
      "id": "history-uuid",
      "companyName": "株式会社ABC",
      "templateName": "標準契約書",
      "pdfUrl": "/generated/xxx.pdf",
      "createdAt": "2024-01-15T14:30:27Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

## 6. UI/UX仕様

### 6.1 デザイン方針
- モダンで洗練されたUI
- レスポンシブデザイン（PC・タブレット・スマートフォン対応）
- shadcn/uiコンポーネントを使用

### 6.2 ページ構成

#### 6.2.1 ログインページ (`/login`)
- Googleでログインボタン
- シンプルで分かりやすいデザイン

#### 6.2.2 ダッシュボード (`/dashboard`)
- クイックアクション（新規生成、一括生成）
- 最近の生成履歴（最新5件）
- 統計情報（今月の生成数など）

#### 6.2.3 PDF生成ページ (`/generate`)
- 会社情報入力フォーム
- テンプレート選択ドロップダウン
- プレビューボタン
- 生成ボタン
- プレビュー表示エリア

#### 6.2.4 一括生成ページ (`/batch`)
- 複数の会社情報入力欄（動的追加・削除）
- テンプレート選択
- 一括生成ボタン
- 進捗表示
- 生成完了後、各PDFのダウンロードリンク一覧を表示

#### 6.2.5 テンプレート管理ページ (`/templates`)
- テンプレート一覧表示
- アップロード機能
- 編集・削除機能

#### 6.2.6 生成履歴ページ (`/history`)
- 履歴一覧表示（テーブル形式）
- 検索・フィルタ機能
- ページネーション
- 再ダウンロードボタン

### 6.3 エラーハンドリング

#### 6.3.1 バリデーションエラー
- フォーム内で即座にフィードバック
- エラーメッセージを赤色で表示
- 必須項目は明確に表示

#### 6.3.2 APIエラー
- トースト通知でエラーメッセージを表示
- 詳細なエラー情報はログに記録
- ユーザーには分かりやすいメッセージを表示

## 7. セキュリティ仕様

### 7.1 認証・認可
- Google OAuth 2.0による認証
- NextAuth.jsセッション管理
- すべてのAPI Routeで認証チェック
- ユーザーごとのデータ分離（自分の履歴のみ閲覧可能）

### 7.2 ファイルセキュリティ
- テンプレートファイルのアップロード検証（.docx形式のみ）
- ファイルサイズ制限（10MB以下）
- ファイルパストラバーサル対策
- 生成PDFファイルへのアクセス制御

### 7.3 データ保護
- ユーザー情報の暗号化（必要に応じて）
- SQLインジェクション対策（Prisma使用）
- XSS対策（Reactの自動エスケープ）

## 8. パフォーマンス要件

### 8.1 レスポンス時間
- ページ読み込み: 2秒以内
- PDF生成: 10秒以内（1件）
- 一括生成: 30秒以内（10件）

### 8.2 同時接続
- 最大100ユーザーの同時接続を想定

### 8.3 ファイルサイズ
- テンプレートファイル: 最大10MB
- 生成PDF: 最大5MB/件

## 9. エラー方針

### 9.1 エラー種別と対応

| エラー種別 | 対応方法 |
|----------|---------|
| テンプレート読み込み失敗 | エラーメッセージ表示、ログ記録 |
| PDF生成失敗 | リトライ機能、詳細エラーログ |
| 認証失敗 | 適切なエラーメッセージ、ログイン画面へリダイレクト |
| バリデーションエラー | フォーム内で即座にフィードバック |
| データベースエラー | エラーログ記録、ユーザーには一般的なエラーメッセージ |

### 9.2 ログ記録
- すべてのエラーをログに記録
- ユーザー情報を含めて記録
- エラー発生時のスタックトレースも記録

## 10. 成功条件

1. Googleアカウントでログインできる
2. 会社情報を入力してボタンクリックでPDFが生成される
3. 生成されたPDFに正しく会社情報が反映されている
4. テンプレート選択・プレビュー・履歴機能が使用可能
5. 一括生成で複数PDFが同時に生成される
6. すべてのログにユーザー情報が含まれている
7. レスポンシブデザインで各種デバイスで正常に動作する

## 11. 非機能要件

### 11.1 可用性
- 稼働率: 99%以上
- メンテナンス時間: 月1回、深夜帯

### 11.2 保守性
- コードはTypeScriptで記述
- 適切なコメントとドキュメント
- ログによる動作追跡

### 11.3 拡張性
- 新しいテンプレートタイプの追加が容易
- 新しい入力項目の追加が容易

## 12. 環境変数

### 12.1 必須環境変数

```env
# データベース
DATABASE_URL="postgresql://..."

# NextAuth.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 12.2 オプション環境変数

```env
# ログレベル
LOG_LEVEL="debug" # debug, info, warn, error

# ファイル保存先
UPLOAD_DIR="./templates"
GENERATED_DIR="./public/generated"
```

## 13. デプロイ仕様

### 13.1 デプロイ環境
- **推奨**: Vercel
- **代替**: Netlify

### 13.2 デプロイ手順
1. GitHubリポジトリにプッシュ
2. Vercel/Netlifyと連携
3. 環境変数を設定
4. デプロイ実行
5. 動作確認

### 13.3 データベース
- 開発: SQLite
- 本番: PostgreSQL (Vercel Postgres または外部サービス)

---

**最終更新日**: 2024-01-15
**バージョン**: 1.0

