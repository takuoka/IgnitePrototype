/**
 * Dify API イベントハンドラー
 * 
 * Dify APIから返されるイベントデータを処理する機能を提供します。
 * このファイルは後方互換性のために残されています。
 * 新しい実装は eventHandlers/ ディレクトリを参照してください。
 */

import type { StreamingEventData } from '@/types';
import { 
  createEventHandler as createMainEventHandler,
  type EventHandlerOptions,
  MainEventHandler
} from './eventHandlers';

/**
 * イベントハンドラーインターフェース
 */
export interface EventHandler {
  /**
   * イベントデータを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果（累積テキストと最後のコンテンツ）
   */
  handleEvent(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): { accumulatedText: string; lastContent: string };
  
  /**
   * セッションをリセットする
   * 新しいセッションが開始されたときに呼び出す
   */
  resetSession?(): void;
}

/**
 * Difyイベントハンドラー実装
 * 後方互換性のためにMainEventHandlerをラップします
 */
export class DifyEventHandler implements EventHandler {
  private readonly mainHandler: MainEventHandler;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    this.mainHandler = createMainEventHandler(options);
  }
  
  /**
   * イベントデータを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果（累積テキストと最後のコンテンツ）
   */
  handleEvent(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): { accumulatedText: string; lastContent: string } {
    return this.mainHandler.handleEvent(eventData, onChunk, accumulatedText, lastContent);
  }
  
  /**
   * セッションをリセットする
   * 新しいセッションが開始されたときに呼び出す
   */
  resetSession(): void {
    this.mainHandler.resetSession();
  }
}

/**
 * デフォルトのDifyイベントハンドラーインスタンスを作成
 * @param options - イベントハンドラーオプション
 * @returns EventHandler インスタンス
 */
export function createEventHandler(options: EventHandlerOptions = {}): EventHandler {
  return new DifyEventHandler(options);
}

// 後方互換性のために型をエクスポート
export type { EventHandlerOptions } from './eventHandlers';
export type { ContentFilter } from './eventHandlers';
