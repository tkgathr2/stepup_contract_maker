# 契約書・送り状PDF生成Webアプリケーション 仕様書 V2.0

## 1. プロジェクト概要

### 1.1 目的
株式会社ステップアップ向けの契約書・送り状自動生成システム（V2版）。
Wordテンプレートに会社情報を埋め込み、PDFとWord形式で出力するWebアプリケーション。
V2では、バージョン表示、お知らせ機能、メール送信機能（Gmail専用）、生成履歴保存（ローカルストレージ）、iPhone対応UIを追加。

### 1.2 対象ユーザー
- 株式会社ステップアップの社員
- Googleアカウントを持つユーザー
- iPhone等のスマートフォンユーザー

### 1.3 主要機能（V2版）
- Google OAuth認証によるログイン
- 会社情報（会社名・住所・代表者名）の入力
- 郵便番号自動検索機能
- Wordテンプレートへのデータ埋め込み
- 契約書と送付状の同時生成（PDF・Word両形式）
- 生成履歴保存（ブラウザローカルストレージ）
- メール送信機能（Gmail専用、CC対応）
- バージョン表示機能（ヘッダー・フッター）
- お知らせセクション（ダッシュボード）
- レスポンシブデザイン（iPhone対応、パステルピンクUI）

### 1.4 V1からの変更点
- データベース（Prisma/SQLite）を削除し、ローカルストレージに変更
- メール送信機能を追加（Gmail専用）
- バージョン表示機能を追加
- お知らせセクションを追加
- UIデザインをパステルピンクに変更（iPhone対応強化）

## 2. 技術仕様

### 2.1 技術スタック

#### フロントエンド
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **shadcn/ui** (コンポーネントライブラリ)

#### バックエンド
- **Next.js API Routes** (サーバーサイド処理)
- **docxtemplater** (Wordテンプレート処理)
- **LibreOffice** (PDF生成、puppeteerから変更)
- **nodemailer** (メール送信、Gmail専用)

#### 認証
- **NextAuth.js v4** (Google OAuth認証)
- **Google OAuth 2.0** (Googleアカウントでログイン)

#### データ保存
- **ブラウザローカルストレージ** (生成履歴、お知らせ非表示設定)

#### デプロイ
- **Railway** (推奨、Puppeteerの制約によりVercel不可)

### 2.2 ディレクトリ構造

```
stepup_contract_maker/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # ログインページ
│   ├── (main)/
│   │   ├── layout.tsx            # メインレイアウト（ヘッダー付き）
│   │   ├── dashboard/
│   │   │   └── page.tsx          # ダッシュボード（お知らせ表示）
│   │   ├── generate/
│   │   │   └── page.tsx          # 書類生成ページ
│   │   └── history/
│   │       └── page.tsx          # 履歴一覧ページ
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth API
│   │   ├── generate/
│   │   │   └── route.ts          # PDF生成API
│   │   ├── send-email/
│   │   │   └── route.ts          # メール送信API
│   │   ├── files/[filename]/
│   │   │   └── route.ts          # ファイルダウンロードAPI
│   │   └── health/
│   │       └── route.ts          # ヘルスチェックAPI
│   ├── layout.tsx                 # ルートレイアウト
│   └── page.tsx                  # トップ（ダッシュボードへリダイレクト）
├── components/
│   ├── forms/
│   │   ├── CompanyForm.tsx       # 会社情報入力フォーム
│   │   └── EmailForm.tsx          # メール送信フォーム
│   ├── layout/
│   │   └── header.tsx            # ヘッダーコンポーネント（バージョン表示）
│   ├── providers/
│   │   └── session-provider.tsx   # セッションプロバイダー
│   ├── error-boundary.tsx        # エラーバウンダリー
│   └── ui/                       # shadcn/ui コンポーネント
├── lib/
│   ├── auth.ts                    # NextAuth設定
│   ├── local-storage.ts          # 履歴管理（ローカルストレージ）
│   ├── pdf-generator.ts          # PDF生成（LibreOffice）
│   ├── template-processor.ts    # テンプレート処理
│   ├── docx-generator.ts         # Word出力
│   ├── postal-code-lookup.ts     # 郵便番号検索
│   ├── logger.ts                 # ログ機能
│   ├── sanitize.ts               # 入力値サニタイズ
│   ├── download.ts               # ファイルダウンロード
│   ├── date-format.ts            # 日付フォーマット
│   ├── constants.ts              # アプリ定数（バージョン等）
│   └── announcements.ts          # お知らせ機能
├── types/
│   └── index.ts                  # 共通型定義
├── templates/
│   ├── contract_template.docx    # 契約書テンプレート
│   └── invoice_template.docx    # 送付状テンプレート
└── public/
    ├── generated/                # 生成されたファイル
    └── data/
        └── postal-codes.json     # 郵便番号データ
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
  4. 認証成功後、ユーザー情報（email, name, image, id）を取得
  5. NextAuth.jsセッションを確立
  6. ダッシュボードにリダイレクト

#### 3.1.2 セッション管理
- NextAuth.jsのセッションを使用
- セッション情報: userId, email, name, image
- すべてのAPI Routeでセッション確認を実施

### 3.2 バージョン表示機能

#### 3.2.1 目的
アプリケーションのバージョン情報をユーザーに表示する。

#### 3.2.2 表示場所
- **ヘッダー**: タイトル横にバージョンバッジを表示
- **フッター**: 全ページのフッターにバージョン情報を表示

#### 3.2.3 データ定義
- **項目名**: APP_VERSION
- **型**: string
- **必須**: はい
- **制約**: "2.0"形式（メジャー.マイナー）
- **保存場所**: `lib/constants.ts`

#### 3.2.4 デザイン仕様
- **ヘッダーバッジ**:
  - 背景: パステルピンクのグラデーション（from-pink-100 to-purple-100）
  - テキスト: text-pink-700
  - アイコン: Sparkles（lucide-react）
  - サイズ: text-sm, px-3 py-1, rounded-full
  - 表示例: `<Sparkles /> v2.0`
- **フッター**:
  - テキスト: "契約書・送り状自動生成システム v2.0 | © 2025 株式会社ステップアップ"
  - スタイル: text-center text-sm text-gray-400, mt-12

#### 3.2.5 処理フロー
1. `lib/constants.ts`からAPP_VERSIONを取得
2. ヘッダーコンポーネントでバッジを表示
3. 各ページのフッターでバージョン情報を表示

### 3.3 お知らせセクション機能

#### 3.3.1 目的
ダッシュボードにお知らせを表示し、ユーザーに最新情報を伝える。

#### 3.3.2 表示場所
- ダッシュボードページのタイトル下

#### 3.3.3 データ定義
- **項目名**: AnnouncementItem
- **型**: interface
- **必須項目**:
  - id: number（一意のID）
  - type: "update" | "feature" | "improvement"（お知らせタイプ）
  - title: string（タイトル、最大100文字）
  - date: string（日付、YYYY-MM-DD形式）
  - message: string（メッセージ、最大500文字）
  - isNew: boolean（新着フラグ）
- **保存場所**: `lib/announcements.ts`（getAnnouncements関数）

#### 3.3.4 非表示設定
- **保存場所**: ブラウザローカルストレージ
- **キー**: "announcements_hidden"
- **値**: "true"（非表示）| "false"（表示）
- **デフォルト**: 表示（false）

#### 3.3.5 デザイン仕様
- **カード背景**: パステルピンクのグラデーション（from-pink-50 to-purple-50）
- **ボーダー**: border-2 border-pink-200
- **シャドウ**: shadow-md
- **閉じるボタン**: 右上にXアイコン
- **各お知らせの背景色**:
  - update: bg-pink-50 border-pink-200
  - feature: bg-blue-50 border-blue-200
  - improvement: bg-blue-50 border-blue-200
- **NEWバッジ**: bg-pink-500 text-white text-xs font-medium rounded-full px-2 py-0.5

#### 3.3.6 処理フロー
1. ダッシュボード読み込み時、ローカルストレージから非表示設定を取得
2. 非表示設定がfalseの場合、お知らせを表示
3. 閉じるボタンクリック時、非表示設定をtrueに保存
4. 次回アクセス時、非表示設定に従って表示/非表示を切り替え

### 3.4 メール送信機能（Gmail専用）

#### 3.4.1 目的
生成した契約書・送付状をメールで送信する。

#### 3.4.2 送信先
- **Gmail専用**: 他のメールサービス（Outlook、Yahoo等）は非対応
- **送信元**: Gmailアカウント（環境変数GMAIL_USERで指定）

#### 3.4.3 データ定義
- **送信先（to）**: string（必須、RFC 5322準拠のメールアドレス、最大254文字）
- **CC（cc）**: string（任意、RFC 5322準拠のメールアドレス、最大254文字）
- **件名（subject）**: string（必須、最大200文字）
- **本文（body）**: string（必須、プレーンテキスト、改行は<br>に変換）
- **添付ファイル（attachments）**: Array<{ filename: string, url: string }>（任意、最大25MB/ファイル）

#### 3.4.4 環境変数
- **GMAIL_USER**: string（必須、Gmailアカウント）
- **GMAIL_APP_PASSWORD**: string（必須、Gmailアプリパスワード、16文字）
- **GMAIL_FROM_NAME**: string（任意、デフォルト: "契約書生成システム"）

#### 3.4.5 処理フロー
1. ユーザーがメール送信ボタンをクリック
2. EmailFormモーダルを表示
3. 送信先メールアドレスを入力（必須）
4. CCメールアドレスを入力（任意）
5. 件名を入力（デフォルト値あり、編集可能）
6. 本文を入力（デフォルトテンプレートあり、編集可能）
7. 添付ファイルを選択（契約書PDF、送付状PDF、契約書Word、送付状Word）
8. 「送信」ボタンをクリック
9. `/api/send-email`にPOSTリクエスト
10. 認証チェック（NextAuth.jsセッション）
11. メールアドレスのバリデーション（RFC 5322準拠）
12. 添付ファイルの存在確認・サイズチェック（25MB制限）
13. nodemailerでGmail経由でメール送信
14. 送信成功時、履歴を更新（emailSent: true, emailSentAt, emailTo）
15. トースト通知で結果を表示

#### 3.4.6 エラーハンドリング
- **Gmail認証エラー**: "Gmail認証に失敗しました。環境変数を確認してください。"
- **メールアドレス形式エラー**: "メールアドレスの形式が正しくありません。"
- **添付ファイルサイズ制限**: "添付ファイルのサイズが大きすぎます（最大25MB）。"
- **その他**: "メール送信に失敗しました。しばらくしてから再度お試しください。"

### 3.5 生成履歴保存機能（ローカルストレージ）

#### 3.5.1 目的
生成した契約書・送付状の履歴をブラウザローカルストレージに保存する。

#### 3.5.2 データ定義
- **項目名**: HistoryItem
- **型**: interface
- **必須項目**:
  - id: string（UUID）
  - userId: string（ユーザーID、NextAuth.jsセッションから取得）
  - companyName: string（会社名、最大100文字）
  - address: string（住所、最大500文字）
  - representativeName: string（代表者名、最大100文字）
  - postalCode: string（郵便番号、〒付き形式）
  - contractPdfUrl: string（契約書PDFのURL）
  - contractDocxUrl: string（契約書WordのURL）
  - invoicePdfUrl: string（送付状PDFのURL）
  - invoiceDocxUrl: string（送付状WordのURL）
  - createdAt: string（作成日時、ISO 8601形式）
- **オプション項目**:
  - emailSent: boolean（メール送信済みフラグ）
  - emailSentAt: string（メール送信日時、ISO 8601形式）
  - emailTo: string（メール送信先アドレス）

#### 3.5.3 保存場所
- **ブラウザローカルストレージ**
- **キー**: `stepup_history_{userId}`
- **値**: JSON配列（HistoryItem[]）

#### 3.5.4 処理フロー
1. 書類生成成功時、`addHistory`関数を呼び出し
2. 履歴アイテムを作成（idはcrypto.randomUUID()で生成）
3. 既存の履歴を取得
4. 新しい履歴を先頭に追加
5. ローカルストレージに保存
6. 履歴一覧ページで表示（日付順、新しい順）

### 3.6 PDF生成機能（契約書・送付状同時生成）

#### 3.6.1 目的
1つのテンプレート入力で契約書と送付状の2通を同時に生成する。

#### 3.6.2 入力項目
- **会社名** (必須): 文字列、最大100文字
- **住所** (必須): 文字列、最大500文字
- **代表者名** (必須): 文字列、最大100文字
- **郵便番号** (任意): 文字列、自動検索可能

#### 3.6.3 処理フロー
1. ユーザーが会社情報を入力
2. 住所入力時、郵便番号を自動検索（`lib/postal-code-lookup.ts`）
3. 「生成」ボタンをクリック
4. API Route (`/api/generate`) にPOSTリクエスト
5. セッション確認（認証チェック）
6. 契約書テンプレートを読み込み（`templates/contract_template.docx`）
7. 送付状テンプレートを読み込み（`templates/invoice_template.docx`）
8. docxtemplaterでデータ埋め込み
   - `{companyName}` → 入力された会社名
   - `{address}` → 入力された住所
   - `{representativeName}` → 入力された代表者名
   - `{postalCode}` → 郵便番号（〒付き、空の場合は空文字）
   - `{currentDate}` → 現在日付（令和○年○月○日形式）
9. LibreOfficeでPDFに変換
10. Wordファイルも保存
11. 生成履歴をローカルストレージに保存
12. PDF・WordのダウンロードURLを返却
13. ブラウザでダウンロード開始

#### 3.6.4 出力
- 契約書PDF（`/api/files/人材紹介契約書({会社名}様).pdf`）
- 契約書Word（`/api/files/人材紹介契約書({会社名}様).docx`）
- 送付状PDF（`/api/files/送付状({会社名}様).pdf`）
- 送付状Word（`/api/files/送付状({会社名}様).docx`）

### 3.7 UIデザイン（パステルピンク、iPhone対応）

#### 3.7.1 デザイン方針
- **カラーテーマ**: パステルピンクを基調とした優しいデザイン
- **レスポンシブ**: iPhone等のスマートフォンに対応
- **タッチ操作**: タッチデバイス向けに最適化

#### 3.7.2 カラーパレット
- **プライマリ**: パステルピンク（pink-400, pink-500, pink-600）
- **セカンダリ**: パステルパープル（purple-400, purple-500）
- **アクセント**: ローズ（rose-400, rose-500）
- **背景**: 白（white）または半透明（white/80, backdrop-blur-sm）
- **ボーダー**: ピンク系（pink-100, pink-200）

#### 3.7.3 iPhone対応
- **タッチ最適化**: `touch-manipulation`クラスを使用
- **フォントサイズ**: スマートフォンで読みやすいサイズ（text-sm, text-base）
- **ボタンサイズ**: タッチしやすいサイズ（最小44px×44px）
- **レスポンシブグリッド**: `grid-cols-1 sm:grid-cols-2`でモバイル/PC切り替え

## 4. API仕様

### 4.1 認証API

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

### 4.2 PDF生成API

#### POST /api/generate
- **説明**: 契約書・送付状の同時生成
- **認証**: 必須（NextAuth.jsセッション）
- **リクエストボディ**:
```json
{
  "companyName": "株式会社ABC",
  "address": "東京都渋谷区...",
  "representativeName": "山田太郎",
  "postalCode": "150-0001"
}
```
- **レスポンス**:
```json
{
  "success": true,
  "contractPdfUrl": "/api/files/人材紹介契約書(株式会社ABC様).pdf",
  "contractDocxUrl": "/api/files/人材紹介契約書(株式会社ABC様).docx",
  "invoicePdfUrl": "/api/files/送付状(株式会社ABC様).pdf",
  "invoiceDocxUrl": "/api/files/送付状(株式会社ABC様).docx",
  "postalCode": "〒150-0001"
}
```

### 4.3 メール送信API

#### POST /api/send-email
- **説明**: メール送信（Gmail専用）
- **認証**: 必須（NextAuth.jsセッション）
- **リクエストボディ**:
```json
{
  "to": "example@company.co.jp",
  "cc": "cc@company.co.jp",
  "subject": "【株式会社ステップアップ】契約書類のご送付",
  "body": "本文テキスト",
  "attachments": [
    {
      "filename": "人材紹介契約書(株式会社ABC様).pdf",
      "url": "/api/files/人材紹介契約書(株式会社ABC様).pdf"
    }
  ]
}
```
- **レスポンス**:
```json
{
  "success": true,
  "message": "メールを送信しました"
}
```
- **エラー時**:
```json
{
  "error": "エラーメッセージ"
}
```

### 4.4 ファイルダウンロードAPI

#### GET /api/files/[filename]
- **説明**: 生成されたファイルのダウンロード
- **認証**: 必須（NextAuth.jsセッション）
- **レスポンス**: ファイル（PDFまたはWord）

### 4.5 ヘルスチェックAPI

#### GET /api/health
- **説明**: アプリケーションの稼働状況確認
- **認証**: 不要
- **レスポンス**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-09T12:00:00Z"
}
```

## 5. データ定義

### 5.1 バージョン情報

| 項目名 | 型 | 必須 | 制約 | 説明 |
|--------|-----|------|------|------|
| APP_VERSION | string | はい | "2.0"形式 | アプリケーションバージョン |
| APP_NAME | string | はい | 最大50文字 | アプリケーション名 |
| COMPANY_NAME | string | はい | 最大100文字 | 会社名 |

### 5.2 お知らせ情報

| 項目名 | 型 | 必須 | 制約 | 説明 |
|--------|-----|------|------|------|
| id | number | はい | 一意 | お知らせID |
| type | string | はい | "update" \| "feature" \| "improvement" | お知らせタイプ |
| title | string | はい | 最大100文字 | タイトル |
| date | string | はい | YYYY-MM-DD形式 | 日付 |
| message | string | はい | 最大500文字 | メッセージ |
| isNew | boolean | はい | - | 新着フラグ |

### 5.3 履歴情報

| 項目名 | 型 | 必須 | 制約 | 説明 |
|--------|-----|------|------|------|
| id | string | はい | UUID | 履歴ID |
| userId | string | はい | - | ユーザーID |
| companyName | string | はい | 最大100文字 | 会社名 |
| address | string | はい | 最大500文字 | 住所 |
| representativeName | string | はい | 最大100文字 | 代表者名 |
| postalCode | string | はい | - | 郵便番号（〒付き） |
| contractPdfUrl | string | はい | - | 契約書PDFのURL |
| contractDocxUrl | string | はい | - | 契約書WordのURL |
| invoicePdfUrl | string | はい | - | 送付状PDFのURL |
| invoiceDocxUrl | string | はい | - | 送付状WordのURL |
| createdAt | string | はい | ISO 8601形式 | 作成日時 |
| emailSent | boolean | いいえ | - | メール送信済みフラグ |
| emailSentAt | string | いいえ | ISO 8601形式 | メール送信日時 |
| emailTo | string | いいえ | 最大254文字 | メール送信先アドレス |

### 5.4 メール送信リクエスト

| 項目名 | 型 | 必須 | 制約 | 説明 |
|--------|-----|------|------|------|
| to | string | はい | RFC 5322準拠、最大254文字 | 送信先メールアドレス |
| cc | string | いいえ | RFC 5322準拠、最大254文字 | CCメールアドレス |
| subject | string | はい | 最大200文字 | 件名 |
| body | string | はい | - | 本文（プレーンテキスト） |
| attachments | Array | いいえ | 最大25MB/ファイル | 添付ファイル配列 |

## 6. スコープ（やる / やらない）

### 6.1 やること（V2の機能）
- ✅ バージョン表示機能（ヘッダー・フッター）
- ✅ お知らせセクション（ダッシュボード）
- ✅ メール送信機能（Gmail専用、CC対応）
- ✅ 生成履歴保存（ローカルストレージ）
- ✅ iPhone対応UI（パステルピンクデザイン）
- ✅ 郵便番号自動検索機能
- ✅ 契約書・送付状の同時生成（PDF・Word両形式）

### 6.2 やらないこと
- ❌ データベース（Prisma/SQLite）の使用（V1から削除）
- ❌ メール送信の他サービス対応（Outlook、Yahoo等は非対応）
- ❌ 一括生成機能（V1の機能、V2では削除）
- ❌ テンプレート管理機能（V1の機能、V2では削除）
- ❌ プレビュー機能（V1の機能、V2では削除）
- ❌ バージョン管理機能（複数バージョンの管理は非対応）
- ❌ お知らせの管理画面（手動で`lib/announcements.ts`を編集）

## 7. 受け入れ条件（10個以上）

1. **バージョン表示**: ヘッダーにバージョンバッジ（v2.0）が表示される
2. **バージョン表示**: 全ページのフッターにバージョン情報が表示される
3. **お知らせ表示**: ダッシュボードにお知らせセクションが表示される
4. **お知らせ非表示**: 閉じるボタンでお知らせを非表示にできる
5. **お知らせ永続化**: お知らせの非表示設定がローカルストレージに保存される
6. **メール送信**: 生成ページからメール送信ができる
7. **メール送信**: 履歴ページからメール送信ができる
8. **メール送信成功**: メール送信成功時、履歴に送信済みフラグが記録される
9. **メール送信エラー**: メールアドレス形式エラー時、適切なエラーメッセージが表示される
10. **履歴保存**: 書類生成成功時、履歴がローカルストレージに保存される
11. **履歴表示**: 履歴一覧ページで過去の生成履歴が表示される
12. **履歴検索**: 履歴一覧ページで会社名で検索ができる
13. **履歴削除**: 履歴一覧ページで履歴を削除できる
14. **iPhone対応**: iPhone（Safari）で正常に表示・操作ができる
15. **レスポンシブ**: PC・タブレット・スマートフォンで正常に表示される

## 8. NG例（5個以上）

1. **バージョン表示なし**: ヘッダーにバージョンバッジが表示されない
2. **お知らせ表示なし**: ダッシュボードにお知らせセクションが表示されない
3. **お知らせ非表示不可**: 閉じるボタンが機能しない
4. **メール送信不可**: メール送信ボタンをクリックしても送信されない
5. **メール送信エラー**: Gmail認証エラー時、適切なエラーメッセージが表示されない
6. **履歴保存不可**: 書類生成成功時、履歴が保存されない
7. **履歴表示不可**: 履歴一覧ページで履歴が表示されない
8. **iPhone表示崩れ**: iPhone（Safari）でレイアウトが崩れる
9. **郵便番号検索不可**: 住所入力時、郵便番号が自動検索されない
10. **同時生成不可**: 契約書と送付状が同時に生成されない

## 9. 例外ケース

### 9.1 空・NULL
- **郵便番号が空**: 郵便番号が検索できない場合、空文字列を設定
- **CCが空**: CCが未入力の場合、undefinedとして送信しない
- **履歴が空**: 履歴が存在しない場合、空の配列を返す

### 9.2 権限なし
- **未認証**: 未認証ユーザーはダッシュボード・生成・履歴ページにアクセスできない（ログインページへリダイレクト）
- **API認証エラー**: 未認証のAPIリクエストは401エラーを返す

### 9.3 重複
- **履歴ID重複**: crypto.randomUUID()で一意のIDを生成（重複しない）

### 9.4 多重送信
- **メール多重送信**: 送信中のボタンは無効化（isLoadingフラグで制御）
- **PDF多重生成**: 生成中のボタンは無効化（isLoadingフラグで制御）

### 9.5 エラー
- **Gmail認証エラー**: 環境変数が設定されていない場合、500エラーを返す
- **ファイル生成エラー**: LibreOfficeが利用できない場合、500エラーを返す
- **ローカルストレージエラー**: ローカルストレージが利用できない場合、エラーログを出力

## 10. 完了条件

### 10.1 どう確認したらOKか
1. **バージョン表示**: ブラウザでアプリを開き、ヘッダーにバージョンバッジ（v2.0）が表示されることを確認
2. **お知らせ表示**: ダッシュボードを開き、お知らせセクションが表示されることを確認
3. **お知らせ非表示**: お知らせの閉じるボタンをクリックし、非表示になることを確認。ページをリロードしても非表示のままであることを確認
4. **メール送信**: 生成ページで書類を生成し、メール送信ボタンをクリック。メール送信フォームが表示され、送信が成功することを確認
5. **履歴保存**: 書類生成後、履歴一覧ページで履歴が表示されることを確認
6. **履歴検索**: 履歴一覧ページで会社名で検索し、該当する履歴が表示されることを確認
7. **iPhone対応**: iPhone（Safari）でアプリを開き、正常に表示・操作ができることを確認
8. **レスポンシブ**: PC・タブレット・スマートフォンで正常に表示されることを確認

### 10.2 テスト項目
- [x] バージョン表示のテスト
- [x] お知らせセクションのテスト
- [x] メール送信のテスト
- [x] 履歴保存のテスト
- [x] iPhone実機テスト
- [x] レスポンシブデザインのテスト

## 11. 環境変数

### 11.1 必須環境変数

```env
# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Gmail（メール送信機能使用時）
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-16-char-app-password"
GMAIL_FROM_NAME="株式会社ステップアップ"
```

### 11.2 オプション環境変数

```env
# ログレベル
LOG_LEVEL="debug"
```

## 12. デプロイ仕様

### 12.1 デプロイ環境
- **推奨**: Railway（Puppeteerの制約によりVercel不可）

### 12.2 デプロイ手順
1. GitHubリポジトリにプッシュ
2. Railwayと連携
3. 環境変数を設定
4. デプロイ実行
5. 動作確認

---

**最終更新日**: 2025-01-09
**バージョン**: 2.0
**ブランチ**: feature/v2-development
