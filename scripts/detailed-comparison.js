const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function detailedComparison() {
  const refPath = path.join('C:', 'Users', 'takag', 'Downloads', '送付状 (大和鋼業株式会社様).docx');

  console.log('🔍 Detailed Layout Comparison');
  console.log('='.repeat(80));
  console.log('\n📄 Analyzing Reference DOCX...\n');

  const content = fs.readFileSync(refPath);
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // 段落ごとの詳細情報を抽出
  const paraRegex = /<w:p\s[^>]*?>.*?<\/w:p>/gs;
  const paragraphs = documentXml.match(paraRegex) || [];

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
    const alignment = alignMatch ? alignMatch[1] : 'default(left)';

    // フォントサイズを抽出
    const fontSizeMatch = para.match(/<w:sz w:val="(\d+)"\/>/)
    const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) / 2 : 'default';

    // 太字を確認
    const isBold = para.includes('<w:b/>') || para.includes('<w:b w:val="true"');

    // インデントを確認
    const indentMatch = para.match(/<w:ind w:left="(\d+)"/)
    const indent = indentMatch ? parseInt(indentMatch[1]) / 567 : 0; // twipsからインチに変換

    // 行間を確認
    const lineSpacingMatch = para.match(/<w:spacing w:line="(\d+)"/)
    const lineSpacing = lineSpacingMatch ? parseInt(lineSpacingMatch[1]) / 240 : 'default';

    console.log(`Paragraph ${paraIndex}:`);
    console.log(`  Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`  Alignment: ${alignment}`);
    console.log(`  Font Size: ${fontSize}pt`);
    console.log(`  Bold: ${isBold ? 'Yes' : 'No'}`);
    console.log(`  Indent: ${indent.toFixed(2)} inches`);
    console.log(`  Line Spacing: ${lineSpacing}`);
    console.log('');

    if (paraIndex >= 15) {
      console.log('... (showing first 15 paragraphs only)\n');
      break;
    }
  }

  console.log('='.repeat(80));
  console.log('\n📊 Summary of Reference Document:');

  // 統計情報
  const alignments = {
    left: (documentXml.match(/<w:jc w:val="left"\/>/g) || []).length,
    center: (documentXml.match(/<w:jc w:val="center"\/>/g) || []).length,
    right: (documentXml.match(/<w:jc w:val="right"\/>/g) || []).length,
    both: (documentXml.match(/<w:jc w:val="both"\/>/g) || []).length,
  };

  console.log('\nAlignment Distribution:');
  Object.entries(alignments).forEach(([align, count]) => {
    if (count > 0) console.log(`  - ${align}: ${count} paragraphs`);
  });

  // フォントサイズの分布
  const fontSizeRegex = /<w:sz w:val="(\d+)"\/?>/g;
  const fontSizes = new Map();
  while ((match = fontSizeRegex.exec(documentXml)) !== null) {
    const size = parseInt(match[1]) / 2;
    fontSizes.set(size, (fontSizes.get(size) || 0) + 1);
  }

  console.log('\nFont Size Distribution:');
  Array.from(fontSizes.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([size, count]) => {
      console.log(`  - ${size}pt: ${count} occurrences`);
    });
}

detailedComparison().catch(err => console.error('Error:', err));
