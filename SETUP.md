# Website Factory — Complete Setup & Operations Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE                              │
│                                                                 │
│  ┌─────────────────────┐     ┌──────────────────────────────┐  │
│  │  Payload CMS         │     │  Site: acme.pages.dev        │  │
│  │  (CF Workers)        │     │  (CF Pages + Astro SSR)      │  │
│  │                      │     │                              │  │
│  │  One shared CMS      │────▶│  Each site = own repo +      │  │
│  │  manages all sites   │     │  own CF Pages project        │  │
│  └──────┬───────┬───────┘     └──────────┬───────────────────┘  │
│         │       │                        │                      │
│  ┌──────▼──┐ ┌──▼──┐           ┌────────▼─────────┐           │
│  │   D1    │ │ R2  │           │  KV (shared)      │           │
│  │ SQLite  │ │Media│           │  Site data cache   │           │
│  └─────────┘ └─────┘           └──────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### What lives where

| Component | Service | Purpose |
|-----------|---------|---------|
| **Payload CMS** | Cloudflare Workers | Admin panel, API, content management |
| **Database** | Cloudflare D1 (SQLite) | All CMS data (sites, pages, settings, users) |
| **Media uploads** | Cloudflare R2 | Images, files, documents |
| **Each frontend site** | Cloudflare Pages | SSR Astro site, auto-deployed from GitHub |
| **Site data cache** | Cloudflare KV (shared) | Cached site bundles for resilience |

### Each site gets its own:
- **GitHub repo** (private, cloned from template)
- **CF Pages project** (connected to repo, auto-deploys)
- **Subdomain** (e.g., `my-site.pages.dev`)
- **Custom domains** (optional, configured from CMS)

---

## How Auto-Provisioning Works

When you create a new Site in the CMS admin:

```
1. You type a site name → click Save
2. Hook generates slug (name → kebab-case)
3. Creates PRIVATE GitHub repo from template
4. Creates CF Pages project connected to that repo
5. Sets env vars (CMS URL, webhook secret) on Pages
6. Binds KV namespace for caching
7. Updates wrangler.toml in repo with site config
8. Triggers initial CF Pages deployment
9. Creates default SiteSettings (theme, nav)
10. Creates default Home page
11. Returns all data to admin UI immediately (no refresh needed)
```

The entire process takes ~15 seconds. After that:
- The site is live at `https://{slug}.pages.dev`
- The GitHub repo is at `https://github.com/{owner}/{slug}`
- CF Pages auto-deploys on every push to `main`

---

## Setting Up From Scratch

### Prerequisites

- Node.js 20+
- [wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [gh CLI](https://cli.github.com/) (GitHub CLI)
- A Cloudflare account (free or paid)
- A GitHub account

### Step 1: Clone the CMS

```bash
git clone https://github.com/mohamedmostafa58/website-factory-cms.git
cd website-factory-cms
npm install
```

### Step 2: Create Cloudflare Resources

```bash
# Login to wrangler
wrangler login

# Set your account ID
export CLOUDFLARE_ACCOUNT_ID=your_account_id

# Create D1 database
wrangler d1 create website-factory-db

# Create R2 bucket
wrangler r2 bucket create website-factory-media

# Create KV namespace (shared across all frontend sites)
wrangler kv namespace create SITE_CACHE
```

### Step 3: Update wrangler.jsonc

Edit `wrangler.jsonc` with your IDs:

```jsonc
{
  "account_id": "YOUR_ACCOUNT_ID",
  "d1_databases": [{ "database_id": "YOUR_D1_ID", ... }],
  "r2_buckets": [{ "bucket_name": "website-factory-media" }]
}
```

### Step 4: Run Migrations & Deploy

```bash
# Create .env for local dev
echo 'PAYLOAD_SECRET=your-random-secret' > .env

# Generate import map
npx cross-env NODE_OPTIONS=--no-deprecation payload generate:importmap

# Run database migrations
NODE_ENV=production PAYLOAD_SECRET=ignore npx cross-env NODE_OPTIONS=--no-deprecation payload migrate

# Build and deploy
npx opennextjs-cloudflare build
wrangler deploy
```

### Step 5: Create First Admin User

```bash
curl -s 'https://YOUR-CMS-URL/api/users/first-register' \
  -X POST -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"YourPassword123!"}'
```

Then set the user as superadmin:
```bash
wrangler d1 execute website-factory-db --remote \
  --command "UPDATE users SET role='superadmin' WHERE id=1;"
```

### Step 6: Set Worker Secrets

```bash
# GitHub PAT (with repo scope) for auto-creating repos
wrangler secret put GITHUB_TOKEN --name website-factory-cms

# Cloudflare API Token for creating Pages projects
wrangler secret put CF_API_TOKEN --name website-factory-cms

# Cloudflare Account ID
wrangler secret put CF_ACCOUNT_ID --name website-factory-cms
```

### Step 7: Set Up the Frontend Template

```bash
# Fork or create the template repo
gh repo create website-factory-frontend --template mohamedmostafa58/website-factory-frontend --public

# Mark it as a template
gh repo edit YOUR_USERNAME/website-factory-frontend --template
```

### Step 8: Connect Cloudflare to GitHub

1. Go to Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. Authorize the Cloudflare GitHub App on your GitHub account
3. This allows CF Pages to auto-deploy from your repos

---

## Connecting a Different GitHub Account

Update these environment variables in `wrangler.jsonc` or via `wrangler secret`:

| Variable | Where | Value |
|----------|-------|-------|
| `GITHUB_TOKEN` | Worker secret | PAT from the new GitHub account (needs `repo` scope) |
| `GITHUB_TEMPLATE_OWNER` | wrangler.jsonc vars | New GitHub username |
| `GITHUB_TEMPLATE_REPO` | wrangler.jsonc vars | Template repo name |
| `GITHUB_OWNER` | wrangler.jsonc vars | Where new repos are created |

Then connect the new GitHub account to Cloudflare Pages (Step 8 above).

---

## Environment Variables Reference

### Worker Secrets (set via `wrangler secret put`)

| Name | Required | Purpose |
|------|----------|---------|
| `GITHUB_TOKEN` | Yes | GitHub PAT for creating repos |
| `CF_API_TOKEN` | Yes | Cloudflare API token for creating Pages projects |
| `CF_ACCOUNT_ID` | Yes | Cloudflare account ID |

### Worker Vars (set in `wrangler.jsonc`)

| Name | Purpose |
|------|---------|
| `PAYLOAD_SECRET` | JWT secret for auth |
| `PAYLOAD_PUBLIC_SERVER_URL` | CMS public URL |
| `ADMIN_URL` | CMS admin URL |
| `FRONTEND_WEBHOOK_URL` | (legacy) shared frontend URL |
| `WEBHOOK_SECRET` | Secret for webhook auth |
| `GITHUB_TEMPLATE_OWNER` | GitHub user owning the template |
| `GITHUB_TEMPLATE_REPO` | Template repo name |
| `GITHUB_OWNER` | Where new repos are created |
| `KV_NAMESPACE_ID` | KV namespace ID for site caching |

### GitHub Repo Secrets (for CI/CD)

| Name | Purpose |
|------|---------|
| `CF_API_TOKEN` | Cloudflare API token |
| `CF_ACCOUNT_ID` | Cloudflare account ID |

---

## Creating a New Website

1. Go to CMS Admin → **Sites** → **Create New**
2. Enter a **Name** (e.g., "My Agency")
3. The **slug** auto-generates (e.g., `my-agency`)
4. Click **Save**
5. Watch the provisioning log fill up
6. After ~15s, you'll see:
   - **Pages URL**: `https://my-agency.pages.dev` (live site)
   - **Repo URL**: GitHub repo link
   - **Status**: Complete

### Adding a Custom Domain

1. Edit the site → **Custom Domains** → Add entry
2. Type your domain (e.g., `www.myagency.com`)
3. Save — the domain is auto-registered on CF Pages
4. Set DNS: `CNAME www.myagency.com → my-agency.pages.dev`
5. SSL is automatic (Cloudflare handles it)

---

## Customizing a Site

### Theme (Site Settings)

Go to **Site Settings** → select your site:

| Setting | What it controls |
|---------|-----------------|
| Primary Color | Buttons, links, accents |
| Secondary Color | Secondary buttons, highlights |
| Accent Color | Special highlights |
| Background Color | Page background |
| Text Color | Body text |
| Font Family | Body text font (Google Fonts) |
| Heading Font | Heading font (can differ from body) |
| Border Radius | Button/card roundness |
| Layout Theme | Modern, Classic, Bold, or Minimal |

### Navigation

- **Header Links**: Main nav menu (supports dropdowns)
- **Footer Links**: Footer columns with grouped links

### Pages

Go to **Pages** → Create or edit:

- **Hero Block**: Banner with heading, CTA buttons, background image
- **Content Block**: Rich text with layouts (full, two-col, narrow, sidebar)
- **Image Gallery**: Grid, masonry, or carousel
- **Contact Form**: Fully configurable fields with placeholder, validation, width

### Live Preview

When editing a Page, click the **Live Preview** tab to see a real-time preview of the frontend site at different breakpoints (Mobile, Tablet, Desktop).

---

## How the Frontend Works

Each frontend site is an **Astro SSR** application on Cloudflare Pages:

1. **Request comes in** → `[...slug].astro` reads `hostname`
2. **Fetches site bundle** from CMS API (settings + pages)
3. **Caches in KV** → next request serves from cache (fast)
4. **Renders** with dynamic CSS variables from CMS theme
5. **If CMS is down** → serves last cached version from KV

### Cache Invalidation

When you edit content in the CMS:
1. `afterChange` hook fires
2. Looks up the site's `pagesUrl`
3. Sends webhook to `{pagesUrl}/api/webhook/invalidate`
4. Frontend clears KV cache → next request fetches fresh data

---

## Troubleshooting

### White page on CMS admin
- Run `payload generate:importmap` and rebuild
- Check that `@payloadcms/next/css` is imported in the layout

### Site shows "Site Not Found"
- The CMS API `/api/site-bundle/{domain}` must return data
- Check the `domain` field matches the Pages URL hostname
- The KV cache may need warming — edit any content to trigger webhook

### CF Pages deploy fails
- Check the CF Pages build logs in the Cloudflare dashboard
- Ensure the template repo has the correct `package.json` with `"build": "astro build"`
- Ensure env vars are set on the Pages project

### GitHub repo not created
- Check `GITHUB_TOKEN` worker secret is set and has `repo` scope
- Template repo must be marked as a template

### Custom domain not working
- Verify DNS CNAME points to `{slug}.pages.dev`
- Check CF Pages → Custom Domains for status
- SSL may take a few minutes to provision

### CMS is slow on first load
- Cold start is normal (~3-5s) for Cloudflare Workers with large bundles
- Subsequent requests are fast
- The Workers paid plan has lower cold starts

---

## Project Structure

```
payload-cms/                        # CMS Backend
├── src/
│   ├── payload.config.ts           # Main config (D1, R2, live preview)
│   ├── collections/
│   │   ├── Sites.ts                # Site registry + auto-provisioning
│   │   ├── SiteSettings.ts         # Per-site theme, nav, SEO
│   │   ├── Pages.ts                # Page builder with blocks
│   │   ├── Users.ts                # Multi-tenant users
│   │   ├── Media.ts                # Media uploads (R2)
│   │   └── FormSubmissions.ts      # Contact form data
│   ├── blocks/
│   │   ├── Hero.ts                 # Hero banner block
│   │   ├── Content.ts              # Rich text content block
│   │   ├── ImageGallery.ts         # Image gallery block
│   │   └── ContactForm.ts          # Contact form block
│   ├── hooks/
│   │   ├── createSiteRepo.ts       # Auto-provision hook
│   │   └── invalidateCache.ts      # Per-site cache invalidation
│   └── access/
│       └── tenantAccess.ts         # Multi-tenant access control
├── wrangler.jsonc                  # Cloudflare Workers config
├── open-next.config.ts             # OpenNext bundler config
└── .github/workflows/
    ├── deploy.yml                  # Auto-deploy CMS on push
    └── create-site.yml             # GitHub Actions site creation

website-factory-frontend/           # Frontend Template
├── src/
│   ├── pages/[...slug].astro       # Dynamic catch-all route
│   ├── layouts/BaseLayout.astro    # Theme CSS vars + Google Fonts
│   ├── components/
│   │   ├── Header.astro            # Dynamic nav from CMS
│   │   ├── Footer.astro            # Dynamic footer from CMS
│   │   └── blocks/                 # Block renderers
│   └── lib/
│       ├── resilient-fetch.ts      # KV-backed fetch with fallback
│       └── theme.ts                # CMS values → CSS variables
└── wrangler.toml                   # CF Pages config (auto-updated per site)
```
