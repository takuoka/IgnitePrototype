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
    onChunk: (chunk: string, isFinal?: boolean) => void
  ): Promise<void>;
}

/**
 * Difyストリームプロセッサ実装
 */
export class DifyStreamProcessor implements StreamProcessor {
  private readonly debug: boolean;
  private readonly streamParser: StreamParser;
  private readonly eventHandler: EventHandler;
  
  /**
   * コンストラクタ
   * @param options - ストリーム処理オプション
   * @param streamParser - ストリームパーサー
   * @param eventHandler - イベントハンドラー
   */
  constructor(
    options: StreamProcessorOptions = {},
    streamParser?: StreamParser,
    eventHandler?: EventHandler
  ) {
    this.debug = options.debug || false;
    this.streamParser = streamParser || createStreamParser(options);
    this.eventHandler = eventHandler || createEventHandler(options);
    
    if (this.debug) {
      console.log('🔧 [DifyStreamProcessor] プロセッサ初期化完了');
    }
  }
  
  /**
   * ストリームを処理する
   * @param reader - ReadableStreamDefaultReader
   * @param onChunk - チャンク受信時のコールバック関数
   */
  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string, isFinal?: boolean) => void
  ): Promise<void> {
    let accumulatedText = '';
    let lastContent = '';
    
    try {
      // ストリーミングデータを逐次読み取る
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // 最後に累積テキストがあれば送信
          // 改行のみのテキストも処理するように条件を変更
          if (accumulatedText && accumulatedText !== lastContent && (accumulatedText.trim() || accumulatedText.includes('\n'))) {
            if (this.debug) {
              console.log(`🏁 [DifyStreamProcessor] ストリーム終了時の累積テキストを最終結果として送信`);
            }
            onChunk(accumulatedText, true);
          }
          break;
        }
        
        // ストリームデータを解析
        const events = this.streamParser.parseChunk(value);
        
        // 各イベントを処理
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
