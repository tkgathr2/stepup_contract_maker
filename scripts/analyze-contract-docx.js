const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const refPath = path.join('C:', 'Users', 'takag', 'Downloads', '人材紹介契約書(大和鋼業株式会社様）.docx');

console.log('🔍 Analyzing Contract Reference DOCX');
console.log('='.repeat(80));

const content = fs.readFileSync(refPath);
const zip = new PizZip(content);
const documentXml = zip.file('word/document.xml').asText();

// 段落ごとの詳細情報を抽出
const paraRegex = /<w:p\s[^>]*?>.*?<\/w:p>/gs;
const paragraphs = documentXml.match(paraRegex) || [];

console.log('\n📋 First 10 Paragraphs Analysis:\n');

let paraIndex = 0;
for (const para of paragraphs) {
  // テキストを抽出
  const textRegex = /<w:t[^>]*?>(.*?)<\/w:t>/gs;
  const texts = [];
  let match;
  while ((match = textRegex.exec(para)) !== null) {
    texts.push(match[1]);
  }
  const text = texts.join('').trim();

  if (!text) continue; // 空の段落はスキップ

  paraIndex++;

  // 配置を抽出
  const alignMatch = para.match(/<w:jc w:val="(left|center|right|both)"\/>/)
  const alignment = alignMatch ? alignMatch[1] : 'default';

  // フォントサイズを抽出
  const fontSizeMatch = para.match(/<w:sz w:val="(\d+)"\/>/)
  const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) / 2 : 'default';

  console.log(`${paraIndex}. "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`);
  console.log(`   Align: ${alignment}, Font: ${fontSize}pt`);

  if (paraIndex >= 10) break;
}

console.log('\n' + '='.repeat(80));
console.log('\n📊 Document Statistics:\n');

// タイトルのフォントサイズを確認
const titleText = paragraphs[0];
const titleFontMatch = titleText.match(/<w:sz w:val="(\d+)"\/>/)
const titleFontSize = titleFontMatch ? parseInt(titleFontMatch[1]) / 2 : 'unknown';
console.log(`Title Font Size: ${titleFontSize}pt`);

// タイトルの配置を確認
const titleAlignMatch = titleText.match(/<w:jc w:val="(left|center|right|both)"\/>/)
const titleAlign = titleAlignMatch ? titleAlignMatch[1] : 'default';
console.log(`Title Alignment: ${titleAlign}`);

// 全体の配置統計
const alignStats = {
  center: (documentXml.match(/<w:jc w:val="center"\/>/g) || []).length,
  right: (documentXml.match(/<w:jc w:val="right"\/>/g) || []).length,
  left: (documentXml.match(/<w:jc w:val="left"\/>/g) || []).length,
};

console.log('\nAlignment Statistics:');
Object.entries(alignStats).forEach(([align, count]) => {
  if (count > 0) console.log(`  ${align}: ${count}`);
});

// フォントサイズの統計
const fontSizeRegex = /<w:sz w:val="(\d+)"\/?>/g;
const fontSizes = new Map();
while ((match = fontSizeRegex.exec(documentXml)) !== null) {
  const size = parseInt(match[1]) / 2;
  fontSizes.set(size, (fontSizes.get(size) || 0) + 1);
}

console.log('\nFont Size Distribution:');
Array.from(fontSizes.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([size, count]) => {
    console.log(`  ${size}pt: ${count} occurrences`);
  });
