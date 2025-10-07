-- 0001_create_images.sql
-- imgdose image metadata schema

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL,
  file_extension TEXT,
  public_url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_original_filename ON images (original_filename);
