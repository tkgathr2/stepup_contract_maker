const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

/**
 * Word文書内のテキストを置換する
 * @param {string} filePath - Word文書のパス
 * @param {Object} replacements - 置換マップ
 * @returns {boolean} - 置換が行われたかどうか
 */
function replaceTextInDocx(filePath, replacements) {
  // ファイルを読み込む
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);

  // document.xmlを取得
  const documentXml = zip.file('word/document.xml').asText();

  // テキストを置換
  let updatedXml = documentXml;
  let hasChanges = false;

  for (const [oldText, newText] of Object.entries(replacements)) {
    // グローバル置換（すべての出現箇所を置換）
    const regex = new RegExp(escapeRegExp(oldText), 'g');
    const matches = updatedXml.match(regex);
    if (matches && matches.length > 0) {
      console.log(`  - "${oldText}" → "${newText}" (${matches.length}箇所)`);
      updatedXml = updatedXml.replace(regex, newText);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    // 更新したXMLをzipに戻す
    zip.file('word/document.xml', updatedXml);

    // ファイルを保存
    const updatedContent = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✓ ${path.basename(filePath)} を更新しました`);
  } else {
    console.log(`ℹ ${path.basename(filePath)} に置換対象が見つかりませんでした`);
  }

  return hasChanges;
}

/**
 * バックアップを作成する
 * @param {string} filePath - バックアップ対象のファイルパス
 */
function createBackup(filePath) {
  const backupPath = filePath.replace('.docx', '_backup.docx');

  if (fs.existsSync(backupPath)) {
    console.log(`ℹ バックアップは既に存在します: ${path.basename(backupPath)}`);
    return;
  }

  fs.copyFileSync(filePath, backupPath);
  console.log(`✓ バックアップを作成しました: ${path.basename(backupPath)}`);
}

/**
 * 正規表現用にエスケープ
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * テンプレート内のプレースホルダーを確認する
 * @param {string} filePath - Word文書のパス
 */
function checkPlaceholders(filePath) {
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  const placeholders = ['{postalCode}', '{address}', '{companyName}', '{representativeName}', '{currentDate}'];
  console.log(`\n${path.basename(filePath)} のプレースホルダー確認:`);

  for (const placeholder of placeholders) {
    const regex = new RegExp(escapeRegExp(placeholder), 'g');
    const matches = documentXml.match(regex);
    const count = matches ? matches.length : 0;
    const status = count > 0 ? '✓' : '✗';
    console.log(`  ${status} ${placeholder}: ${count}箇所`);
  }
}

// テンプレートファイルのパス
const invoiceTemplatePath = path.join(__dirname, '..', 'templates', 'invoice_template.docx');
const contractTemplatePath = path.join(__dirname, '..', 'templates', 'contract_template.docx');

// 置換マップ
const replacements = {
  '〒{address}': '{postalCode}{address}',
};

console.log('郵便番号プレースホルダーの修正を開始します...\n');

try {
  // 送付状テンプレートを処理
  if (fs.existsSync(invoiceTemplatePath)) {
    console.log('【送付状テンプレート】');
    createBackup(invoiceTemplatePath);
    replaceTextInDocx(invoiceTemplatePath, replacements);
    checkPlaceholders(invoiceTemplatePath);
  } else {
    console.log(`⚠ ${invoiceTemplatePath} が見つかりません`);
  }

  // 契約書テンプレートも確認
  if (fs.existsSync(contractTemplatePath)) {
    console.log('\n【契約書テンプレート】');
    createBackup(contractTemplatePath);
    replaceTextInDocx(contractTemplatePath, replacements);
    checkPlaceholders(contractTemplatePath);
  } else {
    console.log(`⚠ ${contractTemplatePath} が見つかりません`);
  }

  console.log('\n✓ 郵便番号プレースホルダーの修正が完了しました！');
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}
