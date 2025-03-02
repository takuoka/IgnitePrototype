/**
 * Dify API ストリーム処理
 * 
 * Dify APIから返されるストリームデータを処理する機能を提供します。
 */

import { logError } from '@/utils/errorHandler';
import { createStreamParser, type StreamParser } from './difyStreamParser';
import { createEventHandler, type EventHandler } from './difyEventHandler';

/**
 * ストリーム処理オプション
 */
export interface StreamProcessorOptions {
  /**
   * デバッグモードを有効にするかどうか
   */
  debug?: boolean;
}

/**
 * ストリームプロセッサインターフェース
 */
export interface StreamProcessor {
  /**
   * ストリームを処理する
   * @param reader - ReadableStreamDefaultReader
   * @param onChunk - チャンク受信時のコールバック関数
   */
  processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void
  ): Promise<void>;
}

/**
 * Difyストリームプロセッサ実装
 */
export class DifyStreamProcessor implements StreamProcessor {
  private readonly streamParser: StreamParser;
  private readonly eventHandler: EventHandler;
  
  /**
   * コンストラクタ
   * @param options - ストリーム処理オプション
   * @param streamParser - ストリームパーサー
   * @param eventHandler - イベントハンドラー
   */
  constructor(
    private readonly options: StreamProcessorOptions = {},
    streamParser?: StreamParser,
    eventHandler?: EventHandler
  ) {
    this.streamParser = streamParser || createStreamParser(options);
    this.eventHandler = eventHandler || createEventHandler(options);
  }
  
  /**
   * ストリームを処理する
   * @param reader - ReadableStreamDefaultReader
   * @param onChunk - チャンク受信時のコールバック関数
   */
  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void
  ): Promise<void> {
    // イベントハンドラーのセッションをリセット
    if (this.eventHandler.resetSession) {
      this.eventHandler.resetSession();
    }
    
    // 状態を追跡
    let accumulatedText = '';
    let lastContent = '';
    
    try {
      // ストリーミングデータを逐次読み取る
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // ストリーム終了時に累積テキストがあれば送信
          if (accumulatedText) {
            const completionChunk = JSON.stringify({
              type: 'completion',
              content: accumulatedText
            });
            onChunk(completionChunk, true);
          }
          break;
        }
        
        // ストリームデータを解析して各イベントを処理
        const events = this.streamParser.parseChunk(value);
        for (const eventData of events) {
          const result = this.eventHandler.handleEvent(eventData, onChunk, accumulatedText, lastContent);
          accumulatedText = result.accumulatedText;
          lastContent = result.lastContent;
        }
      }
    } catch (error) {
      console.error('❌ [DifyStreamProcessor] ストリーム処理エラー:', error);
      logError('DifyStreamProcessor', error);
      throw error;
    }
  }
}

/**
 * デフォルトのDifyストリームプロセッサインスタンスを作成
 * @param options - ストリーム処理オプション
 * @returns StreamProcessor インスタンス
 */
export function createStreamProcessor(options: StreamProcessorOptions = {}): StreamProcessor {
  return new DifyStreamProcessor(options);
}
