const fs = require('fs');
const path = require('path');
const { generatePDF } = require('../lib/pdf-generator');

async function testMultiplePDFs() {
  const tests = [
    {
      name: '人材紹介契約書 - Test 1',
      file: '人材紹介契約書(大和鋼業株式会社様）.docx',
      outputName: 'test-contract-1'
    },
    {
      name: '人材紹介契約書 - Test 2',
      file: '人材紹介契約書(大和鋼業株式会社様）.docx',
      outputName: 'test-contract-2'
    },
    {
      name: '人材紹介契約書 - Test 3',
      file: '人材紹介契約書(大和鋼業株式会社様）.docx',
      outputName: 'test-contract-3'
    },
    {
      name: '送付状 - Test 1',
      file: '送付状 (大和鋼業株式会社様).docx',
      outputName: 'test-cover-letter-1'
    },
    {
      name: '送付状 - Test 2',
      file: '送付状 (大和鋼業株式会社様).docx',
      outputName: 'test-cover-letter-2'
    }
  ];

  console.log('🧪 Running Multiple PDF Generation Tests...');
  console.log('='.repeat(80));

  for (const test of tests) {
    try {
      const docxPath = path.join('C:', 'Users', 'takag', 'Downloads', test.file);

      console.log(`\n📄 Test: ${test.name}`);
      console.log(`   File: ${test.file}`);

      if (!fs.existsSync(docxPath)) {
        console.log(`   ❌ File not found: ${docxPath}`);
        continue;
      }

      const docxBuffer = fs.readFileSync(docxPath);
      console.log(`   ✓ File loaded (${docxBuffer.length} bytes)`);

      const startTime = Date.now();
      const result = await generatePDF(docxBuffer, test.outputName);
      const duration = Date.now() - startTime;

      console.log(`   ✓ PDF generated in ${duration}ms`);
      console.log(`   ✓ URL: http://localhost:3000${result.pdfUrl}`);

      // Check file size
      const stats = fs.statSync(result.pdfPath);
      console.log(`   ✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ All tests completed!');
  console.log('\nGenerated PDFs:');
  console.log('  - http://localhost:3000/generated/test-contract-1.pdf');
  console.log('  - http://localhost:3000/generated/test-contract-2.pdf');
  console.log('  - http://localhost:3000/generated/test-contract-3.pdf');
  console.log('  - http://localhost:3000/generated/test-cover-letter-1.pdf');
  console.log('  - http://localhost:3000/generated/test-cover-letter-2.pdf');
}

testMultiplePDFs();
