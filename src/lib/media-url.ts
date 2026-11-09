const R2_PUBLIC_DOMAIN = 'media.mnetsworld.com';

export function normalizeMediaUrl(url: string | null, key: string | null): string | null {
  if (!url) return null;

  if (url.startsWith('/media/')) return url;

  if (key) return `/media/${key}`;

  if (url.includes(R2_PUBLIC_DOMAIN)) {
    try {
      const parsed = new URL(url);
      const extractedKey = parsed.pathname.replace(/^\//, '');
      if (extractedKey) return `/media/${extractedKey}`;
    } catch {
      // URL parsing failed
    }
  }

  return url;
}
