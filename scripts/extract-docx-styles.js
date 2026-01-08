const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'takag', 'Downloads', '人材紹介契約書(大和鋼業株式会社様）.docx');

try {
  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);

  // document.xmlを取得
  const documentXml = zip.file('word/document.xml').asText();

  // styles.xmlを取得
  let stylesXml = '';
  try {
    stylesXml = zip.file('word/styles.xml').asText();
  } catch (e) {
    console.log('styles.xml not found');
  }

  console.log('📄 Document Structure Analysis');
  console.log('='.repeat(80));

  // 段落スタイルを抽出
  const paraStyleRegex = /<w:pStyle w:val="([^"]+)"/g;
  const paraStyles = new Set();
  let match;
  while ((match = paraStyleRegex.exec(documentXml)) !== null) {
    paraStyles.add(match[1]);
  }

  console.log('\n📝 Paragraph Styles Used:');
  paraStyles.forEach(style => console.log(`  - ${style}`));

  // 文字スタイルを抽出
  const runStyleRegex = /<w:rStyle w:val="([^"]+)"/g;
  const runStyles = new Set();
  while ((match = runStyleRegex.exec(documentXml)) !== null) {
    runStyles.add(match[1]);
  }

  console.log('\n✏️  Character/Run Styles Used:');
  if (runStyles.size > 0) {
    runStyles.forEach(style => console.log(`  - ${style}`));
  } else {
    console.log('  - None');
  }

  // 太字の使用を検出
  const boldCount = (documentXml.match(/<w:b\/>/g) || []).length;
  const boldBCount = (documentXml.match(/<w:b w:val="true"\/>/g) || []).length;
  console.log('\n🔥 Bold Formatting:');
  console.log(`  - Bold tags: ${boldCount + boldBCount}`);

  // フォントサイズの使用を検出
  const fontSizeRegex = /<w:sz w:val="(\d+)"/g;
  const fontSizes = new Set();
  while ((match = fontSizeRegex.exec(documentXml)) !== null) {
    fontSizes.add(parseInt(match[1]) / 2); // Word uses half-points
  }

  console.log('\n📏 Font Sizes (pt):');
  Array.from(fontSizes).sort((a, b) => b - a).forEach(size => {
    const count = (documentXml.match(new RegExp(`<w:sz w:val="${size * 2}"`, 'g')) || []).length;
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

  // 最初の数段落のXMLを表示
  console.log('\n📋 First Few Paragraphs (XML):');
  console.log('='.repeat(80));
  const paragraphsRegex = /<w:p\s[^>]*>.*?<\/w:p>/gs;
  const paragraphs = documentXml.match(paragraphsRegex);
  if (paragraphs) {
    paragraphs.slice(0, 5).forEach((para, idx) => {
      console.log(`\nParagraph ${idx + 1}:`);
      // Simplify output
      const simplified = para
        .replace(/<w:proofErr[^>]*>/g, '')
        .replace(/<\/w:proofErr>/g, '')
        .replace(/\s+/g, ' ');
      console.log(simplified.substring(0, 500) + (simplified.length > 500 ? '...' : ''));
    });
  }

} catch (error) {
  console.error('Error:', error.message);
}
