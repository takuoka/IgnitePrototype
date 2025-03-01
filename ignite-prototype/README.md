# Ignite Prototype

歌詞作成のインスピレーションを得るためのアプリケーション。

## プロジェクト構成

```
ignite-prototype/
├── src/
│   ├── assets/         # 静的アセット（CSS、画像など）
│   ├── components/     # Vueコンポーネント
│   ├── services/       # APIサービス
│   │   └── api/        # API関連のサービス
│   ├── styles/         # 共通スタイル
│   ├── types/          # 型定義
│   └── utils/          # ユーティリティ関数
├── public/             # 公開ディレクトリ
└── .env.local          # 環境変数（APIキーなど）
```

## 機能

- 歌詞エディタ: 歌詞を入力・編集できる
- インスピレーションパネル: 入力された歌詞に基づいてAIがインスピレーションを提供

## 技術スタック

- Vue 3 + TypeScript
- Vite
- Dify API (AI機能)

## セットアップ

1. 依存関係のインストール:

```bash
npm install
```

2. 環境変数の設定:

`.env.local`ファイルを作成し、必要なAPI設定を追加:

```
VITE_DIFY_API_KEY=your-api-key
VITE_DIFY_API_BASE_URL=https://api.dify.ai/v1
```

3. 開発サーバーの起動:

```bash
npm run dev
```

## コード構造

### コンポーネント

- `App.vue`: メインアプリケーションコンポーネント
- `LyricsEditor.vue`: 歌詞入力用エディタ
- `InspirationPanel.vue`: AIインスピレーション表示パネル

### サービス

- `difyService.ts`: Dify APIとの通信を担当

### 型定義

- `types/index.ts`: アプリケーション全体で使用される型定義

### ユーティリティ

- `errorHandler.ts`: エラー処理のためのユーティリティ関数

### スタイル

- `common.css`: 共通スタイル定義
