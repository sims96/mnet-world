# Mnet's World

A cake, food & lifestyle website for **Mnet's World** — a content creator sharing food, lifestyle, wellness, and humanitarian work.

**Live:** https://mnet-world.simondomfabrice.workers.dev

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (mobile-first)
- **Backend:** [Hono](https://hono.dev) on Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Images:** Cloudflare R2
- **Auth:** JWT in HttpOnly cookies

## Local Development

```bash
npm install
npm run dev        # starts at http://localhost:8787
```

## Database

```bash
npm run db:migrate:local    # apply migrations locally
npm run db:migrate:remote   # apply migrations to production
```

## Deploy

```bash
npx wrangler secret put JWT_SECRET
npm run db:migrate:remote
npm run deploy
```

## Admin Panel

Go to `/admin/` to manage content:
- **Cakes** — add/edit products with images, prices, categories
- **Blog** — write posts with a rich text editor
- **Humanitarian** — showcase community/charity work
- **Messages** — view contact form submissions

First visit triggers account setup.

## Project Structure

```
src/           → Backend API (Hono routes, auth, D1/R2 helpers)
public/        → Frontend (HTML pages, CSS, JS)
public/admin/  → Admin panel
migrations/    → D1 database schema
```
