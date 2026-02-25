import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { signJwt, verifyJwt } from '../lib/jwt';
import { hashPassword, verifyPassword } from '../lib/password';
import type { Env, AdminUser } from '../types';

type AuthEnv = { Bindings: Env };

const auth = new Hono<AuthEnv>();

// POST /login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json<{ username: string; password: string }>();

    if (!body.username || !body.password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT * FROM admin_users WHERE username = ?'
    ).bind(body.username).first<AdminUser>();

    if (!user) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    const valid = await verifyPassword(body.password, user.password_hash, user.salt);

    if (!valid) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    const token = await signJwt(
      { sub: user.id, username: user.username },
      c.env.JWT_SECRET
    );

    setCookie(c, 'mnet_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: 86400, // 24 hours
    });

    return c.json({
      success: true,
      user: { id: user.id, username: user.username },
    });
  } catch (e) {
    return c.json({ error: 'Login failed' }, 500);
  }
});

// POST /logout
auth.post('/logout', async (c) => {
  deleteCookie(c, 'mnet_session', {
    path: '/',
  });
  return c.json({ success: true });
});

// GET /me
auth.get('/me', async (c) => {
  const token = getCookie(c, 'mnet_session');

  if (!token) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  const user = await c.env.DB.prepare(
    'SELECT id, username, created_at FROM admin_users WHERE id = ?'
  ).bind(payload.sub).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

// POST /setup - first-time admin creation
auth.post('/setup', async (c) => {
  try {
    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM admin_users'
    ).first<{ count: number }>();

    if (count && count.count > 0) {
      return c.json({ error: 'Admin user already exists. Setup is disabled.' }, 403);
    }

    const body = await c.req.json<{ username: string; password: string }>();

    if (!body.username || !body.password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    if (body.password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    const { hash, salt } = await hashPassword(body.password);

    const result = await c.env.DB.prepare(
      'INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)'
    ).bind(body.username, hash, salt).run();

    return c.json({
      success: true,
      message: 'Admin user created successfully',
      user: { id: result.meta.last_row_id, username: body.username },
    }, 201);
  } catch (e) {
    return c.json({ error: 'Setup failed' }, 500);
  }
});

export default auth;
