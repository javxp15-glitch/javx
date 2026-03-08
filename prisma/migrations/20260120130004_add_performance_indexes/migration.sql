-- CreateIndex
CREATE INDEX "videos_views_idx" ON "videos"("views" DESC);

-- CreateIndex
CREATE INDEX "videos_created_at_idx" ON "videos"("created_at" DESC);
