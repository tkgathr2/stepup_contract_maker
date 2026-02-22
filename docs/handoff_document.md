# stepup_contract_maker システム引継書（AI向け完全版）

---

## 1. プロジェクト概要

### 1.1 システム名
契約書・送り状自動生成システム（StepUp Contract Maker）

### 1.2 目的
株式会社ステップアップが取引先企業との契約書・送り状をWordテンプレートから自動生成し、PDFとして出力するWebアプリケーション。会社名・住所・代表者名を入力するだけで、テンプレートに自動埋め込みされたPDFが生成される。単件生成・一括生成・プレビュー機能を備える。

### 1.3 基本情報
- **リポジトリ**: https://github.com/tkgathr2/stepup_contract_maker
- **本番URL**: https://stepupcontractmaker-production.up.railway.app/
- **デプロイ先**: Railway（masterブランチへのpushで自動デプロイ）
- **所有者**: 高木豊大（atsuhiro@takagi.bz / GitHub: @tkgathr2）

### 1.4 技術スタック一覧
| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.1.1 |
| UI ライブラリ | React | 19.2.3 |
| 言語 | TypeScript (strict mode) | ^5 |
| スタイリング | Tailwind CSS v4 | ^4 |
| UIコンポーネント | shadcn/ui (new-york style) | - |
| ORM | Prisma | ^5.22.0 |
| データベース | PostgreSQL | Railway提供 |
| 認証 | NextAuth.js (JWT戦略) | ^4.24.13 |
| OAuth | Google OAuth 2.0 | - |
| テンプレート処理 | docxtemplater + PizZip | ^3.67.6 / ^3.2.0 |
| PDF変換 | Puppeteer + mammoth | ^24.34.0 / ^1.11.0 |
| 通知 | sonner (トースト) | ^2.0.7 |
| ビルドツール | Nixpacks (Railway) | - |
| Node.js | 必須バージョン | >=20.0.0 |
| npm | 必須バージョン | >=10.0.0 |

---

## 2. ディレクトリ構造（完全版）

```
stepup_contract_maker/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # ルートレイアウト（AuthSessionProvider, Toaster）
│   ├── page.tsx                      # ルートページ（/dashboard にリダイレクト）
│   ├── globals.css                   # Tailwind CSS v4 グローバルスタイル（CSS変数定義）
│   ├── (auth)/                       # 認証グループ（レイアウトなし）
│   │   └── login/
│   │       └── page.tsx              # ログインページ（Googleログインボタン）
│   ├── (main)/                       # メイングループ（ナビゲーション付きレイアウト）
│   │   ├── layout.tsx                # メインレイアウト（ナビバー、ユーザー情報表示）
│   │   ├── dashboard/
│   │   │   └── page.tsx              # ダッシュボード（統計カード、最近の履歴、クイックアクション）
│   │   ├── generate/
│   │   │   └── page.tsx              # 単件PDF生成ページ（テンプレート選択、入力、プレビュー）
│   │   ├── batch/
│   │   │   └── page.tsx              # 一括PDF生成ページ（複数会社一括処理）
│   │   ├── templates/
│   │   │   └── page.tsx              # テンプレート管理ページ（アップロード、削除）
│   │   └── history/
│   │       └── page.tsx              # 生成履歴ページ（検索、ページネーション、DL）
│   └── api/                          # APIルート
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts          # NextAuth ハンドラ（GET/POST）
│       ├── generate/
│       │   ├── route.ts              # 単件PDF生成API（POST）
│       │   └── batch/
│       │       └── route.ts          # 一括PDF生成API（POST）
│       ├── history/
│       │   └── route.ts              # 履歴取得API（GET）
│       └── templates/
│           ├── route.ts              # テンプレート一覧/アップロード（GET/POST）
│           └── [id]/
│               └── route.ts          # テンプレート個別操作（GET/PUT/DELETE）
├── lib/                              # 共有ライブラリ
│   ├── auth.ts                       # NextAuth設定（Google OAuth、コールバック）
│   ├── db.ts                         # Prismaクライアント（シングルトン）
│   ├── template-processor.ts         # Wordテンプレート処理（docxtemplater）
│   ├── pdf-generator.ts              # PDF生成（Puppeteer + mammoth）
│   ├── logger.ts                     # ファイルログ（logs/debug_latest.txt）
│   └── utils.ts                      # ユーティリティ（cn関数: clsx + tailwind-merge）
├── components/                       # Reactコンポーネント
│   ├── providers/
│   │   └── session-provider.tsx      # NextAuth SessionProvider ラッパー
│   ├── forms/
│   │   ├── CompanyForm.tsx           # 会社情報入力フォーム（単件用）
│   │   └── BatchForm.tsx             # 会社情報一括入力フォーム
│   ├── templates/
│   │   └── TemplateSelector.tsx      # テンプレート選択ドロップダウン
│   └── ui/                           # shadcn/ui コンポーネント（8個）
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── sonner.tsx
│       └── table.tsx
├── types/
│   └── next-auth.d.ts                # NextAuth型拡張（Session.user.id追加）
├── prisma/
│   ├── schema.prisma                 # データベーススキーマ定義
│   ├── seed.ts                       # シードデータ（サンプルテンプレート2件）
│   └── migrations/
│       ├── migration_lock.toml       # プロバイダ: postgresql
│       └── 20260106114939_init/
│           └── migration.sql         # 初期マイグレーション（3テーブル）
├── scripts/
│   └── create-sample-templates.js    # サンプルDOCXテンプレート生成スクリプト
├── templates/                        # Wordテンプレートファイル格納先
│   ├── contract_template.docx        # 契約書テンプレート
│   └── invoice_template.docx         # 送り状テンプレート
├── public/
│   └── generated/                    # 生成済みPDF出力先（.gitkeep）
├── logs/                             # ログファイル出力先（.gitkeep）
├── .devin/
│   └── rules                         # Devin運用ルール（パーツスカウト制度、ノウハウキング連携）
├── middleware.ts                      # NextAuth認証ミドルウェア
├── package.json                      # 依存関係・スクリプト定義
├── tsconfig.json                     # TypeScript設定
├── nixpacks.toml                     # Railway ビルド設定（Chromium、日本語フォント）
├── eslint.config.mjs                 # ESLint設定（next/core-web-vitals + typescript）
├── postcss.config.mjs                # PostCSS設定（@tailwindcss/postcss）
├── components.json                   # shadcn/ui設定（new-york, neutral, lucide）
├── .gitignore                        # Git除外設定
└── next.config.ts                    # Next.js設定
```

---

## 3. データベーススキーマ

### 3.1 プロバイダ
PostgreSQL（Railway提供のマネージドDB）。接続URLは環境変数 `DATABASE_URL` で指定。

### 3.2 テーブル定義

#### User テーブル
ユーザー情報。Google OAuthログイン時に自動作成・更新される。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | TEXT (UUID) | PK, @default(uuid()) | ユーザーID |
| email | TEXT | UNIQUE, NOT NULL | メールアドレス |
| name | TEXT | NOT NULL | ユーザー名（Googleアカウント名） |
| image | TEXT | nullable | プロフィール画像URL |
| googleId | TEXT | UNIQUE, NOT NULL | GoogleアカウントID |
| createdAt | TIMESTAMP(3) | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP(3) | @updatedAt | 更新日時 |

リレーション: `histories` → GenerationHistory[] （1対多）

#### Template テーブル
アップロードされたWordテンプレートのメタデータ。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | TEXT (UUID) | PK, @default(uuid()) | テンプレートID |
| name | TEXT | NOT NULL | テンプレート表示名 |
| type | TEXT | NOT NULL | "contract"（契約書）or "invoice"（送り状） |
| filePath | TEXT | NOT NULL | ファイルパス（例: /templates/xxx.docx） |
| createdAt | TIMESTAMP(3) | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updatedAt | TIMESTAMP(3) | @updatedAt | 更新日時 |

リレーション: `histories` → GenerationHistory[] （1対多）

#### GenerationHistory テーブル
PDF生成の履歴。生成時に自動保存される。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | TEXT (UUID) | PK, @default(uuid()) | 履歴ID |
| userId | TEXT | FK → User.id, ON DELETE CASCADE | ユーザーID |
| templateId | TEXT | FK → Template.id, ON DELETE CASCADE | テンプレートID |
| companyName | TEXT | NOT NULL | 会社名 |
| address | TEXT | NOT NULL | 住所 |
| representativeName | TEXT | NOT NULL | 代表者名 |
| pdfPath | TEXT | NOT NULL | 生成PDFのパス |
| createdAt | TIMESTAMP(3) | DEFAULT CURRENT_TIMESTAMP | 生成日時 |

外部キー: userId → User(id) CASCADE, templateId → Template(id) CASCADE

### 3.3 シードデータ
`prisma/seed.ts` で以下の2件のサンプルテンプレートを投入可能：
- ID: `sample-contract-template` / 名前: 「標準契約書」 / type: "contract" / filePath: `/templates/contract_template.docx`
- ID: `sample-invoice-template` / 名前: 「標準送り状」 / type: "invoice" / filePath: `/templates/invoice_template.docx`

実行コマンド: `npm run db:seed` （内部: `npx tsx prisma/seed.ts`）

---

## 4. 認証システム

### 4.1 認証フロー全体像
```
ブラウザ → /login → 「Googleでログイン」ボタン
  ↓
signIn("google", { callbackUrl: "/dashboard" })
  ↓
Google OAuth 2.0 認証画面（accounts.google.com）
  ↓
承認後リダイレクト: /api/auth/callback/google
  ↓
NextAuth signIn コールバック実行
  ├── 新規ユーザー → db.user.create()
  └── 既存ユーザー → db.user.update()（名前・画像更新）
  ↓
JWTトークン発行 → セッションCookie設定
  ↓
/dashboard にリダイレクト
```

### 4.2 NextAuth設定詳細（lib/auth.ts）

**プロバイダ**: Google OAuth のみ
- clientId: `process.env.GOOGLE_CLIENT_ID`
- clientSecret: `process.env.GOOGLE_CLIENT_SECRET`

**コールバック**:
1. **signIn**: Googleログイン時にDBにユーザーを作成/更新。emailで既存ユーザーを検索し、なければcreate、あればupdate（name, image）。エラー時はfalseを返してログイン拒否。
2. **session**: セッションオブジェクトにDBのユーザーIDを追加（session.user.id）。emailでDBからユーザーを検索して紐付け。
3. **jwt**: ユーザーIDをJWTトークンに保存。

**セッション戦略**: JWT（データベースセッションではなくトークンベース）
**カスタムページ**: signIn → `/login`
**シークレット**: `process.env.NEXTAUTH_SECRET`

### 4.3 型拡張（types/next-auth.d.ts）
NextAuthのSession型を拡張して `user.id: string` を追加している。これによりTypeScriptで `session.user.id` にアクセス可能。

### 4.4 ミドルウェア（middleware.ts）
NextAuthの `withAuth` ミドルウェアで以下のルートを保護：
- `/dashboard/:path*`
- `/generate/:path*`
- `/templates/:path*`
- `/history/:path*`
- `/batch/:path*`
- `/api/generate/:path*`
- `/api/templates/:path*`
- `/api/history/:path*`

未認証ユーザーは自動的に `/login` にリダイレクトされる。

### 4.5 SessionProvider（components/providers/session-provider.tsx）
`"use client"` コンポーネントとしてNextAuthの `SessionProvider` をラップ。ルートレイアウト（app/layout.tsx）で全ページをラップすることで、クライアントコンポーネントから `useSession()` を利用可能にしている。

---

## 5. API エンドポイント完全仕様

### 5.1 認証API

#### GET/POST /api/auth/[...nextauth]
NextAuthが自動ハンドリング。login/callback/signout等のルート。
- ファイル: `app/api/auth/[...nextauth]/route.ts`
- `authOptions` を `lib/auth.ts` からインポートして使用

### 5.2 PDF生成API

#### POST /api/generate
単件PDF生成。テンプレートにデータを埋め込み、PDFを生成してファイルに保存。

**リクエストボディ**:
```json
{
  "companyName": "string（1-100文字、必須）",
  "address": "string（1-500文字、必須）",
  "representativeName": "string（1-100文字、必須）",
  "templateId": "string（UUID、必須）",
  "preview": "boolean（オプション、trueでプレビューモード）"
}
```

**処理フロー**:
1. セッション認証確認（401）
2. バリデーション（各フィールドの型・長さチェック）（400）
3. テンプレートをDBから取得（404）
4. `processTemplate()` でWordテンプレートにデータ埋め込み
5. **previewがtrue**: `generatePDFPreview()` → Base64返却
6. **previewがfalse**: `generatePDF()` → PDFファイル保存 → 履歴DB保存

**レスポンス（通常）**:
```json
{ "success": true, "pdfUrl": "/generated/xxx.pdf", "historyId": "uuid" }
```

**レスポンス（プレビュー）**:
```json
{ "success": true, "preview": true, "pdfBase64": "base64文字列" }
```

#### POST /api/generate/batch
一括PDF生成。複数会社のデータを並列処理。

**リクエストボディ**:
```json
{
  "templateId": "string（UUID、必須）",
  "companies": [
    {
      "companyName": "string（1-100文字）",
      "address": "string（1-500文字）",
      "representativeName": "string（1-100文字）"
    }
  ]
}
```

**処理フロー**:
1. 認証確認
2. templateId、companies配列のバリデーション
3. 各会社データの個別バリデーション（長さチェック）
4. テンプレートDB取得
5. `Promise.all()` で全会社を並列処理
   - 各会社: processTemplate → generatePDF → 履歴保存
   - 個別にtry/catchしており、一部失敗しても他は継続
6. 成功/失敗件数を集計して返却

**レスポンス**:
```json
{
  "success": true,
  "count": 5,
  "pdfs": [
    { "pdfUrl": "/generated/xxx.pdf", "companyName": "会社A", "historyId": "uuid" }
  ],
  "failedCount": 0
}
```

### 5.3 履歴API

#### GET /api/history
生成履歴の取得。ページネーション・検索・日付絞り込み対応。

**クエリパラメータ**:
| パラメータ | デフォルト | 説明 |
|-----------|-----------|------|
| page | 1 | ページ番号（1〜） |
| limit | 20 | 1ページあたりの件数（最大100） |
| search | "" | 会社名で部分一致検索 |
| from | null | 開始日（YYYY-MM-DD） |
| to | null | 終了日（YYYY-MM-DD、23:59:59まで含む） |

**フィルタリング**: 必ず `userId` でフィルタ（ログインユーザーの履歴のみ取得）。

**レスポンス**:
```json
{
  "histories": [
    {
      "id": "uuid",
      "companyName": "会社A",
      "address": "住所",
      "representativeName": "代表者",
      "templateName": "標準契約書",
      "templateType": "contract",
      "pdfUrl": "/generated/xxx.pdf",
      "createdAt": "2026-01-06T12:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### 5.4 テンプレートAPI

#### GET /api/templates
テンプレート一覧取得。

**クエリパラメータ**: `type`（オプション: "contract" | "invoice"）
**レスポンス**: `{ "templates": [{ id, name, type, filePath, createdAt, updatedAt }] }`

#### POST /api/templates
テンプレートアップロード（multipart/form-data）。

**フォームデータ**:
- `file`: DOCXファイル（必須、.docxのみ、10MB以下）
- `name`: テンプレート名（必須）
- `type`: "contract" | "invoice"（必須）

**処理**: UUIDでファイル名生成 → `/templates/` に保存 → DBに登録

#### GET /api/templates/[id]
テンプレート個別取得。

#### PUT /api/templates/[id]
テンプレートのname/typeを更新。ファイル差し替えは未対応（削除→再アップロードが必要）。

**リクエストボディ**: `{ "name": "新名前", "type": "contract" }`（部分更新可能）

#### DELETE /api/templates/[id]
テンプレートの削除。ファイルとDBレコードの両方を削除。関連する GenerationHistory もカスケード削除される。

---

## 6. コアビジネスロジック

### 6.1 テンプレート処理（lib/template-processor.ts）

#### processTemplate(templatePath, data) → Buffer
DOCXテンプレートにデータを埋め込んで新しいDOCX Bufferを返す。

**処理手順**:
1. `process.cwd()` + templatePath からファイル絶対パスを構築
2. ファイル存在チェック（なければエラー）
3. `fs.readFileSync()` でバイナリ読み込み
4. `PizZip` でZIP解凍
5. `Docxtemplater` でテンプレートエンジン初期化（paragraphLoop: true, linebreaks: true）
6. `doc.render()` でプレースホルダーにデータ埋め込み
7. `doc.getZip().generate()` でDEFLATE圧縮のnodebufferを生成

**テンプレート内プレースホルダー**:
- `{companyName}` → 会社名
- `{address}` → 住所
- `{representativeName}` → 代表者名

#### validateTemplate(templatePath) → { valid, errors }
テンプレートの有効性を検証。テストデータで `render()` を実行し、エラーがなければ valid=true。

### 6.2 PDF生成（lib/pdf-generator.ts）

#### getPuppeteerLaunchOptions()
Puppeteer起動オプションを動的に決定。Railway環境でシステムChromiumを使用するため。

**Chromium検出の優先順位**:
1. `process.env.PUPPETEER_EXECUTABLE_PATH`
2. `process.env.CHROMIUM_PATH`
3. ファイルシステム検索:
   - `/usr/bin/chromium`
   - `/usr/bin/chromium-browser`
   - `/usr/bin/google-chrome`
4. 見つからない場合: Puppeteer内蔵Chromiumを使用

**起動引数**: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`

#### generatePDF(docxBuffer, fileName?) → { pdfUrl, pdfPath }
DOCX Buffer → PDF ファイル生成。

**処理手順**:
1. `public/generated/` ディレクトリが存在しなければ作成
2. UUIDでPDFファイル名を生成
3. **mammoth** でDOCX → HTML変換（`mammoth.convertToHtml()`）
4. Puppeteerでブラウザ起動
5. HTMLにスタイル付きの完全なHTML文書を構築（A4サイズ、20mm余白、日本語フォント指定）
6. `page.setContent()` でHTMLをセット（waitUntil: "networkidle0"）
7. `page.pdf()` でPDF出力（A4、背景印刷あり、四方20mm余白）
8. ブラウザを閉じて結果を返却

**HTMLスタイル内のフォントファミリー**:
```css
font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
```
Railway環境では `fonts-noto-cjk`（Noto Sans CJK）が使用される。

#### generatePDFPreview(docxBuffer) → string (Base64)
プレビュー用。PDFをファイル保存せずBase64エンコードで返す。処理はgeneratePDFとほぼ同じだが、`page.pdf()` のpath引数なしでBufferを取得し、Base64化する。

#### deletePDF(pdfUrl) → void
指定されたPDFファイルを `public/generated/` から削除。

### 6.3 ログシステム（lib/logger.ts）
ファイルベースのログシステム。`logs/debug_latest.txt` に出力。

**関数一覧**:
| 関数 | 引数 | 用途 |
|------|------|------|
| logAction | userId, email, name, action, message | ユーザーアクション記録 |
| logError | userId, email, name, error | エラー記録（スタックトレース付き） |
| logAuth | action, userId, email, name, success | 認証イベント（LOGIN/LOGOUT） |
| logSystem | level, message | システムログ（INFO/WARN/ERROR） |

**ログフォーマット**: `[YYYY-MM-DD HH:mm:ss] [USER: id/email/name] [ACTION: xxx] message`

開発環境（NODE_ENV !== "production"）ではコンソールにも出力。

---

## 7. フロントエンドページ詳細

### 7.1 ルートレイアウト（app/layout.tsx）
- `<html lang="ja">` で日本語設定
- Geist Sans / Geist Mono フォント読み込み
- `AuthSessionProvider` で全ページをラップ（NextAuth SessionProvider）
- `Toaster` コンポーネント（sonner）でトースト通知を全画面で表示可能に
- メタデータ: title="契約書・送り状自動生成システム"

### 7.2 ルートページ（app/page.tsx）
`redirect("/dashboard")` でダッシュボードに即リダイレクト。サーバーコンポーネント。

### 7.3 ログインページ（app/(auth)/login/page.tsx）
- クライアントコンポーネント（"use client"）
- `Card` コンポーネント内に「Googleでログイン」ボタン
- GoogleのSVGアイコン付き
- `signIn("google", { callbackUrl: "/dashboard" })` を呼び出し
- 中央寄せ、灰色背景

### 7.4 メインレイアウト（app/(main)/layout.tsx）
認証済みページ共通のレイアウト。

**ナビゲーション項目**:
1. ダッシュボード (`/dashboard`)
2. PDF生成 (`/generate`)
3. 一括生成 (`/batch`)
4. テンプレート管理 (`/templates`)
5. 生成履歴 (`/history`)

**機能**:
- ヘッダーにアプリ名「StepUp Contract Maker」
- PC: 横並びナビゲーション（アクティブページは青色ボーダー）
- モバイル: 横スクロールナビゲーション
- 右上にユーザーアバター・名前・ログアウトボタン
- `signOut({ callbackUrl: "/login" })` でログアウト

### 7.5 ダッシュボード（app/(main)/dashboard/page.tsx）
クライアントコンポーネント。useEffectでデータ取得。

**統計カード（3枚）**:
1. 総生成数: `/api/history?limit=1` の total から取得
2. 今月の生成数: 今月1日以降の `from` パラメータで取得
3. 登録テンプレート数: `/api/templates` のlengthから取得

**クイックアクション（4枚）**: PDF生成、一括生成、テンプレート管理、生成履歴へのリンクカード

**最近の生成履歴**: `/api/history?limit=5` で直近5件を表示。テーブル形式（会社名、テンプレート、生成日時、DLボタン）。

### 7.6 PDF生成ページ（app/(main)/generate/page.tsx）
テンプレート選択 + 会社情報入力 → PDF生成/プレビュー。

**左カラム**: TemplateSelector + CompanyForm
**右カラム**: 生成結果（iframe でPDF表示 + ダウンロードボタン）/ プレビュー / 空状態

**handleGenerate**: POST /api/generate → pdfUrl取得 → iframeで表示
**handlePreview**: POST /api/generate (preview: true) → Base64 PDF → `data:application/pdf;base64,...` で iframe表示

### 7.7 一括生成ページ（app/(main)/batch/page.tsx）
複数会社を一括でPDF化。

**左カラム**: TemplateSelector + BatchForm（動的に会社行を追加/削除可能）
**右カラム**: 生成結果リスト + 「すべてダウンロード」ボタン

**一括ダウンロード**: 0.5秒間隔でsetTimeoutして順次ダウンロード（ブラウザの同時ダウンロード制限対策）

### 7.8 テンプレート管理ページ（app/(main)/templates/page.tsx）
テンプレートのCRUD。

**機能**:
- テンプレート一覧テーブル（名前、タイプ、作成日時、削除ボタン）
- 「テンプレートを追加」ダイアログ（Dialog コンポーネント）
  - テンプレート名（テキスト入力）
  - タイプ（Select: 契約書/送り状）
  - ファイル（.docx、10MB以下）
- 削除確認ダイアログ
- プレースホルダー説明セクション（{companyName}, {address}, {representativeName}）

### 7.9 生成履歴ページ（app/(main)/history/page.tsx）
過去の生成履歴の閲覧・検索。

**機能**:
- 会社名検索（部分一致）
- ページネーション（20件/ページ、前へ/次へボタン）
- テーブル: 会社名、代表者名、テンプレート（タイプ表示）、生成日時、ダウンロードボタン

### 7.10 共通コンポーネント

#### CompanyForm（components/forms/CompanyForm.tsx）
Props: onSubmit, onPreview?, isLoading?, isPreviewing?, submitLabel?
Export: CompanyData インターフェース（companyName, address, representativeName）

**バリデーション**:
- 会社名: 必須、100文字以内
- 住所: 必須、500文字以内
- 代表者名: 必須、100文字以内
- 文字数カウンター表示

#### BatchForm（components/forms/BatchForm.tsx）
Props: onSubmit(companies[]), isLoading?
動的に会社行を追加/削除。各行にcompanyName/address/representativeName入力欄。
「+ 会社を追加」ボタンで行追加。`crypto.randomUUID()` で各行のIDを生成。

#### TemplateSelector（components/templates/TemplateSelector.tsx）
Props: value, onChange, disabled?, filterType?
useEffectでAPI（/api/templates）からテンプレート一覧を取得。Selectドロップダウンで選択。テンプレートがない場合は「テンプレートがありません」メッセージ。

---

## 8. デプロイ・インフラ設定

### 8.1 Railway 設定

**Railway リソース情報**:
| 項目 | 値 |
|------|-----|
| Project ID | 4ca65e4d-799f-4db6-bc0f-d4131a2079fc |
| Service ID | 26b86412-5e21-40bc-9b5f-3b67595fc4fb |
| Environment ID | 19636a4a-6f91-4997-8807-5d03be936ffc |
| Domain | stepupcontractmaker-production.up.railway.app |
| Domain ID | 96e5f407-2a45-4bbe-9ea0-a783aa61bb6d |
| Domain targetPort | 8080 |

**デプロイトリガー**: masterブランチへのpushで自動デプロイ

### 8.2 nixpacks.toml（Railway ビルド設定）

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]
aptPkgs = [
  "chromium",          # Puppeteer用ヘッドレスブラウザ
  "libnss3",           # Chromium依存ライブラリ
  "libatk-bridge2.0-0",
  "libdrm2",
  "libxkbcommon0",
  "libgbm1",
  "libasound2",
  "libpango-1.0-0",
  "libcairo2",
  "libcups2",
  "libxrandr2",
  "libxdamage1",
  "libxcomposite1",
  "fonts-noto-cjk"     # 日本語フォント（PDF生成で必須）
]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npx prisma generate && npx next build"]

[start]
cmd = "npm start"
```

**重要ポイント**:
- `chromium` パッケージ: Puppeteerがシステム版Chromiumを使用（ダウンロード版より安定）
- `fonts-noto-cjk`: 日本語フォント。PDF内の日本語表示に必須
- Chromiumの共有ライブラリ群（libnss3等）: Chromiumの動作に必要

### 8.3 package.json スクリプト

```json
{
  "build": "prisma generate && next build",
  "start": "prisma migrate deploy && next start -H 0.0.0.0"
}
```

**ビルド時**: `prisma generate`（Prisma Client生成）→ `next build`（Next.jsビルド）
**起動時**: `prisma migrate deploy`（DBマイグレーション適用）→ `next start -H 0.0.0.0`

**重要**: `-H 0.0.0.0` フラグはRailway環境で必須。Next.js 16はデフォルトで`localhost`（127.0.0.1）のみにバインドするが、Railwayのリバースプロキシは `0.0.0.0` を必要とする。このフラグがないと502エラーになる。

### 8.4 環境変数一覧

| 変数名 | 必須 | 説明 | 設定場所 |
|--------|------|------|----------|
| DATABASE_URL | 必須 | PostgreSQL接続URL | Railway（自動設定） |
| GOOGLE_CLIENT_ID | 必須 | Google OAuth クライアントID | Railway環境変数 |
| GOOGLE_CLIENT_SECRET | 必須 | Google OAuth クライアントシークレット | Railway環境変数 |
| NEXTAUTH_SECRET | 必須 | JWTセッション暗号化キー | Railway環境変数 |
| NEXTAUTH_URL | 必須 | アプリの公開URL | Railway環境変数 |
| PORT | 自動 | Railwayが自動設定（8080） | Railway（自動） |
| PUPPETEER_EXECUTABLE_PATH | オプション | Chromiumパス（自動検出あり） | - |
| CHROMIUM_PATH | オプション | Chromiumパス（代替） | - |

**現在の設定値**:
- GOOGLE_CLIENT_ID: `465339095150-qdjugd8uj4aeio51110bkihpf5n1hjjg.apps.googleusercontent.com`
- NEXTAUTH_URL: `https://stepupcontractmaker-production.up.railway.app`
- Google Cloud Projectで「契約書自動生成システム」として設定済み
- 承認済みリダイレクトURI: `https://stepupcontractmaker-production.up.railway.app/api/auth/callback/google`

---

## 9. 処理フロー全体図

### 9.1 単件PDF生成フロー
```
[ブラウザ] /generate ページ
  │
  ├── テンプレート選択 ← GET /api/templates → TemplateSelector
  │
  └── 会社情報入力（CompanyForm）
        │
        ├── 「プレビュー」ボタン
        │     └── POST /api/generate { ...data, templateId, preview: true }
        │           → processTemplate() → DOCX Buffer
        │           → generatePDFPreview() → mammoth(DOCX→HTML) → Puppeteer(HTML→PDF) → Base64
        │           → { pdfBase64 } → iframe src="data:application/pdf;base64,..."
        │
        └── 「PDF生成」ボタン
              └── POST /api/generate { ...data, templateId }
                    → processTemplate() → DOCX Buffer
                    → generatePDF() → mammoth(DOCX→HTML) → Puppeteer(HTML→PDF) → ファイル保存
                    → db.generationHistory.create() → 履歴保存
                    → { pdfUrl } → iframe src="/generated/xxx.pdf" + ダウンロードボタン
```

### 9.2 一括PDF生成フロー
```
[ブラウザ] /batch ページ
  │
  ├── テンプレート選択
  └── 複数会社入力（BatchForm: 動的行追加）
        │
        └── POST /api/generate/batch { templateId, companies[] }
              → Promise.all(companies.map(company => {
                    processTemplate() → generatePDF() → db.generationHistory.create()
                }))
              → { count, pdfs[], failedCount }
              → 結果リスト表示 + 「すべてダウンロード」ボタン
```

### 9.3 DOCX → PDF 変換の詳細パイプライン
```
入力: DOCX Buffer（テンプレート処理済み）
  │
  ↓ mammoth.convertToHtml({ buffer })
  │
HTML文字列（テンプレートの内容がHTML化される）
  │
  ↓ HTMLテンプレートに埋め込み（A4スタイル、日本語フォント指定）
  │
完全なHTML文書
  │
  ↓ Puppeteer: page.setContent(html, { waitUntil: "networkidle0" })
  │
  ↓ Puppeteer: page.pdf({ format: "A4", margin: 20mm })
  │
出力: PDFファイル or Base64文字列
```

---

## 10. Wordテンプレートの仕様

### 10.1 テンプレートプレースホルダー
docxtemplaterの構文を使用。テンプレート内で `{変数名}` と記述すると、該当箇所がデータで置換される。

| プレースホルダー | 置換される値 |
|-----------------|-------------|
| {companyName} | 会社名 |
| {address} | 住所 |
| {representativeName} | 代表者名 |

### 10.2 サンプルテンプレート
`scripts/create-sample-templates.js` で生成可能（docxライブラリ使用）。

**契約書テンプレート** (`contract_template.docx`):
- 見出し: 「契約書」（中央寄せ）
- 甲: 株式会社ステップアップ
- 乙: {companyName}
- 第1条（目的）、第2条（契約者情報: {companyName}, {address}, {representativeName}）、第3条（有効期間）
- 署名欄: 甲・乙の記名押印

**送り状テンプレート** (`invoice_template.docx`):
- 見出し: 「送り状」（中央寄せ）
- 送付先: {companyName} 御中、〒{address}、{representativeName} 様
- 送付元: 株式会社ステップアップ
- 送付内容: 契約書1部、請求書1部

### 10.3 テンプレート保存先
- アップロード先: `/templates/` ディレクトリ
- ファイル名: UUID.docx（例: `a1b2c3d4-...-.docx`）
- DB上のfilePath: `/templates/UUID.docx`

---

## 11. shadcn/ui 設定

### 11.1 設定（components.json）
```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### 11.2 使用コンポーネント（8個）
Button, Card(CardHeader/CardContent/CardDescription/CardTitle), Dialog(DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter/DialogTrigger), Input, Label, Select(SelectContent/SelectItem/SelectTrigger/SelectValue), Sonner(Toaster), Table(TableBody/TableCell/TableHead/TableHeader/TableRow)

### 11.3 CSS変数（app/globals.css）
Tailwind CSS v4のカスタムテーマ。oklch色空間を使用。ライト/ダークモード両対応（`:root` と `.dark` ）。

---

## 12. TypeScript 設定

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] }
  }
}
```

**パスエイリアス**: `@/` → プロジェクトルート（例: `@/lib/auth` → `./lib/auth`）

---

## 13. ESLint設定

`eslint.config.mjs` でフラットコンフィグ使用：
- `eslint-config-next/core-web-vitals`: Next.js推奨ルール
- `eslint-config-next/typescript`: TypeScript用ルール
- 除外: `.next/`, `out/`, `build/`, `next-env.d.ts`

---

## 14. 過去に修正した問題と解決策

### 14.1 Prisma migration プロバイダ不一致
**問題**: `migration_lock.toml` が `provider = "sqlite"` だったが、`schema.prisma` は `provider = "postgresql"`
**解決**: マイグレーションファイルをPostgreSQL構文で再作成（`TIMESTAMP(3)`, `CONSTRAINT xxx_pkey PRIMARY KEY` 等）
**PR**: #6

### 14.2 Next.js 16 のlocalhostバインディング問題
**問題**: Next.js 16はデフォルトで `127.0.0.1` のみにバインドするが、Railwayのリバースプロキシは `0.0.0.0` を必要とする → 502エラー
**解決**: `package.json` の start スクリプトに `-H 0.0.0.0` を追加
**PR**: #8

### 14.3 Railway ドメイン targetPort 不一致
**問題**: Railwayドメインの targetPort が `3000` だったが、アプリは `PORT=8080`（Railway自動設定）でリスン
**解決**: Railway GraphQL API で targetPort を `8080` に変更

### 14.4 Puppeteer Chromium検出
**問題**: Railway環境ではPuppeteerのダウンロード版Chromiumが動作しない場合がある
**解決**: `getPuppeteerLaunchOptions()` 関数を追加。環境変数 → ファイルシステム検索の順でシステムChromiumを自動検出
**PR**: #5

### 14.5 nixpacks.tomlの追加
**問題**: Railwayでビルド時にChromiumと日本語フォントが必要
**解決**: `nixpacks.toml` を追加してaptPkgsでchromium, fonts-noto-cjk等をインストール
**PR**: #5

---

## 15. 開発ワークフロー

### 15.1 ローカル開発
```bash
# 必要: Node.js 20以上
git clone https://github.com/tkgathr2/stepup_contract_maker.git
cd stepup_contract_maker
npm install
# .envファイルを作成（DATABASE_URL, GOOGLE_CLIENT_ID等）
npx prisma generate
npx prisma migrate deploy
npm run dev
# → http://localhost:3000
```

### 15.2 デプロイフロー（Devin運用時）
1. 機能ブランチ作成: `git checkout -b devin/$(date +%s)-feature-name`
2. 実装・修正
3. `npm run lint` でリントチェック
4. コミット・プッシュ
5. `git_create_pr` でPR作成
6. CIが通るまで待機（`git_pr_checks`）
7. Auto-mergeを有効化
8. マージ完了確認
9. Railway自動デプロイ完了確認
10. 本番URLのログインテスト実施

### 15.3 Gitブランチ戦略
- `master`: 本番ブランチ（Railway自動デプロイ対象）
- 機能ブランチ → PR → masterにマージ
- **注意**: mainではなくmasterがデフォルトブランチ

---

## 16. 既知の制限事項・注意点

### 16.1 生成ファイルの非永続化
`public/generated/` に保存されたPDFは、Railwayの再デプロイ時に消失する。Railway のエフェメラルファイルシステムのため。永続化にはS3等の外部ストレージが必要。

### 16.2 未使用の依存パッケージ
- `puppeteer`: 使用中（PDF生成）
- `mammoth`: 使用中（DOCX→HTML変換）
- `docx` (^9.5.1): テンプレート生成スクリプトでのみ使用（本番ランタイムでは不使用）
- `next-themes` (^0.4.6): package.jsonにあるが使用箇所なし

### 16.3 Google OAuth テストモード
OAuth同意画面が「テスト」モードの場合、登録済みテストユーザーのみログイン可能。本番運用には「アプリを公開」が必要（Google Cloud Console → OAuth同意画面）。

### 16.4 ログファイルの非永続化
`logs/debug_latest.txt` もRailway再デプロイ時に消失。重要ログは外部ログサービスへの連携が必要。

### 16.5 テンプレートファイルの非永続化
`/templates/` 内のアップロードされたテンプレートもデプロイ時に消失する可能性がある。Gitリポジトリに含まれているsample-*テンプレートは問題ない。

---

## 17. .devin/rules（開発ルール）

### 17.1 パーツスカウト制度
新機能実装時、コードを書く前にOSSライブラリを調査する義務。GitHub Stars 1000+、週間DL 10万+、最終コミット6ヶ月以内、TypeScript対応、MIT/Apache 2.0/BSDライセンスが採用基準。自作は最終手段。

### 17.2 ノウハウキング連携
外部Knowledge DB（https://knowhow.up.railway.app）と連携。
- セッション開始時: `/api/devin/recall` で過去知見を検索
- セッション終了時: `/api/devin/memorize` で学びを記録
- project_key: リポジトリ名（"stepup_contract_maker"）

### 17.3 DEVIN運用ルール（憲法）
- 推測禁止、事実のみで行動
- Ask→Plan→Impl→Debug フェーズ制
- 同種の失敗2回で即停止
- Railway GraphQL APIでデプロイ
- 画面キャプチャ確認必須
- 1タスクのみ実行

---

## 18. セキュリティ考慮事項

### 18.1 認証保護
- middleware.tsで全ページ・APIルートを認証保護
- APIルートでは `getServerSession(authOptions)` でセッション検証
- 履歴は userId フィルタでユーザー固有データのみ返却

### 18.2 バリデーション
- 全APIで入力値の型・長さチェック
- テンプレートアップロード: .docxのみ、10MB以下
- テンプレートファイル名: UUID化（予測不能）

### 18.3 環境変数
- シークレット（GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET等）はRailway環境変数のみ
- `.env*` は `.gitignore` に含まれる
- データベースファイル（*.db）も `.gitignore` に含まれる

---

## 19. 今後の改善候補

1. **ファイル永続化**: S3/R2等の外部ストレージで生成PDF・テンプレートを永続化
2. **ログ永続化**: 外部ログサービス（Datadog, CloudWatch等）への連携
3. **テンプレートファイル差し替え**: 現在は削除→再アップロードが必要
4. **ユーザー管理**: 管理者機能、ユーザー一覧・権限管理
5. **未使用パッケージ削除**: docx, next-themes等の不要依存を整理
6. **テスト追加**: 現在テストコードなし。Jest + React Testing Library推奨
7. **エラーハンドリング強化**: ユーザー向けエラーメッセージの充実
8. **テンプレートプレビュー**: アップロード前にテンプレート内容を確認可能に
9. **CSV一括インポート**: BatchFormに加えてCSVファイルアップロードでの一括生成
10. **ダウンロードリンク有効期限**: 生成PDFの自動削除（TTL設定）

---

## 20. Railway GraphQL API リファレンス

Railway環境変数やドメイン設定はGraphQL APIで操作可能。

**エンドポイント**: `https://backboard.railway.com/graphql/v2`
**認証**: `Authorization: Bearer <RAILWAY_API_TOKEN>`

### 環境変数の設定（upsert）
```graphql
mutation {
  variableUpsert(input: {
    projectId: "4ca65e4d-799f-4db6-bc0f-d4131a2079fc"
    environmentId: "19636a4a-6f91-4997-8807-5d03be936ffc"
    serviceId: "26b86412-5e21-40bc-9b5f-3b67595fc4fb"
    name: "VARIABLE_NAME"
    value: "value"
  })
}
```

### ドメインのtargetPort変更
```graphql
mutation {
  serviceDomainUpdate(input: {
    id: "96e5f407-2a45-4bbe-9ea0-a783aa61bb6d"
    targetPort: 8080
  }) {
    id
    domain
    targetPort
  }
}
```

---

## 21. 依存関係の完全リスト

### dependencies
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| @prisma/client | ^5.22.0 | Prisma ORMクライアント |
| @radix-ui/react-dialog | ^1.1.15 | shadcn/ui Dialog基盤 |
| @radix-ui/react-label | ^2.1.8 | shadcn/ui Label基盤 |
| @radix-ui/react-select | ^2.2.6 | shadcn/ui Select基盤 |
| @radix-ui/react-slot | ^1.2.4 | shadcn/ui Slot基盤 |
| class-variance-authority | ^0.7.1 | CVA（コンポーネントバリアント） |
| clsx | ^2.1.1 | クラス名結合 |
| docx | ^9.5.1 | DOCXファイル生成（スクリプト用） |
| docxtemplater | ^3.67.6 | Wordテンプレート処理 |
| lucide-react | ^0.562.0 | アイコンライブラリ |
| mammoth | ^1.11.0 | DOCX→HTML変換 |
| next | 16.1.1 | Next.jsフレームワーク |
| next-auth | ^4.24.13 | 認証ライブラリ |
| next-themes | ^0.4.6 | テーマ切替（未使用） |
| pizzip | ^3.2.0 | ZIP処理（docxtemplater依存） |
| prisma | ^5.22.0 | Prisma CLI |
| puppeteer | ^24.34.0 | ヘッドレスブラウザ（PDF生成） |
| react | 19.2.3 | React |
| react-dom | 19.2.3 | React DOM |
| sonner | ^2.0.7 | トースト通知 |
| tailwind-merge | ^3.4.0 | Tailwindクラス結合 |
| uuid | ^13.0.0 | UUID生成 |

### devDependencies
| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| @tailwindcss/postcss | ^4 | Tailwind CSS PostCSSプラグイン |
| @types/node | ^20 | Node.js型定義 |
| @types/react | ^19 | React型定義 |
| @types/react-dom | ^19 | React DOM型定義 |
| @types/uuid | ^10.0.0 | UUID型定義 |
| eslint | ^9 | リンター |
| eslint-config-next | 16.1.1 | Next.js ESLint設定 |
| tailwindcss | ^4 | Tailwind CSS |
| tsx | ^4.21.0 | TypeScript実行（seed用） |
| tw-animate-css | ^1.4.0 | アニメーション |
| typescript | ^5 | TypeScript |

---

---

## 22. トラブルシューティングガイド

### 22.1 Railway デプロイ失敗時
1. Railway ダッシュボードでビルドログを確認
2. `nixpacks.toml` の aptPkgs が正しいか確認（パッケージ名の変更がないか）
3. `prisma generate` がビルド時に成功しているか確認
4. `DATABASE_URL` が正しく設定されているか確認

### 22.2 502エラーが出る場合
1. `package.json` の start スクリプトに `-H 0.0.0.0` があるか確認
2. Railway の targetPort がアプリの PORT と一致しているか確認（現在: 8080）
3. `prisma migrate deploy` が起動時に成功しているか確認

### 22.3 PDF生成が失敗する場合
1. Chromium がインストールされているか確認（`which chromium`）
2. `fonts-noto-cjk` がインストールされているか確認
3. `--no-sandbox` フラグが設定されているか確認
4. メモリ不足の場合は Railway のリソースを増強

### 22.4 Google ログインが失敗する場合
1. `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` が正しいか確認
2. Google Cloud Console のリダイレクト URI が正しいか確認
3. OAuth同意画面が「テスト」モードの場合、テストユーザーに追加されているか確認
4. `NEXTAUTH_URL` が本番URLと一致しているか確認
5. `NEXTAUTH_SECRET` が設定されているか確認

---

以上がstepup_contract_makerシステムの完全な引継書です。このドキュメントにはプロジェクトの全ファイル構造、全APIエンドポイント仕様、データベーススキーマ、認証フロー、コアビジネスロジック、デプロイ設定、環境変数、既知の問題と解決策、開発ルール、トラブルシューティングガイドが網羅されています。別のAIがこのドキュメントを読み込むだけで、プロジェクトの全体像を把握し、開発を継続できるようになっています。
