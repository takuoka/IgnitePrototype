# Ignite Prototype - 歌詞エディタ

歌詞を書くためのWebベースエディタのプロトタイプです。AIからのインスピレーションを受けながら、創造的な歌詞作成をサポートします。

## 機能

- 左ペイン (70%): 歌詞エディタ
  - シンプルで使いやすいテキストエリア
  - リアルタイムな状態管理

- 右ペイン (30%): AIインスピレーション
  - Markdown形式でのアイデア表示
  - 「更新」ボタンでAIからの新しいアイデアを取得

## 技術スタック

- フロントエンド: Vue 3 + TypeScript
- スタイリング: カスタムCSS（ダークモード）
- Markdown: marked.js

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

## 環境変数

バックエンドAPIを使用する場合は、`.env`ファイルを作成し、以下の変数を設定してください：

```env
VITE_API_ENDPOINT=http://your-api-endpoint
```

## バックエンド連携

現在はモックAPIを使用していますが、実際のバックエンドAPIに接続する場合は、`src/components/InspirationPanel.vue`の`fetchDefyMock`関数を実際のAPI呼び出しに置き換えてください。

## 今後の拡張予定

- 実際のDefy APIとの連携
- 追加機能（韻を踏む、国語力UP等）のボタン
- 歌詞の保存＆シェア機能
- レスポンシブデザインの強化
