# Dify API Service

このモジュールは、Dify APIとの通信を担当するサービスです。ストリーミングレスポンスを処理し、イベントベースのアーキテクチャを使用して、さまざまなタイプのイベントを適切に処理します。

## 構造

```
dify/
├── index.ts                      # メインエントリーポイント
├── streamService.ts              # ストリーミングAPI通信処理
├── eventHandlers/                # イベントハンドラー
│   ├── baseEventHandler.ts       # 基本イベントハンドラー
│   ├── eventHandlerFactory.ts    # イベントハンドラーファクトリー
│   ├── textChunkEventHandler.ts  # テキストチャンクイベント処理
│   ├── nodeEventHandler.ts       # ノードイベント処理
│   ├── workflowEventHandler.ts   # ワークフローイベント処理
│   └── genericEventHandler.ts    # 一般イベント処理
└── utils/
    └── logger.ts                 # ロギングユーティリティ
```

## 主要コンポーネント

### StreamService

`streamService.ts`はDify APIへのストリーミングリクエストを処理します。Server-Sent Events (SSE)を使用してストリーミングレスポンスを受信し、適切なイベントハンドラーにイベントを渡します。

### EventHandlers

イベントハンドラーは、異なるタイプのイベントを処理するための戦略パターンを実装しています：

- `BaseEventHandler`: 全てのイベントハンドラーの基本クラス
- `TextChunkEventHandler`: `text_chunk`イベントを処理
- `NodeEventHandler`: `node_finished`イベントを処理
- `WorkflowEventHandler`: `workflow_finished`イベントを処理
- `GenericEventHandler`: その他の一般的なイベントを処理

### EventHandlerFactory

`EventHandlerFactory`は、複数のイベントハンドラーを作成し、それらを組み合わせた複合ハンドラーを提供します。これにより、イベントタイプに応じて適切なハンドラーが自動的に選択されます。

### Logger

`DifyLogger`は、ログレベルに基づいてログ出力を制御するカスタムロガーです。開発環境では詳細なログを出力し、本番環境では最小限のログに制限します。

## 使用方法

```typescript
import { fetchDifyInspirationStream } from '@/services/api/dify';

// ストリーミングAPIを呼び出し
await fetchDifyInspirationStream(
  '歌詞テキスト',
  (chunk, isFinal) => {
    console.log('チャンク受信:', chunk);
    if (isFinal) {
      console.log('最終結果受信');
    }
  }
);
```

## イベント処理フロー

1. `fetchDifyInspirationStream`がDify APIにリクエストを送信
2. SSEストリームからイベントを受信
3. `EventHandlerFactory`が複合イベントハンドラーを作成
4. 各イベントが適切なハンドラーに渡される
5. ハンドラーがイベントを処理し、必要に応じてコールバック関数を呼び出す
6. ストリーム終了時に最終処理が実行される

## エラー処理

エラーは適切にログに記録され、呼び出し元に例外として伝播されます。アプリケーションレベルでこれらの例外をキャッチして適切に処理することが期待されています。
