# 契約書・送付状自動生成システム

WEBから取得した会社情報を使って、人材紹介契約書と送付状をPDFとWord形式で自動生成するシステムです。

## 主な機能

- **テンプレートベースの書類生成**: DOCXテンプレートから契約書と送付状を生成
- **郵便番号自動検索**: 住所から郵便番号を自動的に取得
- **PDF・Word両方の出力**: 生成した書類をPDFとWord形式でダウンロード可能
- **WEB UI**: ブラウザから簡単に書類を生成

## 技術スタック

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Next.js API Routes
- 書類生成: docxtemplater (Word), Puppeteer (PDF)
- 郵便番号API: zipcloud API

## セットアップと起動

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 使い方

### WEB UIから使用

1. ブラウザで http://localhost:3000 にアクセス
2. 会社情報を入力：
   - 会社名
   - 住所
   - 代表者名
   - 郵便番号（例: 123-4567）
3. 「書類を生成」ボタンをクリック
4. 生成された書類をダウンロード：
   - 契約書（PDF / Word）
   - 送付状（PDF / Word）

**自動機能:**
- 日付が自動的に今日の日付に設定されます（YYYY/MM/DD形式）
- 郵便番号に「〒」が自動的に付加されます

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

## 本番環境へのデプロイ

### ビルド

```bash
npm run build
```

### 本番サーバーの起動

```bash
npm run start
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
│   └── postal-code-lookup.ts      # 郵便番号検索
├── templates/
│   ├── contract_template.docx     # 契約書テンプレート
│   └── invoice_template.docx      # 送付状テンプレート
└── public/generated/              # 生成されたファイル
```

## 作成者

株式会社ステップアップ
