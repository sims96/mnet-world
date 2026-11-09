export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  R2_PUBLIC_URL: string;
  SITE_NAME: string;
}

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface Cake {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  currency: string;
  category_id: number | null;
  image_url: string | null;
  image_key: string | null;
  is_featured: number;
  is_available: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CakeImage {
  id: number;
  cake_id: number;
  image_url: string;
  image_key: string | null;
  media_type: 'image' | 'video';
  poster_url: string | null;
  poster_key: string | null;
  display_order: number;
  created_at: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_key: string | null;
  video_url: string | null;
  video_key: string | null;
  category: string | null;
  is_published: number;
  redirect_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HumanitarianEntry {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover_image_url: string | null;
  cover_image_key: string | null;
  video_url: string | null;
  video_key: string | null;
  location: string | null;
  activity_date: string | null;
  is_published: number;
  created_at: string;
  updated_at: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: number;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface ChatSession {
  id: number;
  visitor_name: string;
  session_token: string;
  status: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  sender_type: string;
  message: string;
  is_read: number;
  created_at: string;
}
