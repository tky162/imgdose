# Cloudflare Wrangler Setup

## 1. Node.js 20 Runtime

Wrangler v3+ requires Node.js 20 or later. This repository ships with a Node 20 binary unpacked at `temp/node-v20.18.0-linux-x64`.

1. Extract Node.js 20.x into `temp/` (e.g., `node-v20.18.0-linux-x64`).
2. To use a different location, set:

```bash
export IMGDOSE_WRANGLER_NODE_DIR="/path/to/node-v20.18.0-linux-x64"
```

## 2. Wrangler Commands

`package.json` provides wrapper scripts so that all Wrangler commands run through Node.js 20 automatically.

- `npm run cf:whoami` – confirm the active Cloudflare account
- `npm run cf:dev` – run `wrangler dev --local`
- `npm run cf:deploy` – deploy the Worker
- `npm run cf:wrangler -- <command>` – execute any other Wrangler command
- `npm run cf:d1:migrate` – apply D1 migrations (`wrangler d1 migrations apply imgdose`)
- `npm run cf:tail` – stream Worker logs (`wrangler tail --format=pretty`)

## 3. Environment Variables (`wrangler.toml`)

`wrangler.toml` binds the production resources. Update the IDs if you recreate them in the Cloudflare dashboard.

- `IMGDOSE_BUCKET` – R2 bucket (`imgdose`)
- `IMGDOSE_DB` – D1 database (`imgdose`, ID: `15159950-ffcd-4c1b-9bf7-53981c0a8d8f`)
- `IMGDOSE_BUCKET_NAME` – Bucket name used for public URLs
- `IMGDOSE_LOG_LEVEL` – Worker log level (`debug` / `info` / `silent`)

## 4. Account Switching

If the logged-in account differs from the target (`512387a5...`), log out and re-login:

```bash
npm run cf:wrangler -- logout
npm run cf:wrangler -- login
```

Confirm the account with `npm run cf:whoami`.

## 5. Operations Tips

- Apply D1 migrations before deploy (`npm run cf:d1:migrate`).
- Tail logs during testing (`npm run cf:tail`).
- Additional operational guidance (R2 maintenance, troubleshooting, etc.) is documented in `docs/operations.md`.

The Worker entry point is `workers/api/src/index.ts`, with `nodejs_compat` enabled.
