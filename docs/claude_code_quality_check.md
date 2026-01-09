# コード品質の最終確認 - ClaudeCodeへの指示

## 目的
V2仕様書に基づいて、コード品質の最終確認を実施します。
TypeScriptの型チェック、ESLintの実行、ビルドの確認を行います。

## 実施手順

### 1. TypeScriptの型チェック
```bash
npx tsc --noEmit
```
- 型エラーがないことを確認
- エラーがある場合は、エラーメッセージを記録

### 2. ESLintの実行
```bash
npm run lint .
```
または
```bash
npx eslint .
```
- リンターエラーがないことを確認
- エラーがある場合は、エラーメッセージを記録

### 3. ビルドの確認
```bash
npm run build
```
- ビルドが成功することを確認
- エラーがある場合は、エラーメッセージを記録

### 4. 注意事項
- `package.json`の`build`スクリプトに`prisma generate && prisma migrate deploy`が含まれていますが、V2ではPrismaを使用しません
- ビルドエラーが発生する場合は、`build`スクリプトを修正する必要があります
- 修正案: `"build": "next build"`に変更

### 5. 結果の記録
- すべてのチェック結果を`docs/quality_check_results.md`に記録
- エラーがある場合は、修正方法も記載

## 完了条件
- TypeScriptの型チェックが成功
- ESLintの実行が成功（エラー0件）
- ビルドが成功
