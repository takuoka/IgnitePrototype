/**
 * イベントハンドラーレジストリ
 * 
 * 複数のイベントハンドラーを登録して管理する機能を提供します。
 */

import type { StreamingEventData } from '@/types';
import type { 
  EventHandler, 
  EventHandlerOptions, 
  EventHandlerRegistry, 
  EventHandlerResult, 
  EventHandlerState 
} from '@/types/api';

/**
 * イベントハンドラーレジストリ実装
 */
export class BaseEventHandlerRegistry implements EventHandlerRegistry {
  private readonly handlers: EventHandler[] = [];
  private readonly debug: boolean;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    this.debug = options.debug || false;
  }
  
  /**
   * イベントハンドラーを登録する
   * @param handler - イベントハンドラー
   */
  registerHandler(handler: EventHandler): void {
    this.handlers.push(handler);
    
    if (this.debug) {
      console.log(`🔧 [EventHandlerRegistry] ハンドラー登録: ${handler.constructor.name}`);
    }
  }
  
  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param state - 現在の状態
   * @returns 処理結果
   */
  handleEvent(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    state: EventHandlerState
  ): EventHandlerResult {
    // 処理可能なハンドラーを探す
    for (const handler of this.handlers) {
      if (handler.canHandle(eventData)) {
        if (this.debug) {
          console.log(`🔍 [EventHandlerRegistry] イベント処理: ${eventData.event} by ${handler.constructor.name}`);
        }
        
        // ハンドラーに処理を委譲
        const result = handler.handle(eventData, onChunk, state);
        if (result.handled) {
          return result;
        }
      }
    }
    
    // 処理できるハンドラーがない場合
    if (this.debug) {
      console.log(`⚠️ [EventHandlerRegistry] 未処理イベント: ${eventData.event}`);
    }
    
    return {
      state,
      handled: false
    };
  }
  
  /**
   * セッションをリセットする
   */
  resetSession(): void {
    // 各ハンドラーのセッションをリセット
    for (const handler of this.handlers) {
      if (handler.resetSession) {
        handler.resetSession();
      }
    }
    
    if (this.debug) {
      console.log('🔄 [EventHandlerRegistry] セッションリセット');
    }
  }
}

/**
 * デフォルトのイベントハンドラーレジストリインスタンスを作成
 * @param options - イベントハンドラーオプション
 * @returns EventHandlerRegistry インスタンス
 */
export function createEventHandlerRegistry(options: EventHandlerOptions = {}): EventHandlerRegistry {
  return new BaseEventHandlerRegistry(options);
}
