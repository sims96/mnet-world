import { Hono } from 'hono';
import type { Env, SiteSetting } from '../types';

type PublicEnv = { Bindings: Env };

const publicRoutes = new Hono<PublicEnv>();

// GET /cakes - list available cakes
publicRoutes.get('/cakes', async (c) => {
  try {
    const categorySlug = c.req.query('category');
    const featured = c.req.query('featured');
    const limit = c.req.query('limit');

    let query = `SELECT c.*, cat.name as category_name, cat.slug as category_slug
                 FROM cakes c
                 LEFT JOIN categories cat ON c.category_id = cat.id
                 WHERE c.is_available = 1`;
    const bindings: any[] = [];

    if (categorySlug) {
      query += ' AND cat.slug = ?';
      bindings.push(categorySlug);
    }

    if (featured === '1') {
      query += ' AND c.is_featured = 1';
    }

    query += ' ORDER BY c.display_order ASC, c.created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      bindings.push(parseInt(limit));
    }

    const stmt = bindings.length > 0
      ? c.env.DB.prepare(query).bind(...bindings)
      : c.env.DB.prepare(query);

    const { results } = await stmt.all();
    return c.json({ cakes: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch cakes' }, 500);
  }
});

// GET /cakes/:slug - get single cake by slug
publicRoutes.get('/cakes/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const cake = await c.env.DB.prepare(
      `SELECT c.*, cat.name as category_name, cat.slug as category_slug
       FROM cakes c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.slug = ? AND c.is_available = 1`
    ).bind(slug).first();

    if (!cake) {
      return c.json({ error: 'Cake not found' }, 404);
    }

    const { results: images } = await c.env.DB.prepare(
      'SELECT id, image_url, display_order FROM cake_images WHERE cake_id = ? ORDER BY display_order ASC'
    ).bind((cake as any).id).all();

    return c.json({ cake, images });
  } catch (e) {
    return c.json({ error: 'Failed to fetch cake' }, 500);
  }
});

// GET /categories - list all categories
publicRoutes.get('/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
    ).all();
    return c.json({ categories: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// GET /blog - list published posts
publicRoutes.get('/blog', async (c) => {
  try {
    const category = c.req.query('category');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '12');
    const offset = (page - 1) * limit;

    let query = `SELECT id, title, slug, excerpt, cover_image_url, category, redirect_url, published_at, created_at
                 FROM blog_posts
                 WHERE is_published = 1`;
    let countQuery = 'SELECT COUNT(*) as total FROM blog_posts WHERE is_published = 1';
    const bindings: any[] = [];
    const countBindings: any[] = [];

    if (category) {
      query += ' AND category = ?';
      countQuery += ' AND category = ?';
      bindings.push(category);
      countBindings.push(category);
    }

    query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const stmt = c.env.DB.prepare(query).bind(...bindings);
    const countStmt = countBindings.length > 0
      ? c.env.DB.prepare(countQuery).bind(...countBindings)
      : c.env.DB.prepare(countQuery);

    const [postsResult, countResult] = await Promise.all([
      stmt.all(),
      countStmt.first<{ total: number }>(),
    ]);

    const total = countResult?.total || 0;

    return c.json({
      posts: postsResult.results,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

// GET /blog/:slug - get single published post
publicRoutes.get('/blog/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const post = await c.env.DB.prepare(
      'SELECT * FROM blog_posts WHERE slug = ? AND is_published = 1'
    ).bind(slug).first();

    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    return c.json({ post });
  } catch (e) {
    return c.json({ error: 'Failed to fetch post' }, 500);
  }
});

// GET /humanitarian - list published entries
publicRoutes.get('/humanitarian', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM humanitarian_entries WHERE is_published = 1 ORDER BY activity_date DESC, created_at DESC'
    ).all();
    return c.json({ entries: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch entries' }, 500);
  }
});

// GET /humanitarian/:slug - get single published entry
publicRoutes.get('/humanitarian/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const entry = await c.env.DB.prepare(
      'SELECT * FROM humanitarian_entries WHERE slug = ? AND is_published = 1'
    ).bind(slug).first();

    if (!entry) {
      return c.json({ error: 'Entry not found' }, 404);
    }

    return c.json({ entry });
  } catch (e) {
    return c.json({ error: 'Failed to fetch entry' }, 500);
  }
});

// GET /settings - get all site settings as key-value object
publicRoutes.get('/settings', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT key, value FROM site_settings'
    ).all<SiteSetting>();

    const settings: Record<string, string> = {};
    for (const row of results) {
      settings[row.key] = row.value;
    }

    return c.json({ settings });
  } catch (e) {
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

export default publicRoutes;
