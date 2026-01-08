const fs = require('fs');
const path = require('path');
const { generatePDF } = require('../lib/pdf-generator');

async function testCoverLetterAlignment() {
  try {
    const docxPath = path.join('C:', 'Users', 'takag', 'Downloads', '送付状 (大和鋼業株式会社様).docx');
    console.log('Reading cover letter file:', docxPath);

    const docxBuffer = fs.readFileSync(docxPath);
    console.log('File size:', docxBuffer.length, 'bytes');

    console.log('\nGenerating PDF with alignment support...');
    const result = await generatePDF(docxBuffer, 'test-cover-letter-aligned');

    console.log('\n✅ PDF Generated Successfully!');
    console.log('PDF URL:', result.pdfUrl);
    console.log('PDF Path:', result.pdfPath);
    console.log('\nYou can view it at: http://localhost:3000' + result.pdfUrl);
    console.log('\n📋 Check the following alignments:');
    console.log('   - Date (2025/10/27) should be RIGHT aligned');
    console.log('   - Sender info should be RIGHT aligned');
    console.log('   - Title should be CENTER aligned');
    console.log('   - "記" should be CENTER aligned');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

testCoverLetterAlignment();
