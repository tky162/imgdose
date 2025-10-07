# Operations Guide

## Worker Logs

- `IMGDOSE_LOG_LEVEL` controls the verbosity of the Worker (`debug`, `info`, `silent`).
  - `debug`: detailed operational logs
  - `info` (default): success and error logs
  - `silent`: suppresses Worker logs
- Use `npm run cf:tail` to stream logs via `wrangler tail --format=pretty`.
- For one-off inspections you can also run `npm run cf:wrangler -- tail --format=json`.

## Monitoring Uploads & Deletions

- Upload summary logs include the number of successes and failures.
- Delete/Archive endpoints log the IDs and reasons when failures occur.
- Errors return structured JSON (`{ ok: false, error: string }`). The UI surfaces these messages in toast/inline alerts.

## D1 Maintenance

- Apply migrations with `npm run cf:d1:migrate`.
- Inspect the database via Wrangler: `npm run cf:wrangler -- d1 execute imgdose --command "SELECT COUNT(*) FROM images;"`

## R2 Maintenance

- Objects are stored with keys `${timestamp}-${uuid}[.ext]`.
- Use the Cloudflare dashboard or `wrangler r2 object list` if manual inspection is required.

## Deployment Notes

1. Ensure migrations are applied (`npm run cf:d1:migrate`).
2. Deploy the Worker (`npm run cf:deploy`).
3. Tail logs (`npm run cf:tail`) during smoke tests.
4. Update `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` and redeploy Next.js app if the Worker origin changes.

## Troubleshooting Checklist

- API 500 errors → check `wrangler tail` for stack traces.
- ZIP ダウンロードが空 → Worker ログで R2 取得失敗を確認（キー削除済みなど）。
- 削除エラー → 失敗ID・理由が JSON に含まれるため UI とログを確認。
- Basic 認証 → `temp/idpass.md` と `IMGDOSE_CORS_ORIGIN` を再確認。
