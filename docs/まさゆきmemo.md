# imgdose — アダルトブログ用画像 CDN

**管理UI: https://imgdose.pages.dev**  
**画像配信: https://img.takayamalog.com**

takayamalog.com（アダルトブログ）専用の画像 CDN。  
Cloudflare Workers + R2 + D1 で自前運用。Cloudflare Images は2026年4月解約済みのため不使用。

---

## システム構成

```
[imgdose.pages.dev]  ← Next.js 管理UI (git push で自動デプロイ)
  ↓ API calls
[imgdose-api Worker] ← Hono + R2 + D1
  ↓
R2 bucket (imgdose)  ← 画像ファイル本体
D1 (imgdose)         ← メタデータ (images, batches)

配信URL: https://img.takayamalog.com/files/{key}       ← 個別画像
         https://img.takayamalog.com/{batchId}/{seq}   ← バッチ短縮URL
```

---

## 主要リソース

| リソース | 値 |
|---|---|
| Cloudflare Account ID | `512387a50678415712a91baa79f7a162` |
| Worker URL | `https://imgdose-api.nameless-rice-6dac.workers.dev` |
| カスタムドメイン | `https://img.takayamalog.com` |
| D1 Database | `imgdose` (ID: `15159950-ffcd-4c1b-9bf7-53981c0a8d8f`) |
| R2 Bucket | `imgdose` |
| CORS 許可オリジン | `imgdose.pages.dev`, `tky-182.pages.dev` |

---

## デプロイ

### Worker — 手動デプロイ

```bash
cd /Users/nakayamamasayuki/Documents/GitHub/imgdose
npx wrangler deploy
```

### 管理UI (Pages) — git push で自動デプロイ

```bash
git add . && git commit -m "..." && git push
```

### D1 マイグレーション

```bash
npx wrangler d1 execute imgdose --remote --file=./db/migrations/XXXX.sql
```

---

## バッチ（箱）機能

記事1本分の画像をまとめてアップして URL 一覧を出力するワークフロー。

**手順:**
1. `imgdose.pages.dev/batches/new` を開く
2. バッチ名（任意）を入力 → 画像を複数選択 → 「一括アップロード」
3. 完了後に URL 一覧が表示 → 「全URLをコピー」
4. 記事の Markdown に貼り付ける

**生成される URL:**
```
https://img.takayamalog.com/abc123/001
https://img.takayamalog.com/abc123/002
...
```

---

## メンテナンスログ

### 260502 — カスタムドメイン・バッチ機能実装

- `img.takayamalog.com` カスタムドメイン設定（wrangler.toml + Cloudflare DNS 自動作成）
- `IMGDOSE_PUBLIC_URL_BASE` 環境変数で URL 生成をカスタムドメインに統一
- upload-panel に「全URLをコピー」パネル追加
- **バッチ機能**実装: D1 `batches` テーブル追加、Worker に CRUD + 短縮URLルート追加
- 管理UI に `/batches`、`/batches/new` ページ追加
- CORS に `tky-182.pages.dev` 追加

**次回メンテ時の確認:**
- [ ] `docs/tempmemoあとでけす/idpass.md` — 資格情報確認後に削除
- [ ] CORS に `takayamalog.com` 本番ドメイン追加が必要か確認（管理画面からアップロードする場合）
