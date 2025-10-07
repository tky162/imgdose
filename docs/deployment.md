# Deployment Guide

## Overview

imgdose consists of two deployable components:

1. **Next.js Dashboard** → Cloudflare Pages (Git Integration で自動デプロイ)
2. **Workers API** → Cloudflare Workers (手動デプロイ via `wrangler`)

---

## 1. Cloudflare Workers Deployment

### Prerequisites

- Wrangler authenticated to your Cloudflare account (`npm run cf:whoami`)
- D1 database and R2 bucket already created
- Secrets configured

### Apply D1 Migrations

Before deploying the Worker, ensure the D1 schema is applied:

```bash
npm run cf:d1:migrate -- --remote
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
- Applies environment variables from `wrangler.toml`

After deployment, the Worker will be accessible at:

```
https://imgdose-api.<your-subdomain>.workers.dev
```

### Update CORS Origin

For production, update `IMGDOSE_CORS_ORIGIN` in `wrangler.toml` after Pages deployment:

```toml
[vars]
IMGDOSE_CORS_ORIGIN = "https://imgdose.pages.dev"  # Pages URL に置き換え
```

Then redeploy:

```bash
npm run cf:deploy
```

---

## 2. Cloudflare Pages Deployment (Git Integration)

### Setup via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. **Connect GitHub account** (初回のみ)
4. リポジトリ `tky162/imgdose` を選択
5. **Set up builds and deployments** で以下を設定:

   | Setting | Value |
   |---------|-------|
   | **Production branch** | `main` |
   | **Framework preset** | `Next.js` |
   | **Build command** | `npm run build` |
   | **Build output directory** | `out` |
   | **Root directory (optional)** | (空欄) |

6. **Environment variables** セクションで以下を追加:

   | Variable name | Value |
   |---------------|-------|
   | `NODE_VERSION` | `20` |
   | `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` | `https://imgdose-api.<subdomain>.workers.dev` |

   **Note**: Worker URL は先にデプロイしたものを指定

7. **Save and Deploy** をクリック

### デプロイ完了後

- **Production URL**: `https://imgdose.pages.dev` (または custom domain)
- **Deployment** タブでビルドログ確認可能
- 次回以降、`main` ブランチへの push で自動デプロイ

### Preview Deployments

- Pull Request 作成時に自動でプレビュー環境が作成されます
- Preview URL: `https://<commit-hash>.imgdose.pages.dev`

---

## 3. Post-Deployment Configuration

### CORS 設定の更新

Pages デプロイ後、Worker の CORS 設定を更新:

1. `wrangler.toml` を編集:
   ```toml
   [vars]
   IMGDOSE_CORS_ORIGIN = "https://imgdose.pages.dev"
   ```

2. Worker を再デプロイ:
   ```bash
   npm run cf:deploy
   ```

### 動作確認

1. **Worker API のヘルスチェック**:
   ```bash
   curl https://imgdose-api.<subdomain>.workers.dev/healthz
   ```
   期待される応答: `{"ok":true}`

2. **Pages のアクセス**:
   - ブラウザで Pages URL を開く
   - 画像アップロード機能をテスト
   - テーブル/ギャラリー表示を確認

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

### Pages Build Logs

- Cloudflare Dashboard → **Workers & Pages** → **imgdose** → **Deployments**
- 各デプロイをクリックして詳細ログを確認

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
3. Update DNS records as instructed by Cloudflare
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
- Verify D1 migrations applied: `npm run cf:d1:migrate -- --remote`
- Tail logs: `npm run cf:tail`

### CORS errors in browser

- Ensure `IMGDOSE_CORS_ORIGIN` matches your Pages domain exactly (including `https://`)
- Redeploy Worker after changing `wrangler.toml`

### Images not appearing after upload

- Verify R2 bucket name matches `IMGDOSE_BUCKET_NAME` in `wrangler.toml`
- Check Worker logs for R2 access errors
- Confirm Account ID secret is correct

### Pages build fails

- Check build logs in Cloudflare Dashboard
- Verify `NODE_VERSION=20` is set in environment variables
- Ensure `npm run build` succeeds locally

### Pages shows blank page

- Verify `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` is set correctly
- Check browser console for errors
- Confirm Worker is deployed and accessible

---

## Summary

**Workers (Manual)**:
```bash
npm run cf:d1:migrate -- --remote  # Apply schema
npm run cf:deploy                  # Deploy Worker
npm run cf:tail                    # Monitor logs
```

**Pages (Automatic via Git Integration)**:
- Push to `main` branch → auto-deploys
- No GitHub Secrets required
- All configuration in Cloudflare Dashboard

**First-time setup checklist**:
- [x] D1 migrations applied
- [x] Worker secrets configured (R2 keys, Account ID)
- [x] Worker deployed
- [ ] Pages connected to GitHub via Cloudflare Dashboard
- [ ] Pages environment variables set (`NODE_VERSION`, `NEXT_PUBLIC_IMGDOSE_API_BASE_URL`)
- [ ] CORS origin updated in `wrangler.toml` after Pages deployment
- [ ] Test upload/download/delete/ZIP functions
