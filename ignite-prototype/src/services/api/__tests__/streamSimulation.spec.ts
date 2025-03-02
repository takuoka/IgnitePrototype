import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockStreamFromSample, createMockStreamReaderFromSample } from './mockStreamUtils'
import { DifyStreamParser, createStreamParser } from '../difyStreamParser'
import { DifyStreamProcessor, createStreamProcessor } from '../difyStreamProcessor'
import * as difyEventHandler from '../difyEventHandler'
import type { StreamingEventData } from '../../../types'

// difyEventHandlerモジュールをモック化
vi.mock('../difyEventHandler', () => ({
  createEventHandler: vi.fn()
}))

describe('Stream Simulation Tests', () => {
  // モックの設定
  const mockEventHandler = {
    handleEvent: vi.fn().mockImplementation((eventData, onChunk, accumulatedText = '', lastContent = '') => {
      // モックの実装：handleEventが呼ばれたときに適切な戻り値を返す
      // text_chunkイベントの場合は、テキストを累積する
      if (eventData.event === 'text_chunk' && eventData.data?.text) {
        const newAccumulatedText = accumulatedText + eventData.data.text;
        const chunk = JSON.stringify({
          type: 'content',
          content: newAccumulatedText
        });
        onChunk(chunk, false);
        return { accumulatedText: newAccumulatedText, lastContent: chunk };
      }
      // workflow_finishedイベントの場合は、完了フラグをtrueにする
      else if (eventData.event === 'workflow_finished') {
        const chunk = JSON.stringify({
          type: 'completion',
          content: accumulatedText
        });
        onChunk(chunk, true);
        return { accumulatedText, lastContent: chunk };
      }
      // その他のイベントの場合は、現在の状態を維持
      return { accumulatedText, lastContent };
    }),
    resetSession: vi.fn()
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(difyEventHandler.createEventHandler).mockReturnValue(mockEventHandler);
    mockEventHandler.handleEvent.mockClear();
  });
  
  it('サンプルデータからストリームを作成できること', async () => {
    const stream = createMockStreamFromSample();
    expect(stream).toBeDefined();
    expect(stream).toBeInstanceOf(ReadableStream);
  });
  
  it('サンプルデータからストリームリーダーを作成できること', async () => {
    const reader = createMockStreamReaderFromSample();
    expect(reader).toBeDefined();
    expect(reader.read).toBeInstanceOf(Function);
  });
  
  it('ストリームリーダーからデータを読み取れること', async () => {
    const reader = createMockStreamReaderFromSample();
    const { done, value } = await reader.read();
    
    expect(done).toBe(false);
    expect(value).toBeDefined();
    expect(value).toBeInstanceOf(Uint8Array);
    expect(value!.length).toBeGreaterThan(0);
    
    // 最後まで読み取る
    let chunks: Uint8Array[] = [];
    let result;
    do {
      result = await reader.read();
      if (!result.done && result.value) {
        chunks.push(result.value);
      }
    } while (!result.done);
    
    expect(chunks.length).toBeGreaterThan(0);
  });
  
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
    try {
      const parsedArg = JSON.parse(firstCallArg);
      expect(parsedArg).toHaveProperty('type');
      expect(parsedArg).toHaveProperty('content');
    } catch (e) {
      expect.fail('コールバックの引数がJSONとしてパースできません: ' + e);
    }
  });
  
  it('サンプルデータの全イベントタイプを検証', async () => {
    const parser = createStreamParser();
    const reader = createMockStreamReaderFromSample();
    
    // すべてのイベントを収集
    const allEvents: StreamingEventData[] = [];
    let result;
    
    try {
      do {
        result = await reader.read();
        if (!result.done && result.value) {
          const events = parser.parseChunk(result.value);
          allEvents.push(...events);
        }
      } while (!result.done);
      
      // イベントが収集されていることを確認
      expect(allEvents.length).toBeGreaterThan(0);
      
      // イベントタイプの集計
      const eventTypes = new Set(allEvents.map(event => event.event));
      
      // 期待されるイベントタイプが含まれていることを確認
      expect(eventTypes.has('workflow_started')).toBe(true);
      expect(eventTypes.has('node_started')).toBe(true);
      expect(eventTypes.has('node_finished')).toBe(true);
      expect(eventTypes.has('text_chunk')).toBe(true);
      
      // イベントの内容を確認
      const workflowStartedEvent = allEvents.find(e => e.event === 'workflow_started');
      expect(workflowStartedEvent).toBeDefined();
      expect(workflowStartedEvent?.data?.id).toBeDefined();
      
      const textChunkEvent = allEvents.find(e => e.event === 'text_chunk');
      expect(textChunkEvent).toBeDefined();
      expect(textChunkEvent?.data?.text).toBeDefined();
    } catch (e) {
      console.error('テスト実行中にエラーが発生しました:', e);
      throw e;
    }
  });
  
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
    const lastCallIndex = onChunkMock.mock.calls.length - 1;
    expect(lastCallIndex).toBeGreaterThanOrEqual(0);
    
    if (lastCallIndex >= 0) {
      const lastCall = onChunkMock.mock.calls[lastCallIndex];
      expect(lastCall[1]).toBe(true); // 完了フラグ
      
      // 最後のコールの内容を確認
      try {
        const lastContent = JSON.parse(lastCall[0]);
        expect(lastContent).toHaveProperty('type');
        expect(lastContent.type).toBe('completion');
      } catch (e) {
        expect.fail('最後のコールの内容がJSONとしてパースできません: ' + e);
      }
    }
  });
});
