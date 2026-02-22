-- AlterTable: テンプレートファイルのバイナリデータをDBに保存（エフェメラルFS対策）
ALTER TABLE "Template" ADD COLUMN "fileData" BYTEA;

-- AlterTable: PDF実体データをDBに保存（エフェメラルFS対策）
ALTER TABLE "GenerationHistory" ADD COLUMN "pdfData" BYTEA;
