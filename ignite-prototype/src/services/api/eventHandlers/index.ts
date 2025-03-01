/**
 * イベントハンドラーのエントリーポイント
 * 
 * 各種イベントハンドラーをエクスポートします。
 */

export * from './baseEventHandler';
export * from './contentFilter';
export * from './textChunkEventHandler';
export * from './nodeFinishedEventHandler';
export * from './workflowFinishedEventHandler';

// 後方互換性のために特定の要素を再エクスポート
export { DifyContentFilter } from './contentFilter';

// MainEventHandlerの定義
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult, type IEventHandler } from './baseEventHandler';
import { TextChunkEventHandler } from './textChunkEventHandler';
import { NodeFinishedEventHandler } from './nodeFinishedEventHandler';
import { WorkflowFinishedEventHandler } from './workflowFinishedEventHandler';
import type { StreamingEventData } from '@/types';

/**
 * メインイベントハンドラー
 */
export class MainEventHandler extends BaseEventHandler {
  private readonly handlers: IEventHandler[];
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    super(options);
    
    // 各種ハンドラーを初期化
    this.handlers = [
      new TextChunkEventHandler(options),
      new NodeFinishedEventHandler(options),
      new WorkflowFinishedEventHandler(options)
    ];
    
    if (this.debug) {
      console.log('🔧 [MainEventHandler] ハンドラー初期化完了');
    }
  }
  
  /**
   * イベントを処理できるかどうかを判定
   * @param eventData - イベントデータ
   * @returns 処理可能かどうか
   */
  canHandle(eventData: StreamingEventData): boolean {
    // いずれかのハンドラーが処理できればOK
    return this.handlers.some(handler => handler.canHandle(eventData));
  }
  
  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果
   */
  handle(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult {
    // 処理可能なハンドラーを探す
    for (const handler of this.handlers) {
      if (handler.canHandle(eventData)) {
        if (this.debug) {
          console.log(`🔄 [MainEventHandler] イベント "${eventData.event}" を ${handler.constructor.name} で処理`);
        }
        
        // ハンドラーに処理を委譲
        return handler.handle(eventData, onChunk, accumulatedText, lastContent);
      }
    }
    
    // 処理できるハンドラーがない場合
    if (this.debug) {
      console.log(`⚠️ [MainEventHandler] イベント "${eventData.event}" を処理できるハンドラーがありません`);
    }
    
    return {
      accumulatedText,
      lastContent,
      handled: false
    };
  }
  
  /**
   * イベントデータを処理する（旧インターフェース互換用）
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果（累積テキストと最後のコンテンツ）
   */
  handleEvent(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): { accumulatedText: string; lastContent: string } {
    const result = this.handle(eventData, onChunk, accumulatedText, lastContent);
    return {
      accumulatedText: result.accumulatedText,
      lastContent: result.lastContent
    };
  }
}

/**
 * デフォルトのメインイベントハンドラーインスタンスを作成
 * @param options - イベントハンドラーオプション
 * @returns MainEventHandler インスタンス
 */
export function createEventHandler(options: EventHandlerOptions = {}): MainEventHandler {
  return new MainEventHandler(options);
}
