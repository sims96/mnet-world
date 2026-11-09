import { Hono } from 'hono';
import { slugify } from '../lib/slugify';
import { deleteFromR2 } from '../lib/r2';
import type { Env, HumanitarianEntry } from '../types';
import { normalizeMediaUrl } from '../lib/media-url';

type AdminEnv = { Bindings: Env; Variables: { adminId: number; username: string } };

const adminHumanitarian = new Hono<AdminEnv>();

// GET / - list all entries
adminHumanitarian.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM humanitarian_entries ORDER BY activity_date DESC, created_at DESC'
    ).all<HumanitarianEntry>();
    const entries = results.map((entry: any) => ({
      ...entry,
      cover_image_url: normalizeMediaUrl(entry.cover_image_url, entry.cover_image_key),
      video_url: normalizeMediaUrl(entry.video_url, entry.video_key),
    }));
    return c.json({ entries });
  } catch (e) {
    return c.json({ error: 'Failed to fetch entries' }, 500);
  }
});

// GET /:id - get entry by id
adminHumanitarian.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const entry = await c.env.DB.prepare(
      'SELECT * FROM humanitarian_entries WHERE id = ?'
    ).bind(id).first<HumanitarianEntry>();

    if (!entry) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    const normalizedEntry = {
      ...entry,
      cover_image_url: normalizeMediaUrl(entry.cover_image_url, entry.cover_image_key),
      video_url: normalizeMediaUrl((entry as any).video_url, (entry as any).video_key),
    };

    return c.json({ entry: normalizedEntry });
  } catch (e) {
    return c.json({ error: 'Failed to fetch entry' }, 500);
  }
});

// POST / - create entry
adminHumanitarian.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      title: string;
      description: string;
      cover_image_url?: string;
      cover_image_key?: string;
      video_url?: string;
      video_key?: string;
      location?: string;
      activity_date?: string;
    }>();

    if (!body.title || !body.description) {
      return c.json({ error: 'Title and description are required' }, 400);
    }

    const slug = slugify(body.title);

    const result = await c.env.DB.prepare(
      `INSERT INTO humanitarian_entries (title, slug, description, cover_image_url, cover_image_key, video_url, video_key, location, activity_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.title,
      slug,
      body.description,
      body.cover_image_url || null,
      body.cover_image_key || null,
      body.video_url || null,
      body.video_key || null,
      body.location || null,
      body.activity_date || null
    ).run();

    return c.json({
      success: true,
      entry: {
        id: result.meta.last_row_id,
        title: body.title,
        slug,
      },
    }, 201);
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return c.json({ error: 'An entry with this title already exists' }, 400);
    }
    return c.json({ error: 'Failed to create entry' }, 500);
  }
});

// PUT /:id - update entry
adminHumanitarian.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{
      title?: string;
      description?: string;
      cover_image_url?: string | null;
      cover_image_key?: string | null;
      video_url?: string | null;
      video_key?: string | null;
      location?: string | null;
      activity_date?: string | null;
      is_published?: number;
    }>();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM humanitarian_entries WHERE id = ?'
    ).bind(id).first<HumanitarianEntry>();

    if (!existing) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    const title = body.title ?? existing.title;
    const slug = body.title ? slugify(body.title) : existing.slug;
    const description = body.description ?? existing.description;
    const coverImageUrl = body.cover_image_url !== undefined ? body.cover_image_url : existing.cover_image_url;
    const coverImageKey = body.cover_image_key !== undefined ? body.cover_image_key : existing.cover_image_key;
    const videoUrl = body.video_url !== undefined ? body.video_url : existing.video_url;
    const videoKey = body.video_key !== undefined ? body.video_key : existing.video_key;
    const location = body.location !== undefined ? body.location : existing.location;
    const activityDate = body.activity_date !== undefined ? body.activity_date : existing.activity_date;
    const isPublished = body.is_published ?? existing.is_published;

    await c.env.DB.prepare(
      `UPDATE humanitarian_entries SET title = ?, slug = ?, description = ?, cover_image_url = ?,
       cover_image_key = ?, video_url = ?, video_key = ?, location = ?, activity_date = ?, is_published = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      title, slug, description, coverImageUrl,
      coverImageKey, videoUrl, videoKey, location, activityDate, isPublished, id
    ).run();

    return c.json({ success: true, entry: { id, title, slug } });
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return c.json({ error: 'An entry with this title already exists' }, 400);
    }
    return c.json({ error: 'Failed to update entry' }, 500);
  }
});

// DELETE /:id - delete entry
adminHumanitarian.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const existing = await c.env.DB.prepare(
      'SELECT * FROM humanitarian_entries WHERE id = ?'
    ).bind(id).first<HumanitarianEntry>();

    if (!existing) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    // Delete R2 image if exists
    if (existing.cover_image_key) {
      try {
        await deleteFromR2(c.env.MEDIA_BUCKET, existing.cover_image_key);
      } catch {
        // Continue even if R2 delete fails
      }
    }

    // Delete R2 video if exists
    if (existing.video_key) {
      try {
        await deleteFromR2(c.env.MEDIA_BUCKET, existing.video_key);
      } catch {
        // Continue even if R2 delete fails
      }
    }

    await c.env.DB.prepare('DELETE FROM humanitarian_entries WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to delete entry' }, 500);
  }
});

export default adminHumanitarian;
