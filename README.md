# web_frontend (Albot Console)

discord_ai_bot のWeb API（別サービス化済み）をブラウザから操作するためのフロントエンドです。ビルド不要の素のHTML/CSS/JSのみで構成されており、静的ファイルとして配信するだけで動きます。

## できること

- discord_ai_bot とチャット（Markdown描画、画像・テキストファイル添付、ドラッグ&ドロップ、クリップボード貼り付け対応）
- AIモデルの切り替え
- 会話セッションの切り替え・新規作成・削除
- 同期対象のDiscordチャンネル切り替え
- Web検索（生の検索結果 / AIによる要約回答の切り替え）
- 現在の接続状態（モデル・チャンネル・セッション・稼働時間）の表示
- スマホ向けレスポンシブ対応（サイドバーがドロワー化、ステータスバーが折りたたみ式に）

## 構成

```
web_frontend/
├── index.html
├── css/
│   ├── base.css        … 共通デザイントークン(CSS変数)・基本要素スタイル
│   ├── statusbar.css    … 上部ステータスバー
│   ├── sidebar.css      … 左サイドバー(接続・モデル・セッション・検索)
│   ├── chat.css         … チャットログ・入力欄
│   ├── files.css        … 添付ファイルカード
│   └── responsive.css   … 768px以下のスマホ向け上書き
└── js/
    ├── utils.js   … 汎用ヘルパー(HTMLエスケープ、時間フォーマット)
    ├── api.js     … バックエンドへの共通fetchラッパー、接続設定の保存
    ├── state.js   … グローバルなアプリ状態(選択中ファイル等)
    ├── files.js   … ファイル添付・プレビュー・D&D・クリップボード貼り付け
    ├── chat.js    … メッセージ送受信・チャットログ描画
    ├── status.js  … ステータス取得・モデル/セッション/チャンネル切り替え
    ├── search.js  … Web検索UI
    ├── sidebar.js … サイドバー開閉・モバイル用UI制御
    └── main.js    … 初期化(イベント登録、ポーリング開始)
```

依存ライブラリはCDN経由（`marked.js` でMarkdown描画、`DOMPurify` でサニタイズ）のみで、npm等のパッケージ管理・ビルドステップは無し。

## 動かし方

### ローカルで試す

```bash
cd web_frontend
python3 -m http.server 8080
```

`http://localhost:8080` を開き、画面左上の「接続」欄に以下を入力して保存する。

- **APIのURL**: discord_ai_bot のWeb APIのURL（例: `http://localhost:3000`。ローカルでバックエンドも動かしている場合）
- **APIトークン**: discord_ai_bot 側の`.env`にある`WEB_API_TOKEN`と同じ値

値は `localStorage` に保存され、次回アクセス時も保持される。

### 本番公開

静的ファイル配信ができれば何でもよい。既存構成（Caddy）に合わせる場合の例:

```
web.example.com {
    root * /path/to/web_frontend
    file_server
}
```

バックエンド（discord_ai_bot）側は、`.env` の `WEB_ORIGIN` にこのフロントエンドの公開URLを設定しておく必要がある（CORS許可のため）。

```
WEB_ORIGIN=https://web.example.com
```

## 注意事項

- `APIトークン` は `localStorage` に平文で保存される。自分専用利用が前提の設計であり、共有PCや信頼できない環境では使わないこと
- 初回接続時は「同期チャンネル」欄でDiscordのチャンネルIDを指定する。未指定（`0`）のままだと「Web単独」のセッションとして動作し、Discord側の会話とは別の履歴になる
- バックエンド側の詳しい挙動（各APIの仕様、既知の制約など）は discord_ai_bot リポジトリの `docs/web_api.md` を参照

詳しい実装解説・今後の機能拡張の指針は `docs/technical_guide.md` を参照。
