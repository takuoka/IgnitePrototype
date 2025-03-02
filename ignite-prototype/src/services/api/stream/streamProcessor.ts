/**
 * ストリームプロセッサ
 * 
 * ストリームデータを処理する機能を提供します。
 */

import { logError } from '@/utils/errorHandler';
import { createStreamParser } from './streamParser';
import { createEventHandlerRegistry } from './eventHandlerRegistry';
import type { 
  StreamProcessor, 
  StreamProcessorOptions, 
  StreamParser, 
  EventHandlerRegistry,
  EventHandlerState
} from '@/types/api';

/**
 * 基本的なストリームプロセッサ実装
 */
export class BaseStreamProcessor implements StreamProcessor {
  private readonly streamParser: StreamParser;
  private readonly eventHandlerRegistry: EventHandlerRegistry;
  private readonly debug: boolean;
  private state: EventHandlerState = { accumulatedText: '', lastContent: '' };
  
  /**
   * コンストラクタ
   * @param options - ストリーム処理オプション
   * @param streamParser - ストリームパーサー
   * @param eventHandlerRegistry - イベントハンドラーレジストリ
   */
  constructor(
    options: StreamProcessorOptions = {},
    streamParser?: StreamParser,
    eventHandlerRegistry?: EventHandlerRegistry
  ) {
    this.debug = options.debug || false;
    this.streamParser = streamParser || createStreamParser(options);
    this.eventHandlerRegistry = eventHandlerRegistry || createEventHandlerRegistry(options);
    
    if (this.debug) {
      console.log('🔧 [StreamProcessor] プロセッサ初期化完了');
    }
  }
  
  /**
   * イベントハンドラーレジストリを取得
   * @returns イベントハンドラーレジストリ
   */
  getEventHandlerRegistry(): EventHandlerRegistry {
    return this.eventHandlerRegistry;
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
    // セッションをリセット
    this.resetSession();
    
    try {
      // ストリーミングデータを逐次読み取る
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // ストリーム終了時に累積テキストがあれば送信
          if (this.state.accumulatedText) {
            const completionChunk = JSON.stringify({
              type: 'completion',
              content: this.state.accumulatedText
            });
            onChunk(completionChunk, true);
          }
          
          if (this.debug) {
            console.log('✅ [StreamProcessor] ストリーム処理完了');
          }
          
          break;
        }
        
        // ストリームデータを解析して各イベントを処理
        const events = this.streamParser.parseChunk(value);
        
        if (this.debug && events.length > 0) {
          console.log(`🔍 [StreamProcessor] ${events.length}件のイベントを解析`);
        }
        
        for (const eventData of events) {
          const result = this.eventHandlerRegistry.handleEvent(
            eventData, 
            onChunk, 
            this.state
          );
          
          // 状態を更新
          this.state = result.state;
        }
      }
    } catch (error) {
      console.error('❌ [StreamProcessor] ストリーム処理エラー:', error);
      logError('StreamProcessor', error);
      throw error;
    }
  }
  
  /**
   * セッションをリセットする
   */
  private resetSession(): void {
    // 状態をリセット
    this.state = { accumulatedText: '', lastContent: '' };
    
    // イベントハンドラーレジストリのセッションをリセット
    this.eventHandlerRegistry.resetSession();
    
    if (this.debug) {
      console.log('🔄 [StreamProcessor] セッションリセット');
    }
  }
}

/**
 * デフォルトのストリームプロセッサインスタンスを作成
 * @param options - ストリーム処理オプション
 * @returns StreamProcessor インスタンス
 */
export function createStreamProcessor(options: StreamProcessorOptions = {}): BaseStreamProcessor {
  return new BaseStreamProcessor(options);
}
