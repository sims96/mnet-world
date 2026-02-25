import { Hono } from 'hono';
import { slugify } from '../lib/slugify';
import { deleteFromR2 } from '../lib/r2';
import type { Env, Cake, CakeImage, Category } from '../types';

type AdminEnv = { Bindings: Env; Variables: { adminId: number; username: string } };

const adminCakes = new Hono<AdminEnv>();

// ── Categories ──────────────────────────────────────────────────────────

// GET /categories/list
adminCakes.get('/categories/list', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
    ).all<Category>();
    return c.json({ categories: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// POST /categories
adminCakes.post('/categories', async (c) => {
  try {
    const body = await c.req.json<{ name: string; description?: string; display_order?: number }>();

    if (!body.name) {
      return c.json({ error: 'Category name is required' }, 400);
    }

    const slug = slugify(body.name);

    const result = await c.env.DB.prepare(
      'INSERT INTO categories (name, slug, description, display_order) VALUES (?, ?, ?, ?)'
    ).bind(body.name, slug, body.description || null, body.display_order ?? 0).run();

    return c.json({
      success: true,
      category: {
        id: result.meta.last_row_id,
        name: body.name,
        slug,
        description: body.description || null,
        display_order: body.display_order ?? 0,
      },
    }, 201);
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return c.json({ error: 'A category with this name already exists' }, 400);
    }
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

// PUT /categories/:id
adminCakes.put('/categories/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{ name?: string; description?: string; display_order?: number }>();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first<Category>();

    if (!existing) {
      return c.json({ error: 'Category not found' }, 404);
    }

    const name = body.name ?? existing.name;
    const slug = body.name ? slugify(body.name) : existing.slug;
    const description = body.description !== undefined ? body.description : existing.description;
    const displayOrder = body.display_order ?? existing.display_order;

    await c.env.DB.prepare(
      'UPDATE categories SET name = ?, slug = ?, description = ?, display_order = ? WHERE id = ?'
    ).bind(name, slug, description, displayOrder, id).run();

    return c.json({
      success: true,
      category: { id, name, slug, description, display_order: displayOrder },
    });
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return c.json({ error: 'A category with this name already exists' }, 400);
    }
    return c.json({ error: 'Failed to update category' }, 500);
  }
});

// DELETE /categories/:id
adminCakes.delete('/categories/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const existing = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first<Category>();

    if (!existing) {
      return c.json({ error: 'Category not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

// ── Cakes ───────────────────────────────────────────────────────────────

// GET / - list all cakes
adminCakes.get('/', async (c) => {
  try {
    const categoryId = c.req.query('category_id');

    let query = 'SELECT c.*, cat.name as category_name FROM cakes c LEFT JOIN categories cat ON c.category_id = cat.id';
    const bindings: any[] = [];

    if (categoryId) {
      query += ' WHERE c.category_id = ?';
      bindings.push(parseInt(categoryId));
    }

    query += ' ORDER BY c.display_order ASC, c.created_at DESC';

    const stmt = bindings.length > 0
      ? c.env.DB.prepare(query).bind(...bindings)
      : c.env.DB.prepare(query);

    const { results } = await stmt.all();
    return c.json({ cakes: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch cakes' }, 500);
  }
});

// GET /:id - get cake by id
adminCakes.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const cake = await c.env.DB.prepare(
      'SELECT c.*, cat.name as category_name FROM cakes c LEFT JOIN categories cat ON c.category_id = cat.id WHERE c.id = ?'
    ).bind(id).first();

    if (!cake) {
      return c.json({ error: 'Cake not found' }, 404);
    }

    const { results: images } = await c.env.DB.prepare(
      'SELECT * FROM cake_images WHERE cake_id = ? ORDER BY display_order ASC'
    ).bind(id).all<CakeImage>();

    return c.json({ cake, images });
  } catch (e) {
    return c.json({ error: 'Failed to fetch cake' }, 500);
  }
});

// POST / - create cake
adminCakes.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      description?: string;
      price_cents: number;
      currency?: string;
      category_id?: number;
      image_url?: string;
      image_key?: string;
      is_featured?: number;
      is_available?: number;
    }>();

    if (!body.name || body.price_cents === undefined) {
      return c.json({ error: 'Name and price are required' }, 400);
    }

    const slug = slugify(body.name);

    const result = await c.env.DB.prepare(
      `INSERT INTO cakes (name, slug, description, price_cents, currency, category_id, image_url, image_key, is_featured, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.name,
      slug,
      body.description || null,
      body.price_cents,
      body.currency || 'USD',
      body.category_id || null,
      body.image_url || null,
      body.image_key || null,
      body.is_featured ?? 0,
      body.is_available ?? 1
    ).run();

    return c.json({
      success: true,
      cake: {
        id: result.meta.last_row_id,
        name: body.name,
        slug,
      },
    }, 201);
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return c.json({ error: 'A cake with this name already exists' }, 400);
    }
    return c.json({ error: 'Failed to create cake' }, 500);
  }
});

// PUT /:id - update cake
adminCakes.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{
      name?: string;
      description?: string;
      price_cents?: number;
      currency?: string;
      category_id?: number | null;
      image_url?: string | null;
      image_key?: string | null;
      is_featured?: number;
      is_available?: number;
      display_order?: number;
    }>();

    const existing = await c.env.DB.prepare(
      'SELECT * FROM cakes WHERE id = ?'
    ).bind(id).first<Cake>();

    if (!existing) {
      return c.json({ error: 'Cake not found' }, 404);
    }

    const name = body.name ?? existing.name;
    const slug = body.name ? slugify(body.name) : existing.slug;
    const description = body.description !== undefined ? body.description : existing.description;
    const priceCents = body.price_cents ?? existing.price_cents;
    const currency = body.currency ?? existing.currency;
    const categoryId = body.category_id !== undefined ? body.category_id : existing.category_id;
    const imageUrl = body.image_url !== undefined ? body.image_url : existing.image_url;
    const imageKey = body.image_key !== undefined ? body.image_key : existing.image_key;
    const isFeatured = body.is_featured ?? existing.is_featured;
    const isAvailable = body.is_available ?? existing.is_available;
    const displayOrder = body.display_order ?? existing.display_order;

    await c.env.DB.prepare(
      `UPDATE cakes SET name = ?, slug = ?, description = ?, price_cents = ?, currency = ?,
       category_id = ?, image_url = ?, image_key = ?, is_featured = ?, is_available = ?,
       display_order = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      name, slug, description, priceCents, currency,
      categoryId, imageUrl, imageKey, isFeatured, isAvailable,
      displayOrder, id
    ).run();

    return c.json({ success: true, cake: { id, name, slug } });
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return c.json({ error: 'A cake with this name already exists' }, 400);
    }
    return c.json({ error: 'Failed to update cake' }, 500);
  }
});

// DELETE /:id - delete cake
adminCakes.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const existing = await c.env.DB.prepare(
      'SELECT * FROM cakes WHERE id = ?'
    ).bind(id).first<Cake>();

    if (!existing) {
      return c.json({ error: 'Cake not found' }, 404);
    }

    // Delete R2 image if exists
    if (existing.image_key) {
      try {
        await deleteFromR2(c.env.MEDIA_BUCKET, existing.image_key);
      } catch {
        // Continue even if R2 delete fails
      }
    }

    // Delete gallery images from R2
    const { results: galleryImages } = await c.env.DB.prepare(
      'SELECT image_key FROM cake_images WHERE cake_id = ?'
    ).bind(id).all<{ image_key: string | null }>();

    for (const img of galleryImages) {
      if (img.image_key) {
        try {
          await deleteFromR2(c.env.MEDIA_BUCKET, img.image_key);
        } catch {
          // Continue even if R2 delete fails
        }
      }
    }

    await c.env.DB.prepare('DELETE FROM cake_images WHERE cake_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM cakes WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to delete cake' }, 500);
  }
});

// ── Gallery Images ─────────────────────────────────────────────────────

// POST /:id/images - add gallery image
adminCakes.post('/:id/images', async (c) => {
  try {
    const cakeId = parseInt(c.req.param('id'));
    const body = await c.req.json<{
      image_url: string;
      image_key?: string;
      display_order?: number;
    }>();

    if (!body.image_url) {
      return c.json({ error: 'Image URL is required' }, 400);
    }

    // Verify cake exists
    const cake = await c.env.DB.prepare('SELECT id FROM cakes WHERE id = ?').bind(cakeId).first();
    if (!cake) {
      return c.json({ error: 'Cake not found' }, 404);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO cake_images (cake_id, image_url, image_key, display_order) VALUES (?, ?, ?, ?)'
    ).bind(
      cakeId,
      body.image_url,
      body.image_key || null,
      body.display_order ?? 0
    ).run();

    return c.json({
      success: true,
      image: {
        id: result.meta.last_row_id,
        cake_id: cakeId,
        image_url: body.image_url,
        image_key: body.image_key || null,
        display_order: body.display_order ?? 0,
      },
    }, 201);
  } catch (e) {
    return c.json({ error: 'Failed to add image' }, 500);
  }
});

// DELETE /:id/images/:imageId - remove gallery image
adminCakes.delete('/:id/images/:imageId', async (c) => {
  try {
    const cakeId = parseInt(c.req.param('id'));
    const imageId = parseInt(c.req.param('imageId'));

    const image = await c.env.DB.prepare(
      'SELECT * FROM cake_images WHERE id = ? AND cake_id = ?'
    ).bind(imageId, cakeId).first<CakeImage>();

    if (!image) {
      return c.json({ error: 'Image not found' }, 404);
    }

    // Delete from R2 if has key
    if (image.image_key) {
      try {
        await deleteFromR2(c.env.MEDIA_BUCKET, image.image_key);
      } catch {
        // Continue even if R2 delete fails
      }
    }

    await c.env.DB.prepare('DELETE FROM cake_images WHERE id = ?').bind(imageId).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

export default adminCakes;
