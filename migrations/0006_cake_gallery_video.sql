-- Allow cake gallery entries to be videos (with an optional poster frame)
ALTER TABLE cake_images ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image';
ALTER TABLE cake_images ADD COLUMN poster_url TEXT;
ALTER TABLE cake_images ADD COLUMN poster_key TEXT;
