# 学生団体 会計ソフト

## Workers コードの共同編集とデプロイ

- 目的: Cloudflare Workers の `worker.js` をリポジトリで共同編集し、レビュー後に Cloudflare ダッシュボードへコピペで反映します（自動デプロイは任意）。

- 対象ファイル: [worker.js](worker.js)

- 変更フロー（推奨）
	- feature ブランチで修正 → Pull Request 作成（レビュー） → `main` にマージ
	- レビュー時は差分が明確になり、複数人でコメント可能

- 反映（手動）
	1. Cloudflare ダッシュボード → Workers & Pages → 対象 Worker を開く
	2. エディタに `worker.js` 全文をコピペ → 保存/デプロイ

- 環境変数（Cloudflare 側で設定）
	- `PASSWORD`: API 認証用のパスワード（クエリ `?pw=...` と照合）
	- `ALLOW_ORIGIN`: CORS 許可オリジン。例: `https://your-pages.example.com`（カンマ区切り複数可）。未設定は `*`。

- KV バインディング（Cloudflare 側で設定）
	- 名前: `KAKEI`（コード内で使用）

- エンドポイント概要
	- `GET /?pw=...` : `KAKEI` からJSON文字列を取得
	- `POST /?pw=...` : リクエスト JSON を保存（body 全体を `KAKEI` に格納）
	- CORS/OPTIONS に対応（`ALLOW_ORIGIN` に基づく）

- 将来的な自動化（任意）
	- `wrangler.toml` を追加して GitHub Actions で `wrangler publish` による自動デプロイも可能。
	- 必要になった時点でテンプレートを追加します。
