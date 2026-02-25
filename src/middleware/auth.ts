import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJwt } from '../lib/jwt';
import type { Env } from '../types';

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { adminId: number; username: string } }>, next: Next) {
  const token = getCookie(c, 'mnet_session');

  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  c.set('adminId', payload.sub);
  c.set('username', payload.username);

  await next();
}
