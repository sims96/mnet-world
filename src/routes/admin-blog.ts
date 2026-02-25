import { Hono } from 'hono';
import { slugify } from '../lib/slugify';
import { deleteFromR2 } from '../lib/r2';
import type { Env, BlogPost } from '../types';

type AdminEnv = { Bindings: Env; Variables: { adminId: number; username: string } };

const adminBlog = new Hono<AdminEnv>();

// GET / - list all posts (including drafts)
adminBlog.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM blog_posts ORDER BY created_at DESC'
    ).all<BlogPost>();
    return c.json({ posts: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

// GET /:id - get post by id
adminBlog.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const post = await c.env.DB.prepare(
      'SELECT * FROM blog_posts WHERE id = ?'
    ).bind(id).first<BlogPost>();

    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    return c.json({ post });
  } catch (e) {
    return c.json({ error: 'Failed to fetch post' }, 500);
  }
});

// POST / - create post
adminBlog.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      title: string;
      excerpt?: string;
      content: string;
      cover_image_url?: string;
      cover_image_key?: string;
      category?: string;
      redirect_url?: string;
    }>();

    if (!body.title || !body.content) {
      return c.json({ error: 'Title and content are required' }, 400);
    }

    const slug = slugify(body.title);

    const result = await c.env.DB.prepare(
      `INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_key, category, redirect_url, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(
      body.title,
      slug,
      body.excerpt || null,
      body.content,
      body.cover_image_url || null,
      body.cover_image_key || null,
      body.category || null,
      body.redirect_url || null
    ).run();

    return c.json({
      success: true,
      post: {
        id: result.meta.last_row_id,
        title: body.title,
        slug,
      },
    }, 201);
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return c.json({ error: 'A post with this title already exists' }, 400);
    }
    return c.json({ error: 'Failed to create post' }, 500);
  }
});

// PUT /:id - update post
adminBlog.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{
      title?: string;
      excerpt?: string;
      content?: string;
      cover_image_url?: string | null;
      cover_image_key?: string | null;
      category?: string | null;
      redirect_url?: string | null;
    }>();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM blog_posts WHERE id = ?'
    ).bind(id).first<BlogPost>();

    if (!existing) {
      return c.json({ error: 'Post not found' }, 404);
    }

    const title = body.title ?? existing.title;
    const slug = body.title ? slugify(body.title) : existing.slug;
    const excerpt = body.excerpt !== undefined ? body.excerpt : existing.excerpt;
    const content = body.content ?? existing.content;
    const coverImageUrl = body.cover_image_url !== undefined ? body.cover_image_url : existing.cover_image_url;
    const coverImageKey = body.cover_image_key !== undefined ? body.cover_image_key : existing.cover_image_key;
    const category = body.category !== undefined ? body.category : existing.category;
    const redirectUrl = body.redirect_url !== undefined ? body.redirect_url : existing.redirect_url;

    await c.env.DB.prepare(
      `UPDATE blog_posts SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image_url = ?,
       cover_image_key = ?, category = ?, redirect_url = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      title, slug, excerpt, content, coverImageUrl,
      coverImageKey, category, redirectUrl, id
    ).run();

    return c.json({ success: true, post: { id, title, slug } });
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return c.json({ error: 'A post with this title already exists' }, 400);
    }
    return c.json({ error: 'Failed to update post' }, 500);
  }
});

// DELETE /:id - delete post
adminBlog.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const existing = await c.env.DB.prepare(
      'SELECT * FROM blog_posts WHERE id = ?'
    ).bind(id).first<BlogPost>();

    if (!existing) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // Delete R2 cover image if exists
    if (existing.cover_image_key) {
      try {
        await deleteFromR2(c.env.MEDIA_BUCKET, existing.cover_image_key);
      } catch {
        // Continue even if R2 delete fails
      }
    }

    await c.env.DB.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to delete post' }, 500);
  }
});

// PUT /:id/publish - toggle publish status
adminBlog.put('/:id/publish', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const existing = await c.env.DB.prepare(
      'SELECT * FROM blog_posts WHERE id = ?'
    ).bind(id).first<BlogPost>();

    if (!existing) {
      return c.json({ error: 'Post not found' }, 404);
    }

    const newStatus = existing.is_published ? 0 : 1;
    let publishedAt = existing.published_at;

    // When publishing, set published_at if not already set
    if (newStatus === 1 && !publishedAt) {
      publishedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    await c.env.DB.prepare(
      `UPDATE blog_posts SET is_published = ?, published_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newStatus, publishedAt, id).run();

    return c.json({
      success: true,
      post: {
        id,
        is_published: newStatus,
        published_at: publishedAt,
      },
    });
  } catch (e) {
    return c.json({ error: 'Failed to update publish status' }, 500);
  }
});

export default adminBlog;
