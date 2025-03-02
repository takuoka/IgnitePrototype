/**
 * メインイベントハンドラー
 * 
 * 複数のイベントハンドラーを組み合わせて、イベントデータを処理します。
 */

import type { StreamingEventData } from '@/types';
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult, type EventHandlerState, type IEventHandler } from './baseEventHandler';
import { TextChunkEventHandler } from './textChunkEventHandler';
import { NodeStartedEventHandler } from './nodeStartedEventHandler';
import { NodeFinishedEventHandler } from './nodeFinishedEventHandler';
import { WorkflowFinishedEventHandler } from './workflowFinishedEventHandler';

/**
 * メインイベントハンドラー
 */
export class MainEventHandler extends BaseEventHandler {
  private readonly handlers: IEventHandler[];
  private readonly nodeStartedHandler: NodeStartedEventHandler;
  private readonly workflowFinishedHandler: WorkflowFinishedEventHandler;
  private state: EventHandlerState = { accumulatedText: '', lastContent: '' };
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    super(options);
    
    // 特定のハンドラーへの参照を保持
    this.nodeStartedHandler = new NodeStartedEventHandler(options);
    this.workflowFinishedHandler = new WorkflowFinishedEventHandler(options);
    
    // 各種ハンドラーを初期化
    this.handlers = [
      this.nodeStartedHandler,
      new TextChunkEventHandler(options, this.nodeStartedHandler),
      new NodeFinishedEventHandler(options),
      this.workflowFinishedHandler
    ];
  }
  
  /**
   * セッションをリセットする
   * 新しいセッションが開始されたときに呼び出す
   */
  public resetSession(): void {
    // 状態をリセット
    this.state = { accumulatedText: '', lastContent: '' };
    
    // WorkflowFinishedEventHandlerのセッションをリセット
    this.workflowFinishedHandler.resetSession();
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
   * @param state - 現在の状態
   * @returns 処理結果
   */
  handle(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    state: EventHandlerState
  ): EventHandlerResult {
    // 処理可能なハンドラーを探す
    for (const handler of this.handlers) {
      if (handler.canHandle(eventData)) {
        // ハンドラーに処理を委譲
        const result = handler.handle(eventData, onChunk, state);
        if (result.handled) {
          return result;
        }
      }
    }
    
    // 処理できるハンドラーがない場合
    return {
      state,
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
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): { accumulatedText: string; lastContent: string } {
    // 状態を更新
    this.state = { 
      accumulatedText: accumulatedText || this.state.accumulatedText,
      lastContent: lastContent || this.state.lastContent
    };
    
    // イベントを処理
    const result = this.handle(eventData, onChunk, this.state);
    
    // 状態を更新
    this.state = result.state;
    
    // 旧インターフェース互換の結果を返す
    return {
      accumulatedText: this.state.accumulatedText,
      lastContent: this.state.lastContent
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
