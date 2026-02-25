-- Gallery images for cakes (additional images beyond the cover image)
CREATE TABLE IF NOT EXISTS cake_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cake_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  image_key TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cake_id) REFERENCES cakes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cake_images_cake_id ON cake_images(cake_id);
