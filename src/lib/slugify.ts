export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove special characters
    .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');  // Trim hyphens from start and end
}
