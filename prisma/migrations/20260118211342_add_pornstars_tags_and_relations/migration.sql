/*
  Warnings:

  - The primary key for the `video_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `video_categories` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `videos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `videos` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "video_categories_video_id_category_id_key";

-- AlterTable
ALTER TABLE "video_categories" DROP CONSTRAINT "video_categories_pkey",
DROP COLUMN "id",
ADD COLUMN     "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "video_categories_pkey" PRIMARY KEY ("video_id", "category_id");

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "preview_url" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "pornstars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_jp" TEXT,
    "slug" TEXT NOT NULL,
    "avatar" TEXT,
    "height" INTEGER,
    "cup_size" TEXT,
    "bust" INTEGER,
    "waist" INTEGER,
    "hip" INTEGER,
    "birthday" TIMESTAMP(3),
    "debut_year" INTEGER,
    "nationality" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pornstars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "usage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_pornstars" (
    "video_id" TEXT NOT NULL,
    "pornstar_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_pornstars_pkey" PRIMARY KEY ("video_id","pornstar_id")
);

-- CreateTable
CREATE TABLE "video_tags" (
    "video_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_tags_pkey" PRIMARY KEY ("video_id","tag_id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_last4" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pornstars_slug_key" ON "pornstars"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "video_pornstars_video_id_idx" ON "video_pornstars"("video_id");

-- CreateIndex
CREATE INDEX "video_pornstars_pornstar_id_idx" ON "video_pornstars"("pornstar_id");

-- CreateIndex
CREATE INDEX "video_tags_video_id_idx" ON "video_tags"("video_id");

-- CreateIndex
CREATE INDEX "video_tags_tag_id_idx" ON "video_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_hash_key" ON "api_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "api_tokens_created_by_id_idx" ON "api_tokens"("created_by_id");

-- CreateIndex
CREATE INDEX "api_tokens_expires_at_idx" ON "api_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "videos_slug_key" ON "videos"("slug");

-- CreateIndex
CREATE INDEX "videos_slug_idx" ON "videos"("slug");

-- AddForeignKey
ALTER TABLE "video_pornstars" ADD CONSTRAINT "video_pornstars_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_pornstars" ADD CONSTRAINT "video_pornstars_pornstar_id_fkey" FOREIGN KEY ("pornstar_id") REFERENCES "pornstars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tags" ADD CONSTRAINT "video_tags_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tags" ADD CONSTRAINT "video_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
