# Forklore Feasts

A small community potluck site: gatherings and their themes, the dishes guests bring, and a shared recipe box. Styled as a vintage neighborhood cookbook / hand-printed potluck poster.

**Stack:** React 19 + Next.js (App Router) · Tailwind v4 + shadcn (Base UI) · Phosphor Icons · Supabase (Postgres, Auth, Storage)

## Run it

```bash
pnpm install
cp .env.example .env.local   # publishable key only
pnpm dev
```

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required. The `VITE_SUPABASE_*` names from the brief are accepted too (see `next.config.mjs`).

## How data flows

```
Browser ──fetch──▶ Next.js /api/* route handlers ──▶ Supabase (PostgREST + Storage)
   │                     ▲ forwards the guest's bearer token, so RLS sees auth.uid()
   └─ supabase-js: guest session only (signInAnonymously on startup)
```

| Route | |
|---|---|
| `GET /api/events`, `GET /api/events/[slug]` | events → dishes → recipes |
| `GET /api/recipes?search&category&tag&contributor&event&limit` | search uses `search_vector` |
| `GET /api/recipes/facets`, `GET /api/recipes/[slug]` | |
| `POST /api/recipes`, `PATCH/DELETE /api/recipes/[id]` | auth required, owner via RLS |
| `GET/POST /api/dishes`, `PATCH/DELETE /api/dishes/[id]` | |
| `POST /api/events`, `PATCH/DELETE /api/events/[id]` | hosts only (see below), own events via RLS |
| `GET/POST /api/host/me` | host status (`none`/`pending`/`approved`); POST requests access |
| `POST /api/uploads` | image → `forklore-media/<user-id>/<file>`; returns the object path |

`owner_user_id` and slugs are never sent; the database fills them. Only the publishable key is used.

## Captcha (optional)

To protect guest sign-in from bots, create a Cloudflare Turnstile widget, put its secret key in Supabase (Auth → Attack Protection → Enable Captcha, provider Turnstile) and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the site key. It stays invisible unless Cloudflare wants a challenge. If Supabase captcha is on but the site key is missing, anonymous sign-in will fail.

## Supabase setup needed

- **Authentication → Sign In / Providers → Anonymous sign-ins must be enabled.** Until it is, the site is browsable but saving shows a friendly notice.
- `supabase/seed.sql` adds a few example events (admin-run, bypasses RLS).
- **Hosts:** run `supabase/hosts.sql` once. Anyone can go to `/host`, sign in with an emailed link (Auth → Email must be enabled; add your site URL + `/host` to Auth → URL Configuration redirect URLs) and request host access. Requests land as `pending`; approve with `update public.hosts set status = 'approved' where email = '...';` (list pending ones with `select * from public.hosts where status = 'pending'`). Approved hosts can create, edit and delete their own gatherings, including a cover photo. Guests stay anonymous and can't touch events.

- **Winners:** run `supabase/winners.sql` once (after `hosts.sql`). Hosts then see a “Crown a winner” button on each dish at their own gatherings; crowned dishes get a crown on their recipe cards, sort first on the event page, and can be filtered with the “Winners” chip on `/recipes`.

Layout: `src/app` (routes + API), `src/server` (Supabase helpers), `src/views` (page UIs), `src/components/cookbook` (poster, cards, ornaments), `src/components/ui` (shadcn).
