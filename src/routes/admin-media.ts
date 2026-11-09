import { Hono } from 'hono';
import { uploadToR2, deleteFromR2 } from '../lib/r2';
import type { Env } from '../types';

type AdminEnv = { Bindings: Env; Variables: { adminId: number; username: string } };

const adminMedia = new Hono<AdminEnv>();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// POST /upload - upload image
adminMedia.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }

    // file is now typed as File by Hono's parseBody
    const fileObj = file as unknown as { type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

    // Validate type
    if (!ALLOWED_TYPES.includes(fileObj.type)) {
      return c.json({
        error: `Invalid file type: ${fileObj.type}. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
      }, 400);
    }

    // Validate size (different limits for images vs videos)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileObj.type);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxSizeMB = maxSize / (1024 * 1024);

    if (fileObj.size > maxSize) {
      return c.json({
        error: `File too large. Maximum size is ${maxSizeMB}MB, got ${(fileObj.size / 1024 / 1024).toFixed(2)}MB`,
      }, 400);
    }

    const buffer = await fileObj.arrayBuffer();
    const type = typeof body['type'] === 'string' ? body['type'] : 'general';

    const { url, key } = await uploadToR2(
      c.env.MEDIA_BUCKET,
      buffer,
      fileObj.type,
      c.env.R2_PUBLIC_URL,
      type
    );

    return c.json({ success: true, url, key }, 201);
  } catch (e) {
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

// DELETE /:key - delete image from R2 (key is URL-encoded)
adminMedia.delete('/:key{.+}', async (c) => {
  try {
    const key = decodeURIComponent(c.req.param('key'));

    if (!key) {
      return c.json({ error: 'Image key is required' }, 400);
    }

    await deleteFromR2(c.env.MEDIA_BUCKET, key);

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

// GET / - list recent uploads (returns empty for now)
adminMedia.get('/', async (c) => {
  return c.json({ images: [] });
});

export default adminMedia;
