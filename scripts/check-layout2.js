const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'Users', 'takag', 'Downloads', '送付状 (大和鋼業株式会社様).docx');
console.log('Reading file:', filePath);

mammoth.convertToHtml({path: filePath})
  .then(result => {
    console.log('HTML Output:');
    console.log('='.repeat(80));
    console.log(result.value);
    console.log('='.repeat(80));
    if (result.messages.length > 0) {
      console.log('\nWarnings/Messages:');
      result.messages.forEach(msg => console.log(msg));
    }
  })
  .catch(err => console.error('Error:', err));
