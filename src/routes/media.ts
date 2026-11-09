import { Hono } from 'hono';
import type { Env } from '../types';

const mediaRoutes = new Hono<{ Bindings: Env }>();

// GET /* - serve R2 objects as a media proxy (supports Range requests for video)
mediaRoutes.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/media\//, '');

  if (!key) {
    return c.notFound();
  }

  const ifNoneMatch = c.req.header('If-None-Match');
  const rangeHeader = c.req.header('Range');

  const object = rangeHeader
    ? await c.env.MEDIA_BUCKET.get(key, { range: c.req.raw.headers })
    : await c.env.MEDIA_BUCKET.get(key);

  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');

  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  const range = (object as R2ObjectBody).range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (rangeHeader && range) {
    const size = object.size;
    let start: number;
    let length: number;
    if (range.suffix !== undefined) {
      length = Math.min(range.suffix, size);
      start = size - length;
    } else {
      start = range.offset ?? 0;
      length = range.length ?? size - start;
    }
    headers.set('Content-Range', `bytes ${start}-${start + length - 1}/${size}`);
    headers.set('Content-Length', String(length));
    return new Response((object as R2ObjectBody).body, { status: 206, headers });
  }

  headers.set('Content-Length', String(object.size));
  return new Response((object as R2ObjectBody).body, { headers });
});

export default mediaRoutes;
