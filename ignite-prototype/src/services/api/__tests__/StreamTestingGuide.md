# Stream通信を模したテスト実装ガイド

このドキュメントでは、`sample_stream_data_short.txt`を使用してリアルなStream通信を模したテストの実装方法について説明します。

## 概要

Stream通信のテストでは、実際のAPIから返されるデータストリームを模倣する必要があります。このガイドでは、サンプルデータを使用してStream通信をシミュレートする方法を説明します。

## テスト実装の基本的な流れ

1. サンプルデータの準備
2. サンプルデータからReadableStreamを作成
3. StreamParserでデータを解析
4. StreamProcessorでデータを処理
5. テストケースの作成と検証

## 詳細な実装方法

### 1. サンプルデータの準備

実際のStream通信のデータを`sample_stream_data_short.txt`などのファイルに保存します。このファイルには、実際のAPIレスポンスと同じ形式のデータが含まれています。

例：
```
data: {"event": "workflow_started", "workflow_run_id": "f9680566-7141-483e-9b67-9e8132c45960", ...}

data: {"event": "node_started", "workflow_run_id": "f9680566-7141-483e-9b67-9e8132c45960", ...}

event: ping

data: {"event": "text_chunk", "workflow_run_id": "f9680566-7141-483e-9b67-9e8132c45960", ...}
```

### 2. サンプルデータからReadableStreamを作成

`mockStreamUtils.ts`を使用して、サンプルデータからReadableStreamを作成します。

```typescript
// サンプルデータからReadableStreamを作成する関数
export function createMockStreamFromSample(
  sampleFilePath: string = path.join(__dirname, 'sample_stream_data_short.txt')
): ReadableStream<Uint8Array> {
  // サンプルデータを読み込む
  const sampleData = fs.readFileSync(sampleFilePath, 'utf-8');
  
  // データを行ごとに分割
  const lines = sampleData.split('\n');
  
  // ReadableStreamを作成
  return new ReadableStream({
    async start(controller) {
      // 各行を順番に処理
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue // 空行はスキップ
        
        // 行をUint8Arrayに変換してコントローラーに送信
        const encoder = new TextEncoder();
        
        // イベントの終了を判断する
        // 次の行が空行または次の行が新しいイベントの開始または最後の行の場合、現在の行は完全なイベント
        const isCompleteEvent = 
          i === lines.length - 1 || 
          lines[i + 1].trim() === '' || 
          lines[i + 1].startsWith('data:') || 
          lines[i + 1].startsWith('event:');
        
        // イベントの終了には \n\n を追加
        const lineEnding = isCompleteEvent ? '\n\n' : '\n';
        const chunk = encoder.encode(line + lineEnding);
        controller.enqueue(chunk);
        
        // 実際のストリーミングをシミュレートするために少し待機
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // ストリームの終了
      controller.close();
    }
  });
}
```

### 3. StreamParserでデータを解析

DifyStreamParserを使用して、ReadableStreamから読み取ったデータを解析します。

```typescript
// テストコード例
it('DifyStreamParserでサンプルデータを解析できること', async () => {
  const parser = createStreamParser();
  const reader = createMockStreamReaderFromSample();
  
  // 最初のチャンクを読み取り
  const { value } = await reader.read();
  
  // valueが存在することを確認
  expect(value).toBeDefined();
  if (!value) return;
  
  // パーサーでチャンクを解析
  const events = parser.parseChunk(value);
  
  // イベントが解析されていることを確認
  expect(events).toBeDefined();
  expect(Array.isArray(events)).toBe(true);
  
  // 少なくとも1つのイベントが解析されていることを確認
  expect(events.length).toBeGreaterThan(0);
  
  // イベントの形式を確認
  const event = events[0];
  expect(event).toHaveProperty('event');
  expect(event).toHaveProperty('data');
});
```

### 4. StreamProcessorでデータを処理

DifyStreamProcessorを使用して、解析されたイベントを処理します。

```typescript
// テストコード例
it('DifyStreamProcessorでサンプルデータを処理できること', async () => {
  // モックの設定
  const onChunkMock = vi.fn();
  const processor = createStreamProcessor();
  const reader = createMockStreamReaderFromSample();
  
  // ストリームを処理
  await processor.processStream(reader, onChunkMock);
  
  // コールバックが呼び出されたことを確認
  expect(onChunkMock).toHaveBeenCalled();
  
  // 複数回呼び出されたことを確認（複数のイベントがあるため）
  expect(onChunkMock.mock.calls.length).toBeGreaterThan(1);
  
  // コールバックの引数を確認
  const firstCallArg = onChunkMock.mock.calls[0][0];
  expect(typeof firstCallArg).toBe('string');
  
  // JSONとしてパース可能であることを確認
  const parsedArg = JSON.parse(firstCallArg);
  expect(parsedArg).toHaveProperty('type');
  expect(parsedArg).toHaveProperty('content');
});
```

### 5. エンドツーエンドのテスト

サンプルデータを使用して、エンドツーエンドのテストを実行します。

```typescript
// テストコード例
it('エンドツーエンドのストリーム処理をシミュレート', async () => {
  // モックの設定
  const onChunkMock = vi.fn();
  const processor = createStreamProcessor();
  const reader = createMockStreamReaderFromSample();
  
  // ストリームを処理
  await processor.processStream(reader, onChunkMock);
  
  // 処理結果を検証
  expect(onChunkMock).toHaveBeenCalled();
  
  // 最後のコールが完了フラグを持っていることを確認
  const lastCall = onChunkMock.mock.calls[onChunkMock.mock.calls.length - 1];
  expect(lastCall[1]).toBe(true); // 完了フラグ
  
  // 最後のコールの内容を確認
  const lastContent = JSON.parse(lastCall[0]);
  expect(lastContent).toHaveProperty('type', 'completion');
});
```

## テスト実装のポイント

1. **イベントの終了判定**: Stream通信では、各イベントは`\n\n`で区切られます。サンプルデータを処理する際には、イベントの終了を正確に判断する必要があります。

2. **遅延のシミュレーション**: 実際のStream通信では、データが少しずつ送信されます。テストでも`setTimeout`を使用して遅延をシミュレートすることで、より実際の通信に近い状態をテストできます。

3. **エラーハンドリング**: 実際の通信では様々なエラーが発生する可能性があります。テストでもエラーケースを考慮することが重要です。

4. **イベントタイプの検証**: サンプルデータには様々なタイプのイベント（workflow_started, node_started, text_chunk など）が含まれています。テストでは、これらのイベントが正しく処理されることを検証します。

## まとめ

サンプルデータを使用したStream通信のテストは、実際のAPIと同じ挙動をシミュレートすることで、アプリケーションの信頼性を向上させることができます。このガイドで説明した方法を使用して、より堅牢なテストを実装してください。
