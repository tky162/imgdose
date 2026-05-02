-- 0002_add_batches.sql
-- バッチ（箱）機能: 記事単位で複数画像をまとめてアップロード・URL出力する

CREATE TABLE IF NOT EXISTS batches (
  id        TEXT    PRIMARY KEY,
  batch_id  TEXT    UNIQUE NOT NULL,  -- 6桁ランダム英数字 (例: abc123)
  name      TEXT,
  total_images INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_batches_batch_id   ON batches (batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches (created_at DESC);

ALTER TABLE images ADD COLUMN batch_id        TEXT;
ALTER TABLE images ADD COLUMN sequence_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_images_batch_id ON images (batch_id);
