import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import publicRoutes from './routes/public';
import contactRoutes from './routes/contact';
import adminCakesRoutes from './routes/admin-cakes';
import adminBlogRoutes from './routes/admin-blog';
import adminHumanitarianRoutes from './routes/admin-humanitarian';
import adminMediaRoutes from './routes/admin-media';
import { publicChatRoutes, adminChatRoutes } from './routes/chat';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS for all API routes
app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// Public API routes
app.route('/api/public', publicRoutes);
app.route('/api/chat', publicChatRoutes);

// Contact form - POST is public
app.post('/api/contact', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      email: string;
      subject?: string;
      message: string;
    }>();

    if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
      return c.json({ error: 'Name, email, and message are required' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    await c.env.DB.prepare(
      'INSERT INTO contact_submissions (name, email, subject, message) VALUES (?, ?, ?, ?)'
    ).bind(body.name.trim(), body.email.trim(), body.subject?.trim() || null, body.message.trim()).run();

    return c.json({ success: true, message: 'Thank you for your message!' }, 201);
  } catch (e) {
    return c.json({ error: 'Failed to submit contact form' }, 500);
  }
});

// Auth routes (login, logout, me, setup)
app.route('/api/auth', authRoutes);

// Admin routes - protected by auth middleware
app.use('/api/admin/*', authMiddleware);
app.route('/api/admin/cakes', adminCakesRoutes);
app.route('/api/admin/blog', adminBlogRoutes);
app.route('/api/admin/humanitarian', adminHumanitarianRoutes);
app.route('/api/admin/media', adminMediaRoutes);
app.route('/api/admin/chat', adminChatRoutes);

// Admin contact management routes (GET, PUT, DELETE)
app.get('/api/admin/contact', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM contact_submissions ORDER BY created_at DESC'
  ).all();
  return c.json({ submissions: results });
});

app.put('/api/admin/contact/:id/read', async (c) => {
  const id = parseInt(c.req.param('id'));
  const existing = await c.env.DB.prepare(
    'SELECT * FROM contact_submissions WHERE id = ?'
  ).bind(id).first();
  if (!existing) {
    return c.json({ error: 'Submission not found' }, 404);
  }
  await c.env.DB.prepare(
    'UPDATE contact_submissions SET is_read = 1 WHERE id = ?'
  ).bind(id).run();
  return c.json({ success: true });
});

app.delete('/api/admin/contact/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const existing = await c.env.DB.prepare(
    'SELECT * FROM contact_submissions WHERE id = ?'
  ).bind(id).first();
  if (!existing) {
    return c.json({ error: 'Submission not found' }, 404);
  }
  await c.env.DB.prepare(
    'DELETE FROM contact_submissions WHERE id = ?'
  ).bind(id).run();
  return c.json({ success: true });
});

// Dynamic blog post page route - serve blog-post.html via ASSETS
app.get('/blog/:slug', async (c) => {
  try {
    const assetUrl = new URL('/blog-post.html', c.req.url);
    return c.env.ASSETS.fetch(new Request(assetUrl.toString()));
  } catch {
    const assetUrl = new URL('/', c.req.url);
    return c.env.ASSETS.fetch(new Request(assetUrl.toString()));
  }
});

// Dynamic product detail page route - serve product.html via ASSETS
app.get('/shop/:slug', async (c) => {
  try {
    const assetUrl = new URL('/product.html', c.req.url);
    return c.env.ASSETS.fetch(new Request(assetUrl.toString()));
  } catch {
    const assetUrl = new URL('/', c.req.url);
    return c.env.ASSETS.fetch(new Request(assetUrl.toString()));
  }
});

// Fallback: serve static assets
app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
