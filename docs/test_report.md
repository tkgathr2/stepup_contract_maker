# ラクラク契約くん テストレポート

**テスト実施日:** 2026-02-22
**テスト環境:** 本番 (https://rakuraku.up.railway.app/) + コードレビュー
**テスト実施者:** Devin AI
**対象リポジトリ:** tkgathr2/stepup_contract_maker

---

## 1. テスト環境

| 項目 | 値 |
|------|-----|
| フレームワーク | Next.js 16 + React 19 |
| デプロイ先 | Railway (Nixpacks) |
| DB | PostgreSQL (Railway) |
| 認証 | NextAuth.js + Google OAuth (PKCE) |
| PDF生成 | docxtemplater + PizZip + Puppeteer + Mammoth |
| エラー監視 | Sentry |
| 本番URL | https://rakuraku.up.railway.app/ |
| テスト基盤 | なし（Playwright/Jest/Vitest 未導入） |

---

## 2. テスト観点一覧

| # | テスト観点 | テスト方法 | 結果 |
|---|-----------|-----------|------|
| 1A | ログイン・認証 | ブラウザ操作 | PASS（一部注意） |
| 1B | PDF単件生成 | ブラウザ操作 | **FAIL** |
| 1C | プレビュー生成 | ブラウザ操作 | **FAIL** |
| 1D | 一括生成 | UI確認+コードレビュー | **FAIL（推定）** |
| 1E | テンプレート管理 | ブラウザ操作+コードレビュー | PASS（一部注意） |
| 1F | 生成履歴 | ブラウザ操作 | **FAIL**（DL不可） |
| 2A | エフェメラルFS問題 | コードレビュー | **FAIL** |
| 2B | エラーハンドリング | ブラウザ操作+コードレビュー | 注意 |
| 2C | 入力バリデーション | コードレビュー | PASS |
| 2D | 二重送信防止 | コードレビュー | **FAIL** |
| 2E | セキュリティ | コードレビュー | PASS（一部注意） |

---

## 3. 不具合一覧

### BUG-001: PDF生成が本番環境で完全に失敗する（Critical）

**影響度:** Critical - コア機能が完全に使用不能
**環境:** 本番 (https://rakuraku.up.railway.app/)
**発見方法:** ブラウザ操作

**再現手順:**
1. https://rakuraku.up.railway.app/login でGoogleログイン
2. 左メニュー「PDF生成」をクリック → /generate に遷移
3. テンプレート選択で「契約書テンプレート」を選択
4. 会社名: `テスト株式会社`、住所: `東京都渋谷区神宮前1-2-3`、代表者名: `山田太郎` を入力
5. 「PDF生成」ボタンをクリック

**期待結果:** PDFが生成され、ダウンロードリンクとiframeプレビューが表示される
**実際の結果:** トースト通知「内部エラーが発生しました」が表示される

**根本原因（コードレビュー）:**
- `lib/pdf-generator.ts` の `generatePDF()` で Puppeteer を起動してHTMLをPDFに変換している
- Railway環境でPuppeteer/Chromiumの起動に失敗している可能性が高い
- または、テンプレートファイル（`/templates/*.docx`）がRailwayのエフェメラルFSにより消失している
- エラーメッセージが `handleInternalError()` で抽象化されており、ユーザーに具体的な原因が伝わらない

**該当コード:**
- `app/api/generate/route.ts:90` - `processTemplate()` でテンプレートファイル読み込み
- `lib/template-processor.ts:25` - `fs.existsSync(absolutePath)` でファイル存在チェック
- `lib/pdf-generator.ts:57` - `puppeteer.launch()` でChromium起動

---

### BUG-002: プレビュー生成が本番環境で失敗する（Critical）

**影響度:** Critical - プレビュー機能が完全に使用不能
**環境:** 本番 (https://rakuraku.up.railway.app/)
**発見方法:** ブラウザ操作

**再現手順:**
1. https://rakuraku.up.railway.app/generate に遷移（ログイン済み）
2. テンプレート選択で「契約書テンプレート」を選択
3. 会社名: `テスト株式会社`、住所: `東京都渋谷区神宮前1-2-3`、代表者名: `山田太郎` を入力
4. 「プレビュー」ボタンをクリック

**期待結果:** Base64エンコードされたPDFがiframeで表示される
**実際の結果:** トースト通知「内部エラーが発生しました」が表示される

**根本原因:** BUG-001と同一（テンプレートファイル消失 or Puppeteer起動失敗）

**該当コード:**
- `app/api/generate/route.ts:100` - `generatePDFPreview(docxBuffer)`
- `lib/pdf-generator.ts:136` - `puppeteer.launch(getPuppeteerLaunchOptions())`

---

### BUG-003: 既存PDFのダウンロードが404 HTMLを返す（Critical）

**影響度:** Critical - 過去に生成したPDFが全てダウンロード不能
**環境:** 本番 (https://rakuraku.up.railway.app/)
**発見方法:** ブラウザ操作 + ファイルバイナリ確認

**再現手順:**
1. https://rakuraku.up.railway.app/dashboard にアクセス（ログイン済み）
2. 「最近の生成履歴」テーブルの任意の行の「DL」ボタンをクリック
3. ダウンロードされたファイルを確認

**期待結果:** PDFファイル（マジックバイト: `%PDF-1.4`）がダウンロードされる
**実際の結果:** HTMLファイル（マジックバイト: `<!DOCTYPE html>`）がダウンロードされる

**検証ログ:**
```
$ head -c 10 ~/browser_downloads/download | od -A x -t x1z | head -1
000000 3c 21 44 4f 43 54 59 50 45 20    ><!DOCTYPE <
```

**根本原因:**
- PDFは `/public/generated/{uuid}.pdf` に保存される（`lib/pdf-generator.ts:30,50`）
- Railwayはエフェメラルファイルシステムを使用 → デプロイ/再起動時にファイルが消失
- DB（`generationHistory.pdfPath`）にはパスが残るが、実ファイルは存在しない
- Next.jsが存在しないファイルへのリクエストに対して404 HTMLページを返す
- ブラウザは `Content-Type` を見ずにダウンロードするため、HTMLファイルが `.pdf` 拡張子で保存される

**該当コード:**
- `lib/pdf-generator.ts:30` - `const GENERATED_DIR = path.join(process.cwd(), "public", "generated")`
- `lib/pdf-generator.ts:118` - `pdfUrl: /generated/${pdfFileName}`
- `app/(main)/dashboard/page.tsx:98-103` - `handleDownload` が `pdfUrl` を直接 `link.href` に設定
- `app/(main)/history/page.tsx:70-75` - 同様の `handleDownload`

**同様の問題が発生する箇所:**
- ダッシュボードのDLボタン（`dashboard/page.tsx:283`）
- 履歴ページのダウンロードボタン（`history/page.tsx:180-181`）
- 一括生成結果のダウンロードボタン（`batch/page.tsx:150`）
- 一括生成の「すべてダウンロード」ボタン（`batch/page.tsx:130`）

---

### BUG-004: テンプレートファイルがデプロイ時に消失する（Critical）

**影響度:** Critical - デプロイ後にPDF生成が不能になる
**環境:** 本番 (Railway)
**発見方法:** コードレビュー

**再現手順:**
1. テンプレートをアップロード（/templates ページ）
2. Railwayで新しいデプロイが発生（コードpush、設定変更等）
3. PDF生成を試みる

**期待結果:** アップロードしたテンプレートでPDF生成が成功する
**実際の結果:** テンプレートファイルが見つからずエラーになる

**根本原因:**
- テンプレートは `/templates/{uuid}.docx` に保存される（`app/api/templates/route.ts:106`）
- Railwayのエフェメラルファイルシステムではデプロイ時にこのディレクトリが消失
- DB（`template.filePath`）にはパスが残るが、実ファイルは存在しない
- `lib/template-processor.ts:25-27` で `fs.existsSync(absolutePath)` がfalseを返し、エラーがthrowされる

**該当コード:**
- `app/api/templates/route.ts:11` - `const TEMPLATES_DIR = path.join(process.cwd(), "templates")`
- `app/api/templates/route.ts:111` - `fs.writeFileSync(filePath, buffer)`
- `lib/template-processor.ts:23-27` - テンプレートファイル読み込み時のパス解決

**注意:** 現在テンプレートが動作しているのは、最後のデプロイ時に `scripts/create-sample-templates.js` が実行されてサンプルテンプレートが再作成されたためと推測される。カスタムテンプレートをアップロードした場合、次のデプロイで消失する。

---

### BUG-005: テンプレート削除に確認ダイアログがない（Medium）

**影響度:** Medium - 誤操作でテンプレートが即削除される
**環境:** 本番 (https://rakuraku.up.railway.app/)
**発見方法:** ブラウザ操作 + コードレビュー

**再現手順:**
1. https://rakuraku.up.railway.app/templates にアクセス
2. 任意のテンプレートの「削除」ボタンをクリック

**期待結果:** 「本当に削除しますか？」等の確認ダイアログが表示される
**実際の結果:** 確認なしで即座に削除APIが呼ばれる

**該当コード:**
- `app/(main)/templates/page.tsx` - 削除ボタンのonClickハンドラに確認ダイアログがない
- `app/api/templates/[id]/route.ts:105-153` - DELETE APIに削除確認の仕組みがない

**注意:** 本番テストでは削除を実行していない（破壊的操作禁止のため）。コードレビューで確認。

---

### BUG-006: 二重送信防止が不完全（Medium）

**影響度:** Medium - 二重クリックで重複PDFが生成される可能性
**環境:** 全環境
**発見方法:** コードレビュー

**問題箇所:**
1. **PDF生成ページ** (`generate/page.tsx:17-51`): `isLoading` stateでボタンをdisabledにしているが、ネットワークレイテンシの間に二重クリックが可能
2. **一括生成ページ** (`batch/page.tsx:22-63`): 同様の問題
3. **ダッシュボード** (`dashboard/page.tsx:98-103`): DLボタンにはdisabled制御なし

**改善提案:**
- ボタンクリック後、即座に `disabled` を設定（現状は `setIsLoading(true)` が非同期のため微小なタイミングで二重クリック可能）
- ダウンロードボタンにも連打防止を追加
- サーバーサイドでも冪等性チェック（同一リクエストの重複排除）を検討

---

### BUG-007: エラーメッセージがユーザーに不親切（Low）

**影響度:** Low - ユーザーが問題の原因を理解できない
**環境:** 本番
**発見方法:** ブラウザ操作

**再現手順:**
1. PDF生成またはプレビューを実行
2. エラーが発生

**期待結果:** 「テンプレートファイルが見つかりません」「PDF変換エンジンの起動に失敗しました」等の具体的なエラーメッセージ
**実際の結果:** 「内部エラーが発生しました」としか表示されない

**根本原因:**
- `lib/api-error.ts` の `handleInternalError()` がすべての内部エラーを `"内部エラーが発生しました"` に抽象化
- Sentryには詳細が送られるが、ユーザーには伝わらない
- フロントエンド（`generate/page.tsx:47`）で `error.message` を表示するが、APIが常に同じメッセージを返すため意味がない

**改善提案:**
- テンプレートファイル未発見時は `"テンプレートファイルが見つかりません。再アップロードしてください"` を返す
- Puppeteer起動失敗時は `"PDF変換エンジンが利用できません。管理者にお問い合わせください"` を返す
- ユーザーが対処可能なエラーと内部エラーを区別する

---

### BUG-008: 履歴検索が大文字小文字を区別する（Low）

**影響度:** Low - 日本語では影響少ないが、英字検索時に不便
**環境:** 全環境
**発見方法:** コードレビュー

**該当コード:**
```typescript
// app/api/history/route.ts:42-44
if (search) {
  where.companyName = {
    contains: search,
  }
}
```

**問題:** Prisma の `contains` はデフォルトで大文字小文字を区別する（PostgreSQLの場合）。`mode: 'insensitive'` を指定していない。

**改善提案:**
```typescript
where.companyName = {
  contains: search,
  mode: 'insensitive',
}
```

---

### BUG-009: 履歴ページに日付フィルターUIがない（Low）

**影響度:** Low - APIは対応しているがUIから使えない
**環境:** 全環境
**発見方法:** コードレビュー

**詳細:**
- `app/api/history/route.ts:24-25` でクエリパラメータ `from` / `to` をサポート
- `app/(main)/history/page.tsx` にはUIに日付フィルターがない
- ユーザーは会社名検索のみ利用可能

**改善提案:**
- 日付範囲ピッカーをUIに追加

---

### BUG-010: 一括生成のPromise.all並列処理がリソース枯渇を招く（Medium）

**影響度:** Medium - 大量件数で本番環境がOOMやタイムアウトする可能性
**環境:** 全環境
**発見方法:** コードレビュー

**該当コード:**
```typescript
// app/api/generate/batch/route.ts:98
const generatePromises = companies.map(async (company, index) => {
  // 各会社に対してPuppeteerを起動してPDF生成
  ...
})
const results = await Promise.all(generatePromises)
```

**問題:**
- `Promise.all()` で全件を同時並列処理
- 各PDF生成で `puppeteer.launch()` を呼び出し、Chromiumプロセスを起動
- 20件同時実行 = Chromium 20プロセス同時起動 = メモリ/CPU枯渇の危険
- Railway のフリープラン/Hobbyプランではリソース制限あり

**改善提案:**
- 逐次処理（`for...of`）か、並列数を制限（例: `p-limit` ライブラリで最大3並列）
- または、1つのChromiumインスタンスで複数ページを処理

---

### BUG-011: 一括生成の件数上限が未設定（Low）

**影響度:** Low - 悪意あるリクエストでサーバー負荷が増大する可能性
**環境:** 全環境
**発見方法:** コードレビュー

**該当コード:**
```typescript
// app/api/generate/batch/route.ts:50
if (!Array.isArray(companies) || companies.length === 0) {
  return sendError(400, ...)
}
```

**問題:** `companies.length` の上限チェックがない。フロントエンドのUIでは無制限に「+ 会社を追加」が可能。

**改善提案:**
- API側で `companies.length > 50` 等の上限チェックを追加
- フロント側でも上限表示・制限を追加

---

### BUG-012: テンプレートアップロードで.docx内容の検証が不十分（Low）

**影響度:** Low - 壊れたdocxファイルがアップロードされるとPDF生成時にエラー
**環境:** 全環境
**発見方法:** コードレビュー

**該当コード:**
```typescript
// app/api/templates/route.ts:82-88
if (!file.name.endsWith(".docx")) {
  return sendError(400, ...)
}
```

**問題:**
- ファイル拡張子（`.docx`）のみチェックしている
- ファイルの中身（MIME type、ZIPマジックバイト）を検証していない
- `.docx` に改名した不正ファイルがアップロード可能
- `validateTemplate()` 関数が存在するが、アップロード時に呼ばれていない

**改善提案:**
- アップロード時に `validateTemplate()` を実行して、docxtemplaterでパース可能か検証
- MIMEタイプ `application/vnd.openxmlformats-officedocument.wordprocessingml.document` もチェック

---

## 4. テスト詳細結果

### 4.1 ログイン・認証テスト (1A)

| # | テスト内容 | 結果 | 備考 |
|---|-----------|------|------|
| 1 | /login でGoogleログインボタン表示 | PASS | |
| 2 | Googleログイン→/dashboardリダイレクト | PASS | |
| 3 | 未認証で/dashboardアクセス→/loginリダイレクト | PASS | middlewareで適切にリダイレクト |
| 4 | ログアウトボタンクリック | PASS（注意） | クリックタイムアウトが発生することがあるが、ログアウト自体は成功 |
| 5 | ログアウト後/loginに遷移 | PASS | |
| 6 | 旧ドメインアクセス→rakurakuにリダイレクト | PASS | middleware.ts:25-34 で処理 |

### 4.2 PDF単件生成テスト (1B)

| # | テスト内容 | 結果 | 備考 |
|---|-----------|------|------|
| 1 | テンプレート選択ドロップダウン表示 | PASS | 2件（契約書、送付状）が表示 |
| 2 | フォーム入力（正常値） | PASS | 文字数カウンター正常動作 |
| 3 | PDF生成ボタンクリック | **FAIL** | BUG-001: 「内部エラーが発生しました」 |
| 4 | 空入力でsubmit | PASS | フロントバリデーションで阻止 |
| 5 | maxLength制限 | PASS | HTML maxLength属性 + JSバリデーション |

### 4.3 プレビュー生成テスト (1C)

| # | テスト内容 | 結果 | 備考 |
|---|-----------|------|------|
| 1 | プレビューボタン表示 | PASS | |
| 2 | プレビュー実行 | **FAIL** | BUG-002: 「内部エラーが発生しました」 |

### 4.4 一括生成テスト (1D)

| # | テスト内容 | 結果 | 備考 |
|---|-----------|------|------|
| 1 | テンプレート選択UI | PASS | |
| 2 | 会社追加ボタン | PASS | 「+ 会社を追加」で行が追加される |
| 3 | 会社削除ボタン | PASS | 1件のみの時は削除不可（正常） |
| 4 | 一括生成実行 | **FAIL（推定）** | BUG-001と同一原因で失敗する |
| 5 | 件数上限 | **未設定** | BUG-011 |
| 6 | 並列処理のリソース制限 | **なし** | BUG-010 |

### 4.5 テンプレート管理テスト (1E)

| # | テスト内容 | 結果 | 備考 |
|---|-----------|------|------|
| 1 | テンプレート一覧表示 | PASS | 2件表示（契約書、送付状） |
| 2 | プレースホルダー説明表示 | PASS | {companyName}, {address}, {representativeName} |
| 3 | 「テンプレートを追加」ボタン | PASS | アコーディオン/ダイアログUI |
| 4 | 削除ボタン | **注意** | BUG-005: 確認ダイアログなし |
| 5 | テンプレートファイル永続性 | **FAIL** | BUG-004: デプロイで消失 |

### 4.6 生成履歴テスト (1F)

| # | テスト内容 | 結果 | 備考 |
|---|-----------|------|------|
| 1 | 履歴一覧表示 | PASS | 全20件表示 |
| 2 | 検索機能（「山田」で検索） | PASS | 2件に絞り込み成功 |
| 3 | クリアボタン | PASS | 検索クリアで全件表示に戻る |
| 4 | ページネーション表示 | PASS | 「全20件（1/1ページ）」 |
| 5 | ダウンロードボタン | **FAIL** | BUG-003: HTMLがダウンロードされる |
| 6 | 日付フィルターUI | **なし** | BUG-009 |

---

## 5. 改善提案（優先度順）

### P0（即時対応必須）- コア機能が使用不能

1. **永続ストレージの導入**
   - テンプレートファイル（`/templates/*.docx`）と生成PDF（`/public/generated/*.pdf`）を永続ストレージに移行
   - 選択肢:
     - **Railway Volume** (推奨): `/data` にマウントし、テンプレートとPDFを保存
     - **AWS S3/Cloudflare R2**: オブジェクトストレージにアップロード、署名付きURLでダウンロード
     - **DB BLOB**: PostgreSQLのbytea型に直接保存（小規模なら可）
   - 影響範囲: `lib/pdf-generator.ts`, `lib/template-processor.ts`, `app/api/templates/route.ts`, `app/api/generate/route.ts`

2. **Puppeteer/Chromium動作確認**
   - Railway上でChromiumが正常に起動するか確認
   - `PUPPETEER_EXECUTABLE_PATH` 環境変数の設定確認
   - `nixpacks.toml` の `aptPkgs` にChromium関連パッケージが含まれているか確認
   - 代替案: LibreOffice + `libreoffice --headless --convert-to pdf` による変換

### P1（重要）- UX改善

3. **テンプレート削除に確認ダイアログ追加** (BUG-005)
4. **二重送信防止の強化** (BUG-006)
5. **一括生成の並列数制限** (BUG-010)
6. **エラーメッセージの具体化** (BUG-007)

### P2（改善推奨）- 品質向上

7. **一括生成の件数上限設定** (BUG-011)
8. **テンプレートアップロード時の内容検証** (BUG-012)
9. **履歴検索の大文字小文字無視** (BUG-008)
10. **履歴ページに日付フィルターUI追加** (BUG-009)

---

## 6. 自動テスト基盤の状況

**現状:** テスト基盤なし
- `package.json` にテスト関連の依存関係・スクリプトなし
- `__tests__/` や `*.test.ts` ファイルなし
- Playwright、Jest、Vitest いずれも未導入
- CI/CDパイプラインにテスト工程なし

**推奨:**
- Playwright によるE2Eテスト導入（Google OAuth はテストバイパスモードで対応）
- 最低限カバーすべきテストケース:
  1. 未認証で /dashboard → /login リダイレクト
  2. ログイン→ダッシュボード表示
  3. /api/generate POST → 成功レスポンス（ローカル環境）
  4. /api/history GET → 正常レスポンス
  5. /api/templates GET → テンプレート一覧返却

---

## 7. テスト記録

- 画面録画: `rec-219eef3ac391479ca7f7455c7638df59-edited.mp4`（ログイン→PDF生成→プレビュー→履歴検索→ダウンロードの一連操作を記録）

---

## 8. 付録: テスト対象ファイル一覧

| ファイル | 役割 | 問題 |
|---------|------|------|
| `lib/pdf-generator.ts` | PDF生成 | BUG-001,002（エフェメラルFS + Puppeteer） |
| `lib/template-processor.ts` | テンプレート処理 | BUG-004（ファイル消失） |
| `app/api/generate/route.ts` | 単件生成API | BUG-001,002 |
| `app/api/generate/batch/route.ts` | 一括生成API | BUG-010,011 |
| `app/api/templates/route.ts` | テンプレートAPI | BUG-004,012 |
| `app/api/templates/[id]/route.ts` | テンプレート個別API | BUG-005 |
| `app/api/history/route.ts` | 履歴API | BUG-008,009 |
| `app/(main)/dashboard/page.tsx` | ダッシュボード | BUG-003 |
| `app/(main)/generate/page.tsx` | PDF生成ページ | BUG-001,002,006 |
| `app/(main)/batch/page.tsx` | 一括生成ページ | BUG-006 |
| `app/(main)/history/page.tsx` | 履歴ページ | BUG-003,009 |
| `app/(main)/templates/page.tsx` | テンプレート管理 | BUG-005 |
| `middleware.ts` | 認証・ドメインルーティング | 問題なし |
| `lib/api-error.ts` | エラーハンドリング | BUG-007 |
