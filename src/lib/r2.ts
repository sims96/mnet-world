function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return map[contentType] || 'bin';
}

function generateRandomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadToR2(
  bucket: R2Bucket,
  file: ArrayBuffer | Uint8Array,
  contentType: string,
  publicUrl: string,
  type: string = 'general'
): Promise<{ url: string; key: string }> {
  const ext = getExtension(contentType);
  const timestamp = Date.now();
  const randomId = generateRandomId();
  const key = `images/${type}/${timestamp}-${randomId}.${ext}`;

  await bucket.put(key, file, {
    httpMetadata: {
      contentType,
    },
  });

  const url = `${publicUrl.replace(/\/$/, '')}/${key}`;
  return { url, key };
}

export async function deleteFromR2(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}
