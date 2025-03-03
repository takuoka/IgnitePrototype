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
# デフォルトのAPI設定
VITE_DIFY_API_KEY=your-default-api-key

# 必要に応じて追加のAPI設定
VITE_DIFY_SIMPLE_API_KEY=your-simple-api-key
VITE_DIFY_DEBUG_API_KEY=your-debug-api-key
# ...その他のAPIキー

# APIのベースURL
VITE_DIFY_API_BASE_URL=https://api.dify.ai/v1
```

3. 開発サーバーの起動:

```bash
npm run dev
```

## 複数APIの使用

このアプリケーションは複数のDify APIを切り替えて使用できます。各APIは異なる入力変数と出力変数を持ち、異なる目的に使用できます。

### 利用可能なAPI

- **default**: 標準的なAPI（すべての入力変数と出力変数をサポート）
- **simple**: シンプルなAPI（入力は `currentLyric` のみ）
- **debug**: デバッグ用API（デバッグ情報を含む出力を提供）
- **multi-output**: 複数の出力変数をサポートするAPI
- **multi-io**: 複数の入力変数と出力変数をサポートするAPI
- **lite**: 軽量版API（最小限の入出力をサポート）

### APIの追加方法

新しいAPIを追加するには、以下の手順に従います：

1. `.env.local`ファイルに新しいAPIキーを追加:

```
VITE_DIFY_NEW_API_KEY=your-new-api-key
```

2. `src/services/api/core/apiRegistry.ts`ファイルに新しいAPI定義を追加:

```typescript
apiRegistry.registerApi({
  name: 'new-api',
  apiKeyEnvName: 'VITE_DIFY_NEW_API_KEY',
  validInputVariables: ['currentLyric', 'favorite_lyrics'],
  outputVariables: ['advice', 'words']
});
```


## コード構造

### コンポーネント

- `App.vue`: メインアプリケーションコンポーネント
- `LyricsEditor.vue`: 歌詞入力用エディタ
- `InspirationPanel.vue`: AIインスピレーション表示パネル（API選択機能を含む）

### サービス

- `services/api/core/`: APIコア機能
  - `apiClient.ts`: 基本的なAPIクライアント
  - `apiConfig.ts`: API設定
  - `apiRegistry.ts`: 複数のAPI定義を管理するレジストリ

- `services/api/dify/`: Dify API関連
  - `difyClient.ts`: Dify APIクライアント
  - `difyService.ts`: Dify APIサービス
  - `difyStreamProcessor.ts`: ストリーミングレスポンス処理

- `services/api/stream/`: ストリーミング処理
  - `streamParser.ts`: ストリームデータの解析
  - `streamProcessor.ts`: ストリーム処理
  - `eventHandlerRegistry.ts`: イベントハンドラー管理

### 型定義

- `types/index.ts`: アプリケーション全体で使用される型定義
- `types/api.ts`: API関連の型定義
- `types/inspiration.ts`: インスピレーション関連の型定義

### ユーティリティ

- `errorHandler.ts`: エラー処理のためのユーティリティ関数

### スタイル

- `common.css`: 共通スタイル定義

## デプロイ方法

このプロジェクトはGitHub Pagesを使用してデプロイできるように設定されています。

### GitHub Pagesへのデプロイ

1. GitHubリポジトリにプッシュする前に、以下の設定が必要です：

   - GitHub Secretsに環境変数を設定:
     - `VITE_DIFY_API_KEY`: デフォルトのDify APIキー
     - `VITE_DIFY_API_BASE_URL`: Dify APIのベースURL
     - 必要に応じて追加のAPIキー: `VITE_DIFY_SIMPLE_API_KEY`など

2. リポジトリの「Settings」→「Secrets and variables」→「Actions」から、上記のシークレットを追加します。

3. コードをGitHubリポジトリにプッシュすると、GitHub Actionsが自動的にビルドとデプロイを行います。

4. デプロイが完了すると、`https://<ユーザー名>.github.io/IgnitePrototype/` でアプリケーションにアクセスできます。

### 手動デプロイ

ローカルでビルドして手動でデプロイする場合：

1. ビルドを実行:

```bash
npm run build
```

2. `dist`ディレクトリの内容をWebサーバーにアップロードします。

## 注意事項

- このアプリケーションはフロントエンドのみで構成されており、APIキーはクライアントサイドで使用されます。
- 公開リポジトリでは、APIキーを直接コミットしないように注意してください。
- 本番環境では、APIキーの保護のためにプロキシサーバーの使用を検討してください。
