# Secrets Management

This document describes all secrets and environment variables required for imgdose deployment.

---

## 1. Cloudflare Workers Secrets

Workers secrets are stored securely in Cloudflare and are never committed to the repository.

### Required Secrets

| Secret Name | Description | How to Set |
|-------------|-------------|------------|
| `IMGDOSE_R2_ACCESS_KEY` | R2 Access Key ID | `npm run cf:wrangler -- secret put IMGDOSE_R2_ACCESS_KEY` |
| `IMGDOSE_R2_SECRET_KEY` | R2 Secret Access Key | `npm run cf:wrangler -- secret put IMGDOSE_R2_SECRET_KEY` |
| `IMGDOSE_ACCOUNT_ID` | Cloudflare Account ID | `npm run cf:wrangler -- secret put IMGDOSE_ACCOUNT_ID` |

### How to Generate R2 Access Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Set permissions:
   - **Object Read & Write** for the `imgdose` bucket
4. Save the **Access Key ID** and **Secret Access Key**
5. Upload to Worker using the commands above

### Verify Secrets

To list all configured secrets (values are hidden):

```bash
npm run cf:wrangler -- secret list
```

### Rotate Secrets

To rotate R2 keys:

1. Generate new keys in Cloudflare Dashboard
2. Update Worker secrets:
   ```bash
   npm run cf:wrangler -- secret put IMGDOSE_R2_ACCESS_KEY
   npm run cf:wrangler -- secret put IMGDOSE_R2_SECRET_KEY
   ```
3. Redeploy Worker:
   ```bash
   npm run cf:deploy
   ```
4. Delete old keys from Cloudflare Dashboard

---

## 2. Cloudflare Pages Environment Variables

These are set via the Cloudflare Pages dashboard under **Settings** → **Environment variables**.

### Required Variables

| Variable Name | Example Value | Description |
|---------------|---------------|-------------|
| `NODE_VERSION` | `20` | Required for Next.js 15+ |
| `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` | `https://imgdose-api.example.workers.dev` | Worker API endpoint |
| `BASIC_AUTH_USERNAME` | `admin` | Basic auth username |
| `BASIC_AUTH_PASSWORD` | `your-secure-password` | Basic auth password |

### How to Set

1. Go to **Workers & Pages** → **imgdose** → **Settings** → **Environment variables**
2. Add each variable for **Production** and **Preview** environments
3. Save
4. Redeploy (automatic on next push, or manual via dashboard)

### Production vs Preview

- **Production**: Used for `main` branch deployments
- **Preview**: Used for PR/branch deployments

You can set different values for each environment (e.g., different API URLs or auth credentials for staging).

---

## 3. GitHub Secrets (for CI/CD)

These are set in your GitHub repository under **Settings** → **Secrets and variables** → **Actions**.

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages deploy permissions | Create at [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | Found in Cloudflare Dashboard URL or via `npm run cf:whoami` |
| `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` | Worker API endpoint (optional, can also set in Pages env vars) | e.g. `https://imgdose-api.example.workers.dev` |

### How to Create CLOUDFLARE_API_TOKEN

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template, or create a custom token with:
   - **Account** → **Cloudflare Pages** → **Edit**
4. Copy the token and add it to GitHub Secrets

---

## 4. Local Development Secrets

For local development, secrets are stored in the gitignored `temp/` directory.

### `temp/idpass.md`

Contains Basic Auth credentials for local dev server (`npm run dev`):

```
ID    your-local-username
PASS  your-local-password
```

### `temp/R2 Account Token.md`

Contains R2 access keys for local Wrangler operations (already set in Worker secrets, but kept here for reference):

```
Access Key ID: your-access-key-id
Secret Access Key: your-secret-access-key
Account ID: your-account-id
```

**Important**: These files are in `.gitignore` and must never be committed.

---

## 5. Security Best Practices

### ✅ Do

- Use strong, unique passwords for Basic Auth
- Rotate R2 access keys periodically (every 90 days recommended)
- Limit R2 token permissions to only the `imgdose` bucket
- Use different Basic Auth credentials for Production and Preview
- Store secrets only in Cloudflare/GitHub Secrets, never in code or `.env` files committed to Git

### ❌ Don't

- Share secrets in chat, email, or documentation
- Commit secrets to Git (even in "temp" or "local" branches)
- Use the same password for Basic Auth and other services
- Grant R2 tokens broader permissions than necessary
- Hardcode secrets in `wrangler.toml`, `next.config.ts`, or source files

---

## 6. Secrets Checklist

Before deploying to production, ensure:

- [ ] Worker secrets configured (`IMGDOSE_R2_ACCESS_KEY`, `IMGDOSE_R2_SECRET_KEY`, `IMGDOSE_ACCOUNT_ID`)
- [ ] Pages environment variables set (`NODE_VERSION`, `NEXT_PUBLIC_IMGDOSE_API_BASE_URL`, `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`)
- [ ] GitHub secrets added (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
- [ ] `temp/` directory added to `.gitignore` and never committed
- [ ] Strong passwords used for all authentication
- [ ] R2 access keys limited to `imgdose` bucket only

---

## Troubleshooting

### Worker returns "R2 access denied" errors

- Verify secrets are set: `npm run cf:wrangler -- secret list`
- Check R2 token permissions include **Object Read & Write** for `imgdose` bucket
- Confirm `IMGDOSE_ACCOUNT_ID` matches your Cloudflare account

### Pages deployment fails with "Authentication required"

- Ensure `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are set in Pages environment variables
- Check both **Production** and **Preview** environments
- Redeploy Pages after adding variables

### GitHub Actions deployment fails

- Verify `CLOUDFLARE_API_TOKEN` has **Cloudflare Pages → Edit** permissions
- Check `CLOUDFLARE_ACCOUNT_ID` matches your account (compare with `npm run cf:whoami`)
- Review GitHub Actions logs for detailed error messages
