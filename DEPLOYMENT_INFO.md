# Deployment Information

## Worker Deployment

### Status: ✅ DEPLOYED

- **URL**: https://imgdose-api.nameless-rice-6dac.workers.dev
- **Health Check**: https://imgdose-api.nameless-rice-6dac.workers.dev/healthz
- **Deployment Date**: 2025-10-07
- **Version ID**: 9bc0f1d5-07f0-4ee9-aff9-de2f2d905a4d

### Database

- **D1 Database**: imgdose (15159950-ffcd-4c1b-9bf7-53981c0a8d8f)
- **Migrations Applied**: ✅ 0001_create_images.sql

### R2 Storage

- **Bucket**: imgdose
- **Binding**: IMGDOSE_BUCKET

### Environment Variables

- `IMGDOSE_CORS_ORIGIN`: http://localhost:3000 (要変更 - Pages URLに設定)
- `IMGDOSE_BUCKET_NAME`: imgdose
- `IMGDOSE_LOG_LEVEL`: info

### Secrets (Configured)

- ✅ `IMGDOSE_R2_ACCESS_KEY`
- ✅ `IMGDOSE_R2_SECRET_KEY`
- ✅ `IMGDOSE_ACCOUNT_ID`

---

## Next Steps for Pages Deployment

1. **フロントエンド側の設定**:
   - `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` を Worker URL に設定:
     ```
     https://imgdose-api.nameless-rice-6dac.workers.dev
     ```

2. **CORS設定の更新**:
   - Pages デプロイ後、`wrangler.toml` の `IMGDOSE_CORS_ORIGIN` を Pages URL に変更
   - Worker を再デプロイ

3. **GitHub Secrets の設定** (Pages CI/CD用):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`: 512387a50678415712a91baa79f7a162
   - `NEXT_PUBLIC_IMGDOSE_API_BASE_URL`: https://imgdose-api.nameless-rice-6dac.workers.dev

4. **Pages Environment Variables の設定** (Cloudflare Dashboard):
   - `NODE_VERSION`: 20
   - `BASIC_AUTH_USERNAME`: (your username)
   - `BASIC_AUTH_PASSWORD`: (your password)
   - `NEXT_PUBLIC_IMGDOSE_API_BASE_URL`: https://imgdose-api.nameless-rice-6dac.workers.dev

---

## Quick Commands

```bash
# デプロイ状況確認
npm run cf:wrangler -- deployments list

# ログ監視
npm run cf:tail

# Worker再デプロイ
npm run cf:deploy

# D1データ確認
npm run cf:wrangler -- d1 execute imgdose --command "SELECT * FROM images LIMIT 10"
```
