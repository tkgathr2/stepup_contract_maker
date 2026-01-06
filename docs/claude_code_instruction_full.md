# Claude Codeへの完全版実装指示

## 【最重要】基本ルール

1. **docs/plan.md を唯一の仕様として実装してください**
   - 仕様書に記載されていないことは推測で決めない
   - 不明点は必ずユーザーに確認する

2. **docs/checkpoints.md の CP-01 から順番に進めてください**
   - 各チェックポイントを完了してから次に進む
   - チェックポイント内のすべての項目を完了させる

3. **エラー発生時の対応**
   - 失敗したら直前のチェックポイントに戻る
   - 同じチェックポイントを再実行する
   - **logs/debug_latest.txt に原因が分かる形で記録する**
   - エラーログには必ずユーザー情報（userId, email, name）を含める
   - スタックトレースも記録する

4. **迷ったら必ずユーザーに確認する**
   - 推測で決めない
   - 仕様書に記載がない場合は質問する

---

## プロジェクト概要

株式会社ステップアップ向けの契約書・送り状自動生成システム。
Wordテンプレートに会社情報を埋め込み、PDFとして出力するWebアプリケーション。

### 主要機能
- Google OAuth認証によるログイン
- 会社情報（会社名・住所・代表者名）の入力
- Wordテンプレートへのデータ埋め込み
- PDF生成とダウンロード
- テンプレート選択・管理
- 生成履歴の保存・閲覧
- 一括生成機能（個別PDFとして出力）
- プレビュー機能

---

## 技術スタック

### フロントエンド
- **Next.js 14** (App Router) - 必須
- **React 18**
- **TypeScript** - 必須
- **Tailwind CSS** - 必須
- **shadcn/ui** - コンポーネントライブラリ（必須）

### バックエンド
- **Next.js API Routes** - サーバーサイド処理
- **docxtemplater** - Wordテンプレート処理（必須）
- **puppeteer** - PDF生成（必須、@react-pdf/rendererは使用しない）
- **Prisma** - データベースORM（必須）
- **SQLite** - 開発環境用データベース

### 認証
- **NextAuth.js** - Google OAuth認証（必須）
- **Google OAuth 2.0** - 認証プロバイダー

### その他
- **bcrypt** - パスワードハッシュ化（今回は使用しないが、将来の拡張用）
- **uuid** - ID生成

---

## ディレクトリ構造

```
stepup_contract_maker/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # ログインページ（Google認証ボタン）
│   ├── (main)/
│   │   ├── dashboard/
│   │   │   └── page.tsx          # ダッシュボード
│   │   ├── generate/
│   │   │   └── page.tsx          # PDF生成ページ
│   │   ├── templates/
│   │   │   └── page.tsx          # テンプレート管理ページ
│   │   ├── history/
│   │   │   └── page.tsx          # 生成履歴ページ
│   │   └── batch/
│   │       └── page.tsx          # 一括生成ページ
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts      # NextAuth.js設定
│   │   ├── generate/
│   │   │   ├── route.ts          # PDF生成API
│   │   │   └── batch/
│   │   │       └── route.ts      # 一括生成API
│   │   ├── templates/
│   │   │   ├── route.ts          # テンプレート一覧取得・アップロード
│   │   │   └── [id]/
│   │   │       └── route.ts      # テンプレート操作（取得・更新・削除）
│   │   └── history/
│   │       └── route.ts          # 履歴取得API
│   └── layout.tsx                 # ルートレイアウト
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── forms/
│   │   ├── CompanyForm.tsx       # 会社情報入力フォーム
│   │   └── BatchForm.tsx         # 一括入力フォーム
│   └── templates/
│       ├── TemplateSelector.tsx  # テンプレート選択コンポーネント
│       └── TemplateEditor.tsx    # テンプレート編集コンポーネント
├── lib/
│   ├── db.ts                     # Prismaクライアント
│   ├── auth.ts                   # NextAuth.js設定
│   ├── pdf-generator.ts          # PDF生成ロジック
│   ├── template-processor.ts     # テンプレート処理（docxtemplater）
│   └── logger.ts                 # ログ記録（ユーザー情報含む）
├── templates/                    # Wordテンプレートファイル格納
│   ├── contract_template.docx     # 契約書テンプレート（サンプル）
│   └── invoice_template.docx     # 送り状テンプレート（サンプル）
├── public/
│   └── generated/                # 生成されたPDFファイル
├── logs/
│   └── debug_latest.txt          # デバッグログ
├── prisma/
│   └── schema.prisma             # データベーススキーマ
└── docs/
    ├── plan.md                   # 仕様書（唯一の正）
    └── checkpoints.md            # チェックポイント
```

---

## データモデル（Prisma Schema）

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  image     String?
  googleId  String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  histories GenerationHistory[]
}

model Template {
  id        String   @id @default(uuid())
  name      String
  type      String   // "contract" or "invoice"
  filePath  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  histories GenerationHistory[]
}

model GenerationHistory {
  id                String   @id @default(uuid())
  userId            String
  templateId        String
  companyName       String   @db.VarChar(100)
  address           String   @db.Text
  representativeName String   @db.VarChar(100)
  pdfPath           String
  createdAt         DateTime @default(now())
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  template          Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
}
```

---

## 重要な仕様詳細

### 入力バリデーション
- **会社名**: 必須、最大100文字
- **住所**: 必須、最大500文字
- **代表者名**: 必須、最大100文字

### Wordテンプレートのプレースホルダー
テンプレート内で以下のプレースホルダーを使用：
- `{companyName}` - 会社名
- `{address}` - 住所
- `{representativeName}` - 代表者名

### 一括生成の出力形式
- **ZIPファイルではなく、個別のPDFファイルとして出力**
- 各PDFのダウンロードリンクを一覧表示
- レスポンス形式：
```json
{
  "success": true,
  "count": 2,
  "pdfs": [
    {
      "pdfUrl": "/generated/xxx-1.pdf",
      "companyName": "株式会社ABC",
      "historyId": "history-uuid-1"
    }
  ]
}
```

### ログ記録の仕様
- **すべてのログにユーザー情報を含める**
- フォーマット: `[YYYY-MM-DD HH:mm:ss] [USER: userId/email/name] [ACTION: 処理名] メッセージ`
- ログ記録対象：
  - PDF生成処理（開始・成功・失敗）
  - テンプレート操作（アップロード・編集・削除）
  - 認証処理（ログイン・ログアウト）
  - エラー発生時
- 保存先: `logs/debug_latest.txt`（開発環境）

### セキュリティ要件
- すべてのAPI Routeで認証チェックを実施
- NextAuth.jsのセッションを使用
- ユーザーごとのデータ分離（自分の履歴のみ閲覧可能）
- ファイルパストラバーサル対策
- テンプレートファイルのアップロード検証（.docx形式のみ、10MB以下）

---

## 実装チェックポイント詳細

### CP-01: プロジェクト初期化と基本セットアップ

1. **Next.js 14プロジェクトの作成**
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
   ```

2. **shadcn/uiのセットアップ**
   ```bash
   npx shadcn-ui@latest init
   ```
   - 必要なコンポーネント: button, input, label, select, card, table, toast, dialog

3. **基本的なディレクトリ構造の作成**
   - 上記のディレクトリ構造に従って作成
   - `logs/` ディレクトリを作成
   - `templates/` ディレクトリを作成
   - `public/generated/` ディレクトリを作成

4. **環境変数ファイル（.env.local）の作成**
   ```env
   # データベース
   DATABASE_URL="file:./dev.db"

   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

   # Google OAuth（後で設定）
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   ```

### CP-02: データベースと認証のセットアップ

1. **Prismaのインストールとセットアップ**
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```
   - `prisma/schema.prisma` を上記のデータモデルで作成
   - `npx prisma migrate dev --name init`
   - `npx prisma generate`

2. **Prismaクライアントの作成**
   - `lib/db.ts` を作成
   ```typescript
   import { PrismaClient } from '@prisma/client'

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined
   }

   export const db = globalForPrisma.prisma ?? new PrismaClient()

   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
   ```

3. **NextAuth.jsのインストールと設定**
   ```bash
   npm install next-auth
   ```
   - `lib/auth.ts` を作成（NextAuth.js設定）
   - `app/api/auth/[...nextauth]/route.ts` を作成
   - Google OAuthプロバイダーを設定

4. **ログインページの実装**
   - `app/(auth)/login/page.tsx` を作成
   - Googleでログインボタンを実装

5. **ミドルウェアの実装**
   - `middleware.ts` を作成（認証チェック）

### CP-03: ログシステムとテンプレート管理

1. **ログシステムの実装**
   - `lib/logger.ts` を作成
   - ユーザー情報を含むログ記録関数を実装
   - ファイルへの追記機能を実装

2. **テンプレートアップロード機能**
   - `app/api/templates/route.ts` のPOST実装
   - multipart/form-dataでファイルアップロード
   - ファイル検証（.docx形式、10MB以下）
   - `templates/` ディレクトリに保存

3. **テンプレート一覧取得API**
   - `app/api/templates/route.ts` のGET実装
   - 認証チェック
   - テンプレート一覧を返却

4. **テンプレート管理ページの実装**
   - `app/(main)/templates/page.tsx` を作成
   - テンプレート一覧表示
   - アップロード機能

### CP-04: PDF生成機能（通常生成）

1. **必要なライブラリのインストール**
   ```bash
   npm install docxtemplater pizzip file-saver
   npm install puppeteer
   npm install @types/file-saver
   ```

2. **テンプレート処理の実装**
   - `lib/template-processor.ts` を作成
   - docxtemplaterでWordテンプレートにデータ埋め込み

3. **PDF生成ロジックの実装**
   - `lib/pdf-generator.ts` を作成
   - WordファイルをPDFに変換（puppeteer使用）
   - `public/generated/` に保存

4. **PDF生成APIの実装**
   - `app/api/generate/route.ts` を作成
   - 認証チェック
   - バリデーション（会社名100文字、住所500文字、代表者名100文字）
   - テンプレート読み込み
   - データ埋め込み
   - PDF生成
   - 履歴保存
   - ログ記録

5. **会社情報入力フォームの実装**
   - `components/forms/CompanyForm.tsx` を作成
   - バリデーション実装

6. **PDF生成ページの実装**
   - `app/(main)/generate/page.tsx` を作成
   - フォーム、テンプレート選択、生成ボタン

7. **プレビュー機能の実装**
   - 一時的にPDF生成して表示
   - 保存しない

### CP-05: 一括生成と履歴機能

1. **一括生成フォームの実装**
   - `components/forms/BatchForm.tsx` を作成
   - 複数の会社情報入力欄（動的追加・削除）
   - バリデーション

2. **一括生成APIの実装**
   - `app/api/generate/batch/route.ts` を作成
   - 各会社情報に対してPDF生成（並列処理推奨）
   - **個別PDFとして出力（ZIPファイルではない）**
   - 各PDFのダウンロードリンクを返却

3. **一括生成ページの実装**
   - `app/(main)/batch/page.tsx` を作成
   - フォーム、進捗表示、ダウンロードリンク一覧

4. **生成履歴APIの実装**
   - `app/api/history/route.ts` を作成
   - 認証チェック
   - 自分の履歴のみ取得
   - ページネーション、検索、フィルタ対応

5. **生成履歴ページの実装**
   - `app/(main)/history/page.tsx` を作成
   - 履歴一覧表示（テーブル形式）
   - 検索・フィルタ機能
   - 再ダウンロードボタン

### CP-06: UI/UXの仕上げ

1. **ダッシュボードページの実装**
   - `app/(main)/dashboard/page.tsx` を作成
   - クイックアクション
   - 最近の生成履歴（最新5件）
   - 統計情報

2. **レスポンシブデザインの適用**
   - モバイル・タブレット・PC対応

3. **エラーハンドリングの実装**
   - トースト通知
   - エラーメッセージ表示

4. **ローディング状態の表示**
   - 生成中のローディング表示

5. **最終的な動作確認とテスト**

---

## API仕様詳細

### POST /api/generate
- **認証**: 必須（NextAuth.jsセッション）
- **リクエスト**:
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
- **エラー時**:
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### POST /api/generate/batch
- **認証**: 必須
- **リクエスト**:
```json
{
  "templateId": "template-uuid",
  "companies": [
    {
      "companyName": "株式会社ABC",
      "address": "東京都...",
      "representativeName": "山田太郎"
    }
  ]
}
```
- **レスポンス**:
```json
{
  "success": true,
  "count": 1,
  "pdfs": [
    {
      "pdfUrl": "/generated/xxx-1.pdf",
      "companyName": "株式会社ABC",
      "historyId": "history-uuid-1"
    }
  ]
}
```

### GET /api/templates
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

### GET /api/history
- **認証**: 必須
- **クエリパラメータ**: 
  - `page`: ページ番号（デフォルト: 1）
  - `limit`: 1ページあたりの件数（デフォルト: 20）
  - `search`: 検索キーワード（会社名）
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

---

## ログ記録の実装例

```typescript
// lib/logger.ts
export function logAction(userId: string, email: string, name: string, action: string, message: string) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logMessage = `[${timestamp}] [USER: ${userId}/${email}/${name}] [ACTION: ${action}] ${message}\n`;
  
  // logs/debug_latest.txt に追記
  // ファイルシステム操作で実装
}

export function logError(userId: string, email: string, name: string, error: Error) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logMessage = `[${timestamp}] [USER: ${userId}/${email}/${name}] [ERROR] ${error.message}\n${error.stack}\n`;
  
  // logs/debug_latest.txt に追記
}
```

---

## 環境変数の設定

### 開発環境（.env.local）
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="開発用のシークレットキー（適当な文字列でOK）"
GOOGLE_CLIENT_ID="Google OAuth 2.0 クライアントID"
GOOGLE_CLIENT_SECRET="Google OAuth 2.0 クライアントシークレット"
```

### Google OAuth設定手順
1. Google Cloud Consoleでプロジェクト作成
2. OAuth 2.0 クライアントIDを作成
3. 承認済みのリダイレクトURIに `http://localhost:3000/api/auth/callback/google` を追加
4. クライアントIDとシークレットを環境変数に設定

---

## 実装時の注意事項

1. **型安全性**
   - TypeScriptを厳密に使用
   - すべてのAPIレスポンスに型を定義

2. **エラーハンドリング**
   - try-catchで適切にエラーをキャッチ
   - ユーザーには分かりやすいエラーメッセージを表示
   - 詳細はログに記録

3. **パフォーマンス**
   - 一括生成は並列処理を検討
   - 大きなファイルの処理時は適切なタイムアウト設定

4. **セキュリティ**
   - すべてのAPI Routeで認証チェック
   - ファイルアップロードの検証
   - ファイルパストラバーサル対策

5. **UI/UX**
   - モダンで洗練されたデザイン
   - ローディング状態の表示
   - エラーメッセージの表示
   - レスポンシブデザイン

---

## 開始

まず **CP-01** から開始してください。

各チェックポイントを完了したら、次のチェックポイントに進みます。
エラーが発生した場合は、直前のチェックポイントに戻って再実行してください。

**docs/plan.md を常に参照しながら実装を進めてください。**


