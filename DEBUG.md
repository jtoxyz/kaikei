# データ読み込みのトラブルシューティング

## ブラウザのコンソールで確認する方法

1. ブラウザで https://アクセスURL を開く
2. F12 キーで開発者ツールを開く
3. コンソールタブで以下を実行：

```javascript
// パスワード確認
console.log("Password:", localStorage.getItem("password"));

// Cloudflareからデータ取得テスト
fetch("https://kaikei.osu-gakkenpo.workers.dev/?pw=" + localStorage.getItem("password"))
  .then(r => {
    console.log("Response status:", r.status);
    return r.json();
  })
  .then(d => console.log("Received data:", d))
  .catch(e => console.error("Error:", e));

// ローカルストレージ確認
console.log("Local data:", {
  kaikei: localStorage.getItem("kaikei"),
  subjects: localStorage.getItem("subjects"),
  startCash: localStorage.getItem("startCash"),
  startBank: localStorage.getItem("startBank")
});
```

## 確認すべきポイント

1. パスワードが設定されているか
2. Cloudflareのレスポンスステータスは200か
3. 返されるデータ形式は何か（JSON か JSON文字列か）
4. ローカルストレージにはデータが残っているか
