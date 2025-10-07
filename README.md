# imgdose

imgdose is an image management console built with Next.js (App Router) on top of Cloudflare Workers, R2, and D1. The Workers API is managed via `wrangler`, while the dashboard provides upload, search, and maintenance tools.

## Local Development

1. Install dependencies

   ```bash
   npm install
   ```

2. Provide Basic Auth credentials in `temp/idpass.md` (already gitignored):

   ```
   ID    your-id
   PASS  your-password
   ```

3. Start the Next.js dev server

   ```bash
   npm run dev
   # http://localhost:3000
   ```

## Cloudflare Wrangler

Wrangler requires Node.js 20+. A Node 20 binary is unpacked under `temp/node-v20.18.0-linux-x64` and is used automatically by the wrapper script. Set `IMGDOSE_WRANGLER_NODE_DIR` if you prefer a different location.

Available npm scripts:

- `npm run cf:whoami` – show the current Cloudflare account
- `npm run cf:dev` – run `wrangler dev --local`
- `npm run cf:deploy` – deploy the Worker
- `npm run cf:wrangler -- <command>` – run an arbitrary Wrangler command
- `npm run cf:d1:migrate` – apply D1 migrations to the production DB
- `npm run cf:tail` – stream Worker logs via `wrangler tail`

See `docs/cloudflare-setup.md` for login/setup details.

## wrangler.toml

`wrangler.toml` binds the production R2 bucket and D1 database. Update the identifiers if you recreate the resources in Cloudflare.

- `IMGDOSE_BUCKET` : R2 bucket (`imgdose`)
- `IMGDOSE_DB` : D1 database (`imgdose`, ID `15159950-ffcd-4c1b-9bf7-53981c0a8d8f`)
- `IMGDOSE_LOG_LEVEL` : Worker log level (`info` / `debug` / `silent`, default `info`)

### Cloudflare D1 migration

The schema is defined in `db/migrations/0001_create_images.sql`. Apply migrations before deploying:

```bash
npm run cf:d1:migrate
```

If you rely on `wrangler dev --local`, append `--local` to run against the local Miniflare emulator.

### API connectivity from the frontend

The dashboard uploads via `multipart/form-data` to the Workers endpoint `/images`.

- Set `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` to point the UI to a different API origin.
- When unset, `http://127.0.0.1:8787` (the default `wrangler dev` port) is used for localhost.
- In all other cases the browser origin is used.

## Directory Layout

```
app/                 # Next.js (App Router)
components/          # UI components (upload panel, tables, galleries)
workers/api/         # Cloudflare Worker implementation
scripts/             # Wrangler wrapper scripts (Node 20 shim)
docs/                # Project documentation
```

## Implemented Features

- Basic Auth protected management console
- Image upload (multi-select, max 10 MB, JPEG/PNG/WebP/GIF/SVG)
- Search, sort, and paginate image listings (table / gallery views)
- Direct URL copy & individual downloads from R2
- Multi-select deletion (R2 + D1 in sync)
- Multi-select ZIP archive download (up to 50 images per archive)

## Logging & Operations

- Control Worker logging with `IMGDOSE_LOG_LEVEL` (`info`, `debug`, or `silent`).
- Tail live Worker logs via `npm run cf:tail` (wraps `wrangler tail`).
- Additional operational tips are documented in `docs/operations.md`.

## Testing

Vitest + Testing Library are used for unit/component tests.

```
npm run test
```

## Deployment

### Cloudflare Workers (Manual)

Deploy the Workers API manually via Wrangler:

```bash
# Apply D1 schema
npm run cf:d1:migrate

# Deploy Worker
npm run cf:deploy

# Monitor logs
npm run cf:tail
```

See [docs/deployment.md](docs/deployment.md) for detailed instructions.

### Cloudflare Pages (Automatic)

Pages auto-deploys on push to `main` via GitHub Actions (`.github/workflows/deploy-pages.yml`).

**Prerequisites**:
1. Create a Cloudflare Pages project named `imgdose` connected to this repository
2. Set GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN` – API token with Pages edit permissions
   - `CLOUDFLARE_ACCOUNT_ID` – Your Cloudflare account ID
   - `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` – Worker API endpoint (optional)
3. Set Pages environment variables:
   - `NODE_VERSION=20`
   - `BASIC_AUTH_USERNAME` – Basic auth username
   - `BASIC_AUTH_PASSWORD` – Basic auth password
   - `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` – Worker API URL

See [docs/deployment.md](docs/deployment.md) and [docs/secrets-management.md](docs/secrets-management.md) for full setup.

## Operations

- **Monitoring**: `npm run cf:tail` streams Worker logs
- **Secrets**: See [docs/secrets-management.md](docs/secrets-management.md)
- **Operational tips**: [docs/operations.md](docs/operations.md)
