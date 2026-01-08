const fs = require('fs');
const path = require('path');
const { generatePDF } = require('../lib/pdf-generator');

async function testPDFGeneration() {
  try {
    const docxPath = path.join('C:', 'Users', 'takag', 'Downloads', '人材紹介契約書(大和鋼業株式会社様）.docx');
    console.log('Reading reference file:', docxPath);

    const docxBuffer = fs.readFileSync(docxPath);
    console.log('File size:', docxBuffer.length, 'bytes');

    console.log('\nGenerating PDF...');
    const result = await generatePDF(docxBuffer, 'test-contract');

    console.log('\n✅ PDF Generated Successfully!');
    console.log('PDF URL:', result.pdfUrl);
    console.log('PDF Path:', result.pdfPath);
    console.log('\nYou can view it at: http://localhost:3000' + result.pdfUrl);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

testPDFGeneration();
