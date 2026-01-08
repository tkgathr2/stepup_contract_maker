const fs = require('fs');
const path = require('path');

/**
 * 3回のテストを実施
 */
async function runTests() {
  console.log('=================================================');
  console.log('PDFとWord生成テスト（3回実施）');
  console.log('=================================================\n');

  const testData = {
    postalCode: '150-0002',
    companyName: 'テスト株式会社',
    representativeName: '山田太郎',
    address: '', // 郵便番号から自動入力される
  };

  const results = [];

  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- テスト ${i}/3 回目 ---`);
    console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}\n`);

    try {
      // APIを呼び出す
      console.log('テストデータ:');
      console.log(`  郵便番号: ${testData.postalCode}`);
      console.log(`  会社名: ${testData.companyName}`);
      console.log(`  代表者名: ${testData.representativeName}`);
      console.log(`  住所: ${testData.address || '（郵便番号から自動検索）'}\n`);

      console.log('API呼び出し中...');

      const response = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'PDF生成に失敗しました');
      }

      console.log('✓ API呼び出し成功\n');

      // 結果を確認
      console.log('生成結果:');
      console.log(`  契約書PDF: ${data.contractPdfUrl}`);
      console.log(`  契約書Word: ${data.contractDocxUrl}`);
      console.log(`  送付状PDF: ${data.invoicePdfUrl}`);
      console.log(`  送付状Word: ${data.invoiceDocxUrl}`);
      console.log(`  郵便番号: ${data.postalCode}\n`);

      // ファイルの存在確認
      const contractPdfPath = path.join(process.cwd(), 'public', data.contractPdfUrl);
      const contractDocxPath = path.join(process.cwd(), 'public', data.contractDocxUrl);
      const invoicePdfPath = path.join(process.cwd(), 'public', data.invoicePdfUrl);
      const invoiceDocxPath = path.join(process.cwd(), 'public', data.invoiceDocxUrl);

      console.log('ファイル存在確認:');

      const contractPdfExists = fs.existsSync(contractPdfPath);
      const contractDocxExists = fs.existsSync(contractDocxPath);
      const invoicePdfExists = fs.existsSync(invoicePdfPath);
      const invoiceDocxExists = fs.existsSync(invoiceDocxPath);

      console.log(`  契約書PDF: ${contractPdfExists ? '✓ 存在' : '✗ 存在しない'}`);
      console.log(`  契約書Word: ${contractDocxExists ? '✓ 存在' : '✗ 存在しない'}`);
      console.log(`  送付状PDF: ${invoicePdfExists ? '✓ 存在' : '✗ 存在しない'}`);
      console.log(`  送付状Word: ${invoiceDocxExists ? '✓ 存在' : '✗ 存在しない'}\n`);

      const allFilesExist = contractPdfExists && contractDocxExists && invoicePdfExists && invoiceDocxExists;

      if (allFilesExist) {
        // ファイルサイズも確認
        const contractPdfSize = fs.statSync(contractPdfPath).size;
        const contractDocxSize = fs.statSync(contractDocxPath).size;
        const invoicePdfSize = fs.statSync(invoicePdfPath).size;
        const invoiceDocxSize = fs.statSync(invoiceDocxPath).size;

        console.log('ファイルサイズ:');
        console.log(`  契約書PDF: ${(contractPdfSize / 1024).toFixed(2)} KB`);
        console.log(`  契約書Word: ${(contractDocxSize / 1024).toFixed(2)} KB`);
        console.log(`  送付状PDF: ${(invoicePdfSize / 1024).toFixed(2)} KB`);
        console.log(`  送付状Word: ${(invoiceDocxSize / 1024).toFixed(2)} KB\n`);

        console.log(`✓ テスト ${i}/3 回目: 成功`);

        results.push({
          testNumber: i,
          success: true,
          data,
          files: {
            contractPdf: { path: contractPdfPath, size: contractPdfSize },
            contractDocx: { path: contractDocxPath, size: contractDocxSize },
            invoicePdf: { path: invoicePdfPath, size: invoicePdfSize },
            invoiceDocx: { path: invoiceDocxPath, size: invoiceDocxSize },
          },
        });
      } else {
        throw new Error('一部のファイルが生成されませんでした');
      }
    } catch (error) {
      console.error(`✗ テスト ${i}/3 回目: 失敗`);
      console.error(`エラー: ${error.message}\n`);

      results.push({
        testNumber: i,
        success: false,
        error: error.message,
      });
    }

    console.log(`終了時刻: ${new Date().toLocaleString('ja-JP')}`);
  }

  // 最終結果をまとめる
  console.log('\n=================================================');
  console.log('テスト結果サマリー');
  console.log('=================================================\n');

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  results.forEach(result => {
    if (result.success) {
      console.log(`✓ テスト ${result.testNumber}/3: 成功`);
    } else {
      console.log(`✗ テスト ${result.testNumber}/3: 失敗 - ${result.error}`);
    }
  });

  console.log(`\n成功: ${successCount}/3`);
  console.log(`失敗: ${failureCount}/3\n`);

  if (successCount === 3) {
    console.log('🎉 テスト完了：3回すべて成功しました！\n');
    console.log('次の手順:');
    console.log('1. ブラウザで http://localhost:3000 にアクセス');
    console.log('2. 生成されたPDFをダウンロード');
    console.log('3. WordテンプレートとPDFのレイアウトを目視で比較してください\n');
    console.log('確認項目:');
    console.log('  - フォントサイズ・フォント種類が一致しているか');
    console.log('  - 行間・段落間隔が一致しているか');
    console.log('  - 表のレイアウト（罫線、セル幅、セル内余白）が一致しているか');
    console.log('  - 余白（上下左右）が一致しているか');
    console.log('  - 文字の配置（左揃え、中央揃え、右揃え）が一致しているか');
    console.log('  - 改ページ位置が一致しているか');
    console.log('  - 郵便番号が「〒150-0002」の形式で表示されているか');
    console.log('  - 日付が「2026/01/07」の形式で表示されているか');
    console.log('  - 住所が郵便番号から自動入力されているか');
  } else {
    console.log('⚠ テストに失敗しました。上記のエラーを確認して修正してください。\n');
    process.exit(1);
  }
}

// テストを実行
runTests().catch(error => {
  console.error('テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});
