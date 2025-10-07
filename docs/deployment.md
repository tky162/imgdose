# Deployment Guide

## Overview

imgdose consists of two deployable components:

1. **Next.js Dashboard** → Cloudflare Pages (auto-deployed via GitHub)
2. **Workers API** → Cloudflare Workers (manual deployment via `wrangler`)

---

## 1. Cloudflare Workers Deployment

### Prerequisites

- Wrangler authenticated to your Cloudflare account (`npm run cf:whoami`)
- D1 database and R2 bucket already created
- Secrets configured (see below)

### Apply D1 Migrations

Before deploying the Worker, ensure the D1 schema is applied:

```bash
npm run cf:d1:migrate
```

This runs migrations from `db/migrations/` against the production D1 database.

### Configure Secrets

The Worker requires R2 access credentials. Set them once using:

```bash
npm run cf:wrangler -- secret put IMGDOSE_R2_ACCESS_KEY
# Paste the Access Key ID and press Enter

npm run cf:wrangler -- secret put IMGDOSE_R2_SECRET_KEY
# Paste the Secret Access Key and press Enter

npm run cf:wrangler -- secret put IMGDOSE_ACCOUNT_ID
# Paste your Cloudflare Account ID and press Enter
```

**Note**: Secrets are stored securely in Cloudflare and are not included in `wrangler.toml`.

### Deploy the Worker

```bash
npm run cf:deploy
```

This command:
- Bundles `workers/api/src/index.ts`
- Uploads to Cloudflare Workers
- Binds R2 bucket (`IMGDOSE_BUCKET`) and D1 database (`IMGDOSE_DB`)
- Applies environment variables from `wrangler.toml` (`IMGDOSE_CORS_ORIGIN`, `IMGDOSE_BUCKET_NAME`, `IMGDOSE_LOG_LEVEL`)

After deployment, the Worker will be accessible at:

```
https://imgdose-api.<your-subdomain>.workers.dev
```

Or your custom domain if configured.

### Update CORS Origin

For production, update `IMGDOSE_CORS_ORIGIN` in `wrangler.toml`:

```toml
[vars]
IMGDOSE_CORS_ORIGIN = "https://your-pages-domain.pages.dev"
```

Then redeploy:

```bash
npm run cf:deploy
```

---

## 2. Cloudflare Pages Deployment

### Setup via Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages**
2. Connect your GitHub repository (`imgdose`)
3. Configure build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Node version**: `20` (set via environment variable `NODE_VERSION=20`)

### Environment Variables

In the Pages dashboard, add the following environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_VERSION` | `20` | Required for Next.js 15+ |
| `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` | `https://imgdose-api.<subdomain>.workers.dev` | Worker API endpoint |
| `BASIC_AUTH_USERNAME` | `your-username` | Basic auth username |
| `BASIC_AUTH_PASSWORD` | `your-password` | Basic auth password |

**Important**: Set these variables for **both** Production and Preview environments.

### Deployment

Once configured, Pages will auto-deploy on every push to the `main` branch (or your configured branch).

- **Production URL**: `https://imgdose.pages.dev` (or custom domain)
- **Preview URLs**: Generated for each PR/branch

---

## 3. Post-Deployment Verification

### Test the Worker API

```bash
curl https://imgdose-api.<subdomain>.workers.dev/health
```

Expected response:

```json
{"ok":true,"timestamp":"2025-01-15T..."}
```

### Test the Dashboard

1. Navigate to your Pages URL
2. Enter Basic Auth credentials
3. Upload a test image
4. Verify table/gallery views display correctly
5. Test URL copy, download, delete, and ZIP archive functions

---

## 4. Monitoring & Logs

### Stream Worker Logs

```bash
npm run cf:tail
```

This tails live logs from the deployed Worker.

### Log Levels

Adjust `IMGDOSE_LOG_LEVEL` in `wrangler.toml`:

- `debug`: Verbose logging (all requests)
- `info`: Standard operational logs (default)
- `silent`: Minimal logging (errors only)

After changing, redeploy the Worker:

```bash
npm run cf:deploy
```

---

## 5. Rollback & Recovery

### Rollback Worker Deployment

Cloudflare Workers keeps previous versions. To rollback:

1. Go to **Workers & Pages** → **imgdose-api** → **Deployments**
2. Select a previous deployment
3. Click **Rollback to this deployment**

### Rollback Pages Deployment

1. Go to **Workers & Pages** → **imgdose** → **Deployments**
2. Select a stable deployment
3. Click **Rollback to this deployment**

---

## 6. Custom Domains (Optional)

### Worker Custom Domain

1. Go to **Workers & Pages** → **imgdose-api** → **Settings** → **Triggers**
2. Add a **Custom Domain** (e.g., `api.imgdose.example.com`)
3. Update `IMGDOSE_CORS_ORIGIN` in `wrangler.toml` to match your Pages domain
4. Redeploy the Worker

### Pages Custom Domain

1. Go to **Workers & Pages** → **imgdose** → **Custom domains**
2. Add your domain (e.g., `imgdose.example.com`)
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` in Pages environment variables to your Worker custom domain

---

## 7. Secrets Rotation

To rotate R2 access keys:

1. Generate new keys in Cloudflare Dashboard → **R2** → **Manage R2 API Tokens**
2. Update secrets:

   ```bash
   npm run cf:wrangler -- secret put IMGDOSE_R2_ACCESS_KEY
   npm run cf:wrangler -- secret put IMGDOSE_R2_SECRET_KEY
   ```

3. Redeploy the Worker:

   ```bash
   npm run cf:deploy
   ```

---

## Troubleshooting

### Worker returns 500 errors

- Check secrets are set: `npm run cf:wrangler -- secret list`
- Verify D1 migrations applied: `npm run cf:d1:migrate`
- Tail logs: `npm run cf:tail`

### CORS errors in browser

- Ensure `IMGDOSE_CORS_ORIGIN` matches your Pages domain exactly (including `https://`)
- Redeploy Worker after changing `wrangler.toml`

### Images not appearing after upload

- Verify R2 bucket name matches `IMGDOSE_BUCKET_NAME` in `wrangler.toml`
- Check Worker logs for R2 access errors
- Confirm Account ID secret is correct

### Basic Auth not working on Pages

- Verify `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are set in Pages environment variables
- Redeploy Pages (trigger via GitHub push or manual redeploy in dashboard)

---

## Summary

**Workers (Manual)**:
```bash
npm run cf:d1:migrate       # Apply schema
npm run cf:deploy           # Deploy Worker
npm run cf:tail             # Monitor logs
```

**Pages (Automatic)**:
- Push to `main` branch → auto-deploys

**First-time setup checklist**:
- [ ] D1 migrations applied
- [ ] Worker secrets configured (R2 keys, Account ID)
- [ ] Worker deployed
- [ ] Pages connected to GitHub
- [ ] Pages environment variables set (API URL, Basic Auth)
- [ ] CORS origin updated in `wrangler.toml`
- [ ] Test upload/download/delete/ZIP functions
