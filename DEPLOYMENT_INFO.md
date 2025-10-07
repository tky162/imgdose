# Deployment Information

## Worker Deployment

### Status: ✅ DEPLOYED

- **URL**: https://imgdose-api.nameless-rice-6dac.workers.dev
- **Health Check**: https://imgdose-api.nameless-rice-6dac.workers.dev/healthz
- **Deployment Date**: 2025-10-07
- **Version ID**: 9bc0f1d5-07f0-4ee9-aff9-de2f2d905a4d

### Database

- **D1 Database**: imgdose (15159950-ffcd-4c1b-9bf7-53981c0a8d8f)
- **Migrations Applied**: ✅ 0001_create_images.sql (remote)

### R2 Storage

- **Bucket**: imgdose
- **Binding**: IMGDOSE_BUCKET

### Environment Variables

- `IMGDOSE_CORS_ORIGIN`: http://localhost:3000 (Pages デプロイ後に更新が必要)
- `IMGDOSE_BUCKET_NAME`: imgdose
- `IMGDOSE_LOG_LEVEL`: info

### Secrets (Configured)

- ✅ `IMGDOSE_R2_ACCESS_KEY`
- ✅ `IMGDOSE_R2_SECRET_KEY`
- ✅ `IMGDOSE_ACCOUNT_ID`

---

## Pages Deployment

### Status: ⏳ PENDING - Setup Required

Pages は **Git Integration** 方式で Cloudflare Dashboard から設定します。

### Setup Steps (Cloudflare Dashboard)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) を開く
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. GitHub アカウント接続（初回のみ）
4. リポジトリ `tky162/imgdose` を選択
5. **Build settings**:

   | Setting | Value |
   |---------|-------|
   | Production branch | `main` |
   | Framework preset | `Next.js` |
   | Build command | `npm run build` |
   | Build output directory | `out` |

6. **Environment variables**:

   | Variable | Value |
   |----------|-------|
   | `NODE_VERSION` | `20` |
   | `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` | `https://imgdose-api.nameless-rice-6dac.workers.dev` |

7. **Save and Deploy** をクリック

### After First Deployment

デプロイ完了後、以下を実施:

1. **Pages URL を確認** (例: `https://imgdose.pages.dev`)

2. **CORS 設定を更新**:
   - `wrangler.toml` の `IMGDOSE_CORS_ORIGIN` を Pages URL に変更:
     ```toml
     [vars]
     IMGDOSE_CORS_ORIGIN = "https://imgdose.pages.dev"
     ```
   - Worker を再デプロイ:
     ```bash
     npm run cf:deploy
     ```

3. **動作確認**:
   - Pages URL にアクセス
   - 画像アップロード → テーブル/ギャラリー表示 → ダウンロード → 削除をテスト

---

## Deployment Architecture

```
GitHub Repository (main branch)
    ↓ (push)
Cloudflare Pages (Git Integration)
    ↓ (自動ビルド: npm run build)
Static Site (out/)
    ↓ (デプロイ)
https://imgdose.pages.dev
    ↓ (API calls)
Cloudflare Workers
    ↓ (R2 & D1 access)
R2 Bucket (imgdose) + D1 Database (imgdose)
```

---

## Quick Commands

### Worker 関連

```bash
# デプロイ状況確認
npm run cf:wrangler -- deployments list

# ログ監視
npm run cf:tail

# Worker再デプロイ
npm run cf:deploy

# D1データ確認
npm run cf:wrangler -- d1 execute imgdose --command "SELECT * FROM images LIMIT 10" --remote

# Secrets確認
npm run cf:wrangler -- secret list
```

### ローカル開発

```bash
# Next.js dev server (localhost:3000)
npm run dev

# Worker dev server (localhost:8787)
npm run cf:dev

# ビルドテスト
npm run build

# テスト実行
npm run test
```

---

## Troubleshooting

### Pages ビルドが失敗する

- Cloudflare Dashboard → **Workers & Pages** → **imgdose** → **Deployments** でログ確認
- `NODE_VERSION=20` が設定されているか確認
- `out/` ディレクトリが正しく指定されているか確認

### Pages は表示されるが画像アップロードができない

- Worker URL が正しく `NEXT_PUBLIC_IMGDOSE_API_BASE_URL` に設定されているか確認
- ブラウザの開発者ツールで Network タブを確認（CORS エラーの有無）
- `wrangler.toml` の `IMGDOSE_CORS_ORIGIN` が Pages URL と一致しているか確認

### CORS エラーが出る

- `wrangler.toml` の `IMGDOSE_CORS_ORIGIN` を Pages URL に更新
- Worker を再デプロイ: `npm run cf:deploy`

---

## Next Steps

- [ ] Cloudflare Dashboard で Pages プロジェクトを作成
- [ ] 環境変数 (`NODE_VERSION`, `NEXT_PUBLIC_IMGDOSE_API_BASE_URL`) を設定
- [ ] 初回デプロイ実行
- [ ] Pages URL 確認後、CORS 設定を更新
- [ ] Worker 再デプロイ
- [ ] 動作確認（アップロード・管理機能）

詳細手順: [docs/deployment.md](docs/deployment.md)
