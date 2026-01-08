const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'takag', 'Downloads', '送付状 (大和鋼業株式会社様).docx');

try {
  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);

  const documentXml = zip.file('word/document.xml').asText();

  console.log('📄 Cover Letter Structure Analysis');
  console.log('='.repeat(80));

  // 段落スタイルを抽出
  const paraStyleRegex = /<w:pStyle w:val="([^"]+)"/g;
  const paraStyles = new Set();
  let match;
  while ((match = paraStyleRegex.exec(documentXml)) !== null) {
    paraStyles.add(match[1]);
  }

  console.log('\n📝 Paragraph Styles Used:');
  if (paraStyles.size > 0) {
    paraStyles.forEach(style => console.log(`  - ${style}`));
  } else {
    console.log('  - None (default style)');
  }

  // 太字の使用を検出
  const boldCount = (documentXml.match(/<w:b\/>/g) || []).length;
  const boldBCount = (documentXml.match(/<w:b w:val="true"\/>/g) || []).length;
  console.log('\n🔥 Bold Formatting:');
  console.log(`  - Bold tags: ${boldCount + boldBCount}`);

  // フォントサイズの使用を検出
  const fontSizeRegex = /<w:sz w:val="(\d+)"/g;
  const fontSizes = new Map();
  while ((match = fontSizeRegex.exec(documentXml)) !== null) {
    const size = parseInt(match[1]) / 2;
    fontSizes.set(size, (fontSizes.get(size) || 0) + 1);
  }

  console.log('\n📏 Font Sizes (pt):');
  Array.from(fontSizes.entries()).sort((a, b) => b[0] - a[0]).forEach(([size, count]) => {
    console.log(`  - ${size}pt (used ${count} times)`);
  });

  // 配置の使用を検出
  const alignments = {
    center: (documentXml.match(/<w:jc w:val="center"\/>/g) || []).length,
    right: (documentXml.match(/<w:jc w:val="right"\/>/g) || []).length,
    both: (documentXml.match(/<w:jc w:val="both"\/>/g) || []).length,
    left: (documentXml.match(/<w:jc w:val="left"\/>/g) || []).length,
  };

  console.log('\n📐 Text Alignment:');
  Object.entries(alignments).forEach(([align, count]) => {
    if (count > 0) console.log(`  - ${align}: ${count}`);
  });

  // 行間の使用を検出
  const lineSpacingRegex = /<w:spacing w:line="(\d+)"/g;
  const lineSpacings = new Set();
  while ((match = lineSpacingRegex.exec(documentXml)) !== null) {
    lineSpacings.add(match[1]);
  }

  console.log('\n📊 Line Spacing:');
  if (lineSpacings.size > 0) {
    lineSpacings.forEach(spacing => console.log(`  - ${spacing} (${parseInt(spacing) / 100} ratio)`));
  } else {
    console.log('  - Default');
  }

  console.log('\n📋 First Few Paragraphs (simplified):');
  console.log('='.repeat(80));
  const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
  const texts = [];
  while ((match = textRegex.exec(documentXml)) !== null) {
    if (match[1].trim()) {
      texts.push(match[1]);
    }
  }

  texts.slice(0, 15).forEach((text, idx) => {
    console.log(`${idx + 1}. ${text}`);
  });

} catch (error) {
  console.error('Error:', error.message);
}
