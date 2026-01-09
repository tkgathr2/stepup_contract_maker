const fs = require('fs');
const path = require('path');
const { generatePDF } = require('../lib/pdf-generator');
const crypto = require('crypto');

async function testConsistency() {
  console.log('🔬 Testing PDF Generation Consistency (3 iterations)');
  console.log('='.repeat(80));

  const files = [
    {
      name: '人材紹介契約書',
      path: path.join('C:', 'Users', 'takag', 'Downloads', '人材紹介契約書(大和鋼業株式会社様）.docx')
    },
    {
      name: '送付状',
      path: path.join('C:', 'Users', 'takag', 'Downloads', '送付状 (大和鋼業株式会社様).docx')
    }
  ];

  for (const file of files) {
    console.log(`\n📄 Testing: ${file.name}`);
    console.log('-'.repeat(80));

    const docxBuffer = fs.readFileSync(file.path);
    const hashes = [];
    const sizes = [];
    const times = [];

    for (let i = 1; i <= 3; i++) {
      const startTime = Date.now();
      const result = await generatePDF(docxBuffer, `consistency-${file.name}-${i}`);
      const duration = Date.now() - startTime;

      // ファイルのハッシュを計算
      const pdfBuffer = fs.readFileSync(result.pdfPath);
      const hash = crypto.createHash('md5').update(pdfBuffer).digest('hex');
      const size = pdfBuffer.length;

      hashes.push(hash);
      sizes.push(size);
      times.push(duration);

      console.log(`   Test ${i}: ${duration}ms, ${(size / 1024).toFixed(2)} KB, Hash: ${hash.substring(0, 16)}...`);
    }

    // 一貫性をチェック
    const allSame = hashes.every(h => h === hashes[0]);
    console.log(`\n   ${allSame ? '✅' : '❌'} Consistency: ${allSame ? 'PASS - All PDFs are identical' : 'FAIL - PDFs differ'}`);
    console.log(`   📊 Average generation time: ${(times.reduce((a, b) => a + b) / times.length).toFixed(0)}ms`);
    console.log(`   📁 File size: ${(sizes[0] / 1024).toFixed(2)} KB`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Consistency Test Complete!');
}

testConsistency().catch(err => console.error('Error:', err));
