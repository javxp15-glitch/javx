/*
  Warnings:

  - You are about to drop the column `category_id` on the `videos` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_category_id_fkey";

-- DropIndex
DROP INDEX "videos_category_id_idx";

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "category_id";

-- CreateTable
CREATE TABLE "video_categories" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "video_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_categories_video_id_idx" ON "video_categories"("video_id");

-- CreateIndex
CREATE INDEX "video_categories_category_id_idx" ON "video_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_categories_video_id_category_id_key" ON "video_categories"("video_id", "category_id");

-- AddForeignKey
ALTER TABLE "video_categories" ADD CONSTRAINT "video_categories_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_categories" ADD CONSTRAINT "video_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
