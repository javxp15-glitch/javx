-- AlterTable: change file_size from INT4 to INT8 (BigInt) to support files larger than 2GB
ALTER TABLE "videos" ALTER COLUMN "file_size" SET DATA TYPE BIGINT;
