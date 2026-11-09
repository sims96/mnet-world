-- Add video support to blog_posts and humanitarian_entries
ALTER TABLE blog_posts ADD COLUMN video_url TEXT;
ALTER TABLE blog_posts ADD COLUMN video_key TEXT;

ALTER TABLE humanitarian_entries ADD COLUMN video_url TEXT;
ALTER TABLE humanitarian_entries ADD COLUMN video_key TEXT;
