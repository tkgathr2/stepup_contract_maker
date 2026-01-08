const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

/**
 * Word文書内のテキストを置換する
 * @param {string} filePath - Word文書のパス
 * @param {Object} replacements - 置換マップ
 */
function replaceTextInDocx(filePath, replacements) {
  // ファイルを読み込む
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);

  // document.xmlを取得
  const documentXml = zip.file('word/document.xml').asText();

  // テキストを置換
  let updatedXml = documentXml;
  for (const [oldText, newText] of Object.entries(replacements)) {
    // グローバル置換（すべての出現箇所を置換）
    const regex = new RegExp(escapeRegExp(oldText), 'g');
    updatedXml = updatedXml.replace(regex, newText);
  }

  // 更新したXMLをzipに戻す
  zip.file('word/document.xml', updatedXml);

  // ファイルを保存
  const updatedContent = zip.generate({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, updatedContent);

  console.log(`✓ ${path.basename(filePath)} のプレースホルダーを置換しました`);
}

/**
 * 正規表現用にエスケープ
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// プレースホルダーの置換マップ
const replacements = {
  '★★★★★★★★★★': '{companyName}',
  '▼▼▼▼▼▼▼▼▼▼': '{currentDate}',
  // 郵便番号、住所、代表者名も既に{placeholder}形式になっている可能性があるため、
  // 念のため一般的なパターンを追加
};

// テンプレートファイルのパス
const contractTemplatePath = path.join(__dirname, '..', 'templates', 'contract_template.docx');
const invoiceTemplatePath = path.join(__dirname, '..', 'templates', 'invoice_template.docx');

console.log('プレースホルダーの置換を開始します...\n');

try {
  // 契約書テンプレートを処理
  if (fs.existsSync(contractTemplatePath)) {
    replaceTextInDocx(contractTemplatePath, replacements);
  } else {
    console.log(`⚠ ${contractTemplatePath} が見つかりません`);
  }

  // 送付状テンプレートを処理
  if (fs.existsSync(invoiceTemplatePath)) {
    replaceTextInDocx(invoiceTemplatePath, replacements);
  } else {
    console.log(`⚠ ${invoiceTemplatePath} が見つかりません`);
  }

  console.log('\n✓ プレースホルダーの置換が完了しました！');
  console.log('\n置換内容:');
  console.log('  ★★★★★★★★★★ → {companyName}');
  console.log('  ▼▼▼▼▼▼▼▼▼▼ → {currentDate}');
  console.log('\n※ 郵便番号、住所、代表者名のプレースホルダーも確認してください。');
  console.log('   必要に応じて、Word文書を開いて手動で {postalCode}、{address}、{representativeName} に置換してください。');
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}
