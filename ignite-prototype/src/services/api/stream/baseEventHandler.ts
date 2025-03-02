/**
 * ベースイベントハンドラー
 * 
 * すべてのイベントハンドラーの基底クラスを提供します。
 */

import type { StreamingEventData } from '@/types';
import type { 
  EventHandler, 
  EventHandlerOptions, 
  EventHandlerResult, 
  EventHandlerState 
} from '@/types/api';

/**
 * ベースイベントハンドラー
 */
export abstract class BaseEventHandler implements EventHandler {
  protected readonly debug: boolean;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    this.debug = options.debug || false;
  }
  
  /**
   * イベントを処理できるかどうかを判定
   * @param eventData - イベントデータ
   * @returns 処理可能かどうか
   */
  abstract canHandle(eventData: StreamingEventData): boolean;
  
  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param state - 現在の状態
   * @returns 処理結果
   */
  abstract handle(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    state: EventHandlerState
  ): EventHandlerResult;
  
  /**
   * チャンクを送信する
   * @param content - 送信するコンテンツ
   * @param isWorkflowCompletion - ワークフロー完了かどうか
   * @param onChunk - コールバック関数
   * @param lastContent - 前回送信したコンテンツ
   * @returns 送信されたかどうか
   */
  protected sendChunk(
    content: string,
    isWorkflowCompletion: boolean,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    lastContent: string
  ): boolean {
    // 重複チェック - 前回と同じ内容なら送信しない
    // 改行のみのチャンクも処理するように条件を変更
    if (content === lastContent || (!content.trim() && !content.includes('\n'))) {
      return false;
    }
    
    onChunk(content, isWorkflowCompletion);
    return true;
  }
  
  /**
   * デバッグログを出力
   * @param message - メッセージ
   * @param data - 追加データ
   */
  protected log(message: string, data?: any): void {
    if (this.debug) {
      if (data) {
        console.log(`🔍 [EventHandler] ${message}`, data);
      } else {
        console.log(`🔍 [EventHandler] ${message}`);
      }
    }
  }
}
