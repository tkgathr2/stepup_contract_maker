const mammoth = require('mammoth');
const path = require('path');

const filePath = path.join('C:', 'Users', 'takag', 'Downloads', '人材紹介契約書(大和鋼業株式会社様）.docx');
console.log('Analyzing file:', filePath);
console.log('='.repeat(80));

// より詳細な変換オプションを使用
const options = {
  styleMap: [
    "p[style-name='Title'] => h1.title:fresh",
    "p[style-name='Heading 1'] => h2.heading1:fresh",
    "p[style-name='Heading 2'] => h3.heading2:fresh",
    "p[style-name='List Paragraph'] => p.list-para:fresh",
    "r[style-name='Strong'] => strong",
    "b => strong",
    "i => em"
  ],
  convertImage: mammoth.images.inline(function(image) {
    return image.read("base64").then(function(imageBuffer) {
      return {
        src: "data:" + image.contentType + ";base64," + imageBuffer
      };
    });
  }),
  includeDefaultStyleMap: true,
  includeEmbeddedStyleMap: true
};

mammoth.convertToHtml({path: filePath}, options)
  .then(result => {
    console.log('\n📄 HTML Output (with style mapping):');
    console.log('='.repeat(80));
    console.log(result.value);
    console.log('='.repeat(80));

    if (result.messages.length > 0) {
      console.log('\n⚠️  Warnings/Messages:');
      result.messages.forEach(msg => console.log('  -', msg.message, `(${msg.type})`));
    }

    console.log('\n📊 Statistics:');
    const paragraphs = (result.value.match(/<p/g) || []).length;
    const lists = (result.value.match(/<ol|<ul/g) || []).length;
    const tables = (result.value.match(/<table/g) || []).length;
    console.log(`  - Paragraphs: ${paragraphs}`);
    console.log(`  - Lists: ${lists}`);
    console.log(`  - Tables: ${tables}`);
  })
  .catch(err => console.error('Error:', err));
