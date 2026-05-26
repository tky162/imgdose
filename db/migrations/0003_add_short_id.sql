-- 0003_add_short_id.sql
-- 単品アップロード用短縮ID: /{shortId}.{ext} でアクセス可能にする

ALTER TABLE images ADD COLUMN short_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_images_short_id ON images (short_id) WHERE short_id IS NOT NULL;
