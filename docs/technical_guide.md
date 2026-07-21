# web_frontend (Albot Console) 技術書

## 1. 概要

`web_frontend` は discord_ai_bot のWeb APIを操作するための、ビルド不要な静的サイト（HTML/CSS/バニラJS）。フレームワーク（React/Vue等）もバンドラー（webpack/vite等）も使っておらず、`<script>` タグの読み込み順に依存したグローバル関数群として実装されている。npmパッケージも使用していない（Markdown描画とサニタイズのみCDN経由の外部ライブラリに依存）。

現状の役割は「discord_ai_botのAPIを叩くだけのクライアント」であり、それ自体はサーバーサイドの処理を一切持たない。

## 2. アーキテクチャ

```
ブラウザ
 ├─ index.html を静的配信サーバーから取得
 ├─ marked.js / DOMPurify を CDN から取得
 ├─ js/*.js を順番に読み込み（グローバル関数がwindowに定義される）
 └─ fetch()で discord_ai_bot の /api/* を直接叩く
       │
       ▼
  discord_ai_bot（別サービス、別オリジン）
       │
   x-api-token ヘッダーで認証
   WEB_ORIGIN で CORS 許可
```

- フロントエンドとバックエンドは別オリジン（別ドメイン/別ポート）で動く前提
- 認証はCookieではなく `x-api-token` ヘッダー。ブラウザの `credentials` 制約を受けないため、CORSは `Access-Control-Allow-Origin` の許可さえあれば動く
- サーバーサイドレンダリングは行わない。`index.html` は常に同じ内容が返り、表示内容はすべてJSがDOMを書き換えて作る

## 3. スクリプト読み込み順と依存関係

`index.html` 末尾のスクリプトタグの順序は依存関係の順になっており、**この順序を変えると動かなくなる**。

```
utils.js   → 他のどのファイルにも依存しない純粋ヘルパー
api.js     → utils.js のlogSystem等には依存しないが、chat.jsのlogSystemを呼ぶ関数がある(読み込み順的には問題ないが、実行順=イベント発火順で解決される)
state.js   → グローバル変数の宣言のみ
files.js   → state.js の selectedFiles / TEXT_EXTENSIONS に依存
chat.js    → api.js の api()、files.js の buildFileCard に依存
status.js  → api.js の api()、chat.js の loadHistory に依存
search.js  → api.js の api() に依存
sidebar.js → 他ファイルに依存しない（DOM操作のみ）
main.js    → 上記すべての初期化・イベント登録を行う。最後に読み込む必要がある
```

すべての関数・変数は `<script>` タグ経由でグローバルスコープ（`window`）に生えている。モジュールシステム（`import`/`export`）は使っていないため、**同名の関数・変数を別ファイルで定義すると片方が上書きされる**点に注意。

## 4. 状態管理

このアプリには状態管理ライブラリ（Redux等）は無く、2種類の方法で状態を持っている。

### 4.1 グローバル変数（`state.js`）

```js
let selectedFiles = [];          // 送信前の添付ファイル一覧
let currentLoadedChannel = null; // 直近に履歴を読み込んだチャンネルID
let currentLoadedSession = null; // 直近に履歴を読み込んだセッション名
const TEXT_EXTENSIONS = [...];   // テキストファイルとして扱う拡張子（サーバー側と同じリストを手動で二重管理）
```

- ページをリロードすると消える、揮発性のUI状態
- `currentLoadedChannel` / `currentLoadedSession` は、`status.js` の `refreshStatus()` が30秒ごとに呼ばれる際、チャンネル/セッションが変わっていた場合だけ `loadHistory()` を呼ぶための重複防止フラグとして使われている

### 4.2 `localStorage`（永続化される設定）

| キー | 内容 | 保存関数 |
|---|---|---|
| `apiBase` | バックエンドのURL | `saveConnection()`（`api.js`） |
| `apiToken` | APIトークン | `saveConnection()`（`api.js`） |

- ブラウザを閉じても消えない。サーバーには一切送られず、`fetch` のたびにこのブラウザから直接付与される
- 平文保存のため、共有端末での利用や、他のスクリプトが混入するリスクがある環境（XSS等）では漏洩しうる。この設計は「自分専用・自分の端末のみ」を前提にしている

## 5. 主要な処理フロー

### 5.1 起動時（`main.js` の `DOMContentLoaded`）

1. `apiBaseInput` / `tokenInput` に `localStorage` の保存値を復元
2. メッセージ入力欄のEnter送信・自動高さ調整のイベント登録
3. ドラッグ&ドロップ初期化（`initDragAndDrop()`）
4. サイドバーのモバイル自動クローズ初期化（`initSidebarAutoClose()`）
5. `refreshStatus()` を即時実行 → 以後30秒間隔で `setInterval` 実行

### 5.2 ステータス更新（`status.js` の `refreshStatus()`）

1. `GET /api/status` を叩き、モデル・チャンネル・セッション・稼働時間をステータスバーに反映
2. 直前に読み込んでいたチャンネル/セッション（`currentLoadedChannel`/`currentLoadedSession`）と比較し、変わっていたら `loadHistory()` を呼んで履歴を再取得・再描画
3. `refreshSessionList()` でセッション一覧を再描画（削除ボタン付き）

このポーリング方式のため、**Discord側でセッションやチャンネルが切り替わったことを検知するまで最大30秒のタイムラグがある**（WebSocketやSSEでのリアルタイム同期はしていない）。

### 5.3 メッセージ送信（`chat.js` の `sendMessage()`）

1. 入力テキストと選択中ファイルが両方空なら何もしない
2. ユーザー発言をチャットログに即時描画（楽観的UI更新。送信成功を待たずに表示する）
3. 選択中ファイルを `fileToBase64()` でbase64化（`files.js`）
4. `POST /api/chat` に `{ message, files }` を送信
5. 応答テキストを `appendMsg('bot', data.reply)` でチャットログに追加描画
6. 失敗時は `logSystem('エラー: ...')` でシステムメッセージとして表示（チャット欄自体にエラーメッセージが並ぶ形で、専用のエラーUIは無い）

### 5.4 ファイル添付（`files.js`）

- 添付経路は3つ: ファイル選択ダイアログ（📎ボタン）、ドラッグ&ドロップ、クリップボード貼り付け（画像のみ）
- 画像は `<img>` プレビュー、テキスト系拡張子は先頭5行をプレビュー表示、それ以外は📎アイコンのみのカード表示
- 送信時に初めて `FileReader.readAsDataURL()` でbase64化される（選択時点ではFileオブジェクトのまま保持）

### 5.5 Markdown描画とサニタイズ

AIの応答・AI検索要約は `marked.parse()` でHTML化した後、必ず `DOMPurify.sanitize()` を通してから `innerHTML` に挿入している（`chat.js`, `search.js`）。この2段階を省略すると、AIの応答内容次第でXSSの危険がある点に注意（AIの出力はユーザー入力に準ずる信頼度として扱っている）。

一方、検索結果の `title` / `url` / `description`（Brave Search由来、生テキスト）は `escapeHtml()`（`utils.js`）で単純エスケープのみ行い、Markdownとしては解釈していない。

## 6. CSS設計

- `base.css` の `:root` にCSS変数（色・角丸半径）を集約。他のCSSファイルはすべてこの変数を参照する。配色を変えたい場合は `base.css` の `:root` だけを編集すればよい
- 機能ごとにファイルを分割（`statusbar.css` / `sidebar.css` / `chat.css` / `files.css`）。新しい機能を追加する際もこの粒度でファイルを分けるのが既存のパターンに沿う
- `responsive.css` は `@media (max-width: 768px)` 1本にまとめてあり、既存クラスに対する**上書き**のみを行う設計（スマホ専用の別クラス体系は作っていない）

## 7. 既知の制約

1. **状態管理がグローバル変数**のため、機能が増えるほど `state.js` が肥大化しやすい
2. **モジュールシステムが無い**ため、関数名の衝突に気付きにくい（ビルド時の静的チェックが効かない）
3. **ポーリング間隔30秒**のため、リアルタイム性が低い（Discord側の変更が即座に反映されない）
4. **`TEXT_EXTENSIONS` がバックエンドと二重管理**（discord_ai_bot 側の `handler.rs`/`web/mod.rs` と同じリストを手動でJS側にも書いている。どちらかを変更したらもう片方も直す必要がある）
5. **トークンが `localStorage` に平文保存**される
6. **エラー表示が統一されていない**（`logSystem` でチャットログに混ぜて表示するもの、`alert`風の専用UIが無いもの、`console.error` のみのものが混在）

---

## 8. 拡張の方法

ここからは、今後このフロントエンドに新しい機能を追加していく際の指針。

### 8.1 まず決めること：バックエンドはどこに置くか

新機能が「バックエンド処理（DBアクセス・外部API呼び出し・認証が必要な処理等）」を必要とする場合、**まずその機能が discord_ai_bot（Discord Bot / AI / RAG / 会話履歴）と関係があるかどうかで置き場所を決める。**

| 機能の性質 | 置き場所 | 理由 |
|---|---|---|
| Discordの会話・AIモデル・RAG・履歴に関わる機能 | **discord_ai_bot 側の `web/mod.rs` にエンドポイント追加** | 既存のDB(SQLite)・AIクライアント・履歴ロジックをそのまま再利用できる。二重実装を避けられる |
| Discord Botと無関係な独立した機能（例: 別のデータを扱うツール、全く別のダッシュボード等） | **`web_frontend` 専用の新しいバックエンドを新設** | discord_ai_bot に無関係な責務を持ち込むと、Botのプロセスに無関係な障害要因を混ぜることになり、デプロイ・再起動の影響範囲も曖昧になる |

迷ったときの簡単な基準：「その機能はDiscordが無くても意味を成すか？」→ Yesなら専用バックエンドを新設する方向で検討する。

### 8.2 パターンA: discord_ai_bot 側にエンドポイントを足す場合

1. `src/web/mod.rs` に新しいハンドラ関数と `Router` の `.route(...)` 追加
2. 必要なら `strage::history::HistoryStore` に新しいテーブル・メソッドを追加（既存の `messages` テーブルを流用できない場合）
3. `docs/web_api.md`（discord_ai_bot リポジトリ側の技術書）にエンドポイント仕様を追記
4. フロントエンド側では `api.js` の `api()` 関数をそのまま使い、新しいUIから `api('/新エンドポイント', {...})` を呼ぶだけでよい（`apiBase` は既に discord_ai_bot を指しているため、追加設定は不要）

### 8.3 パターンB: `web_frontend` 専用の新しいバックエンドを作る場合

このフロントエンド自体を「静的ファイルのみ」から「フロント＋専用バックエンド」の構成に進化させる。推奨構成は以下。

```
web_frontend/
├── frontend/            … 現在のindex.html, css/, js/ をここに移動
└── backend/              … 新規。専用バックエンド(言語は自由。discord_ai_botと合わせるならRust/axum)
    ├── Cargo.toml (または package.json 等)
    └── src/
        ├── main.rs        … 静的ファイル配信 + 独自API
        └── ...
```

ポイント:

- **この専用バックエンドは `frontend/` の静的ファイル配信も受け持つ形にするのがシンプル**（discord_ai_bot から静的配信機能を外した経緯とは逆で、こちらは「フロント専用サービス」なので同居させて問題ない。むしろ同一オリジンになるのでCORS設定が不要になり構成がシンプルになる）
- 新しいAPIのパスは discord_ai_bot の `/api/*` と衝突しないプレフィックスにする（例: `/local-api/*`）
- フロントエンドのJS側は `api.js` の `api()` とは別に、この専用バックエンド用の関数を追加する。**既存の `api()`（discord_ai_bot用）は変更せずそのまま残し、新しい関数を並べて追加する**のが安全（既存機能への影響を避けるため）:

  ```js
  // api.js に追記するイメージ（既存のapi()はそのまま残す）
  function getLocalApiBase() {
    return localStorage.getItem('localApiBase') || '';
  }

  async function localApi(path, options = {}) {
    const res = await fetch(getLocalApiBase() + '/local-api' + path, {
      ...options,
      headers: { ...options.headers, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('リクエスト失敗 (' + res.status + ')');
    const ct = res.headers.get('content-type') || '';
    return ct.includes('json') ? res.json() : null;
  }
  ```

  同一オリジンで配信している場合は `getLocalApiBase()` は空文字列のままでよい（相対パスで動く）。将来的にこの専用バックエンドもさらに別サービスへ分離することになれば、discord_ai_bot の時と同様にCORS対応（`WEB_ORIGIN`相当の仕組み）を追加する

- 認証をこの専用バックエンドにも持たせる場合、discord_ai_bot の `x-api-token` 方式をそのまま踏襲すると実装・運用の学習コストが増えない

### 8.4 新しいUI機能を追加する際の型（バックエンド有無に関わらず共通）

既存コードのパターンに沿うと迷いにくい。

1. `index.html` の `#sidebar` 内に `<div class="section">...</div>` を1つ追加（見た目は既存の「Web検索」セクション等を参考にする）
2. 新しいCSSが必要なら `css/新機能名.css` を新規作成し、`index.html` の `<head>` で読み込む
3. 新しいロジックは `js/新機能名.js` として新規作成し、`index.html` の末尾スクリプト群に追加する
   - 読み込み順は「依存するファイルより後」に置く。`api.js`（または新設した専用バックエンド用関数）を使うなら `api.js` より後、`main.js` より前
4. 状態が必要なら `state.js` に変数を足す（機能が大きくなってきたら、`state.js` を分割して `state/新機能名.js` にすることも検討する）
5. サーバーへの通信が必要なら、8.2/8.3の判断に従って `api()` か新設の関数を使う
6. AIの出力やユーザー入力をHTMLとして表示する場合は、既存の `escapeHtml()`（プレーンテキスト用）または `marked.parse()` + `DOMPurify.sanitize()`（Markdown用）を必ず経由する。生の文字列を直接 `innerHTML` に入れない

### 8.5 モジュール化・ビルドツール導入を検討すべきタイミング

現状は「グローバル関数＋スクリプトタグの読み込み順」で成立しているが、以下のような兆候が出てきたら、Vite等のビルドツール導入とESモジュール化（`import`/`export`）を検討する目安になる。

- ファイル数・関数数が増え、名前衝突が頻発するようになった
- `state.js` が肥大化し、どの機能がどの変数を使っているか追いにくくなった
- npm製のUIライブラリ（コンポーネント系フレームワーク等）を使いたくなった

現時点（機能数が少なく、CDN頼みの2ライブラリのみ）では、ビルドツールを導入するコストの方が大きいため、素のJSのままで問題ない。
