/**
 * Cloudflare Worker: 会計ソフト（kaikei）データ同期・認証エンドポイント
 * 
 * ログイン流れ:
 * 1. login/index.html でパスワード入力 → localStorage["password"] に保存
 * 2. index.html がパスワード確認、未設定ならリダイレクト
 * 3. main.js が ?pw=<password> クエリで GET/POST を実行
 * 4. このWorkerが PASSWORD 環境変数と照合、データをKV（KAKEI）に保存/取得
 * 
 * 設定（Cloudflare ダッシュボード）:
 * - 環境変数: PASSWORD（認証パスワード）, ALLOW_ORIGIN（CORS許可オリジン、デフォルト *）
 * - KVバインディング: KAKEI
 * 
 * エンドポイント:
 * - GET /?pw=<password>  → KV に保存されたデータをJSON返却
 * - POST /?pw=<password> → リクエストボディをKVに保存
 * - OPTIONS             → CORS プリフライト対応
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }
    return handleRequest(request, env);
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const pw = url.searchParams.get("pw") || ""

  if(pw !== env.PASSWORD){
    return withCors(new Response('認証に失敗しました。', { status: 401 }), request, env)
  }

  const key = 'kaikei'

  if(request.method === 'GET'){
    const data = await env.KAKEI.get(key) || '[]'
    return withCors(new Response(data, { headers: { 'Content-Type': 'application/json' } }), request, env)
  } else if(request.method === 'POST'){
    let body
    try {
      body = await request.json()
    } catch (e) {
      return withCors(new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }), request, env)
    }
    await env.KAKEI.put(key, JSON.stringify(body))
    return withCors(new Response('OK'), request, env)
  }
  return withCors(new Response('そのメソッドは許可されていません', { status: 405 }), request, env)
}

function handleOptions(request, env){
  const headers = buildCorsHeaders(request, env)
  const reqHeaders = request.headers.get('Access-Control-Request-Headers') || 'Content-Type'
  headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
  headers['Access-Control-Allow-Headers'] = reqHeaders
  headers['Access-Control-Max-Age'] = '86400'
  return new Response(null, { headers })
}

function withCors(response, request, env){
  const cors = buildCorsHeaders(request, env)
  const newHeaders = new Headers(response.headers)
  Object.entries(cors).forEach(([k, v]) => newHeaders.set(k, v))
  return new Response(response.body, { status: response.status, headers: newHeaders })
}

function buildCorsHeaders(request, env){
  const origin = request.headers.get('Origin') || ''
  const allow = (env.ALLOW_ORIGIN || '*').split(',').map(s => s.trim()).filter(Boolean)
  let allowOrigin = '*'
  if(allow.length === 1 && allow[0] !== '*'){
    allowOrigin = allow.includes(origin) ? origin : 'null'
  } else if(allow.length > 1){
    allowOrigin = allow.includes(origin) ? origin : 'null'
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin'
  }
}
