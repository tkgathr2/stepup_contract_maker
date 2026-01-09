const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function compareLayouts() {
  const refPath = path.join('C:', 'Users', 'takag', 'Downloads', '人材紹介契約書(大和鋼業株式会社様）.docx');

  console.log('📄 Analyzing Reference DOCX Layout...');
  console.log('='.repeat(80));

  const docxBuffer = fs.readFileSync(refPath);

  // 現在の変換設定でHTMLを生成
  const result = await mammoth.convertToHtml(
    { buffer: docxBuffer },
    {
      styleMap: [
        "p[style-name='List Paragraph'] => p.list-para:fresh",
        "p[style-name='a9'] => p.list-para:fresh",
        "b => strong",
        "i => em",
      ],
      includeDefaultStyleMap: true,
    }
  );

  let htmlContent = result.value;

  // 最初の段落をタイトルとして扱う
  htmlContent = htmlContent.replace(
    /^<p>(.*?)<\/p>/,
    '<p class="title">$1</p>'
  );

  console.log('\n📋 Generated HTML Structure (first 2000 chars):');
  console.log('='.repeat(80));
  console.log(htmlContent.substring(0, 2000));
  console.log('...\n');

  console.log('\n⚠️  Conversion Messages:');
  if (result.messages.length > 0) {
    result.messages.forEach(msg => {
      console.log(`  - [${msg.type}] ${msg.message}`);
    });
  } else {
    console.log('  - No warnings');
  }

  console.log('\n📊 HTML Analysis:');
  console.log(`  - Total length: ${htmlContent.length} characters`);
  console.log(`  - Paragraphs: ${(htmlContent.match(/<p/g) || []).length}`);
  console.log(`  - Title paragraphs: ${(htmlContent.match(/<p class="title"/g) || []).length}`);
  console.log(`  - List paragraphs: ${(htmlContent.match(/<p class="list-para"/g) || []).length}`);
  console.log(`  - Ordered lists: ${(htmlContent.match(/<ol>/g) || []).length}`);
  console.log(`  - List items: ${(htmlContent.match(/<li>/g) || []).length}`);

  console.log('\n✅ Analysis Complete');
}

compareLayouts().catch(err => console.error('Error:', err));
