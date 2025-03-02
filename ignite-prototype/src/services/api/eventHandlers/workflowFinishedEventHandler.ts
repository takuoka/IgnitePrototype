/**
 * ワークフロー完了イベントハンドラー
 * 
 * workflow_finishedイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, WorkflowFinishedEvent } from '@/types';
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult, type EventHandlerState } from './baseEventHandler';
import type { ContentFilter } from './contentFilter';
import { createContentFilter } from './contentFilter';
import { VARIABLE_NAMES } from '../constants';

/**
 * ワークフロー完了イベントハンドラー
 */
export class WorkflowFinishedEventHandler extends BaseEventHandler {
  private readonly contentFilter: ContentFilter;
  // 処理済みのワークフローIDを追跡
  private readonly processedWorkflowIds: Set<string> = new Set();
  // セッションごとに最初のworkflow_finishedイベントのみを処理するためのフラグ
  private hasProcessedWorkflowFinishedInCurrentSession: boolean = false;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   * @param contentFilter - コンテンツフィルター
   */
  constructor(
    options: EventHandlerOptions = {},
    contentFilter: ContentFilter = createContentFilter(options)
  ) {
    super(options);
    this.contentFilter = contentFilter;
  }
  
  /**
   * イベントを処理できるかどうかを判定
   * @param eventData - イベントデータ
   * @returns 処理可能かどうか
   */
  canHandle(eventData: StreamingEventData): boolean {
    return eventData.event === 'workflow_finished' && 
           !!(eventData as WorkflowFinishedEvent).data?.outputs;
  }
  
  /**
   * セッションをリセットする
   * 新しいセッションが開始されたときに呼び出す
   */
  public resetSession(): void {
    this.hasProcessedWorkflowFinishedInCurrentSession = false;
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
    const workflowEvent = eventData as WorkflowFinishedEvent;
    const workflowId = workflowEvent.data.id;
    
    // 既に処理済みのワークフローIDの場合はスキップ
    if (workflowId && this.processedWorkflowIds.has(workflowId)) {
      return {
        state,
        handled: true
      };
    }
    
    // 同一セッション内で既にworkflow_finishedイベントを処理済みの場合はスキップ
    if (this.hasProcessedWorkflowFinishedInCurrentSession) {
      return {
        state,
        handled: true
      };
    }
    
    const outputs = workflowEvent.data.outputs;
    
    // ワークフローIDを処理済みとしてマーク
    if (workflowId) {
      this.processedWorkflowIds.add(workflowId);
    }
    
    // 同一セッション内でworkflow_finishedイベントを処理済みとしてマーク
    this.hasProcessedWorkflowFinishedInCurrentSession = true;
    
    // 新しいフィールド（advice, phrases, words）が存在するか確認
    if (this.hasMultiSectionOutputs(outputs)) {
      return this.handleMultiSectionOutputs(outputs, onChunk, state);
    } else {
      return this.handleLegacyOutputs(outputs, onChunk, state);
    }
  }
  
  /**
   * 複数セクションの出力があるかどうかを判定
   * @param outputs - 出力データ
   * @returns 複数セクションの出力があるかどうか
   */
  private hasMultiSectionOutputs(outputs: Record<string, any>): boolean {
    return VARIABLE_NAMES.some(name => !!outputs[name]);
  }
  
  /**
   * 複数セクションの出力を処理
   * @param outputs - 出力データ
   * @param onChunk - コールバック関数
   * @param state - 現在の状態
   * @returns 処理結果
   */
  private handleMultiSectionOutputs(
    outputs: Record<string, any>,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    state: EventHandlerState
  ): EventHandlerResult {
    // ワークフロー完了イベントはワークフロー完了として扱う
    const isWorkflowCompletion = true;
    
    // 各セクションを一度に送信（ワークフロー完了として）
    const content: Record<string, string> = {};
    
    // 各変数名に対応する出力を設定
    VARIABLE_NAMES.forEach(name => {
      content[name] = outputs[name] || '';
    });
    
    const finalOutputs = {
      type: 'workflow_outputs',
      content
    };
    
    // ワークフロー完了として送信
    const finalChunk = JSON.stringify(finalOutputs);
    
    // 前回と同じ内容でなければ送信
    const sent = this.sendChunk(finalChunk, isWorkflowCompletion, onChunk, state.lastContent);
    
    if (sent) {
      return {
        state: {
          accumulatedText: '',
          lastContent: finalChunk
        },
        handled: true
      };
    }
    
    return {
      state,
      handled: true
    };
  }
  
  /**
   * 従来の出力を処理（後方互換性のため）
   * @param outputs - 出力データ
   * @param onChunk - コールバック関数
   * @param state - 現在の状態
   * @returns 処理結果
   */
  private handleLegacyOutputs(
    outputs: Record<string, any>,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    state: EventHandlerState
  ): EventHandlerResult {
    // ワークフロー完了イベントはワークフロー完了として扱う
    const isWorkflowCompletion = true;
    
    for (const [key, value] of Object.entries(outputs)) {
      // 改行のみのテキストも処理するように条件を変更
      if (typeof value === 'string' && (value.trim() || value.includes('\n')) && !this.contentFilter.shouldIgnoreData(key, value)) {
        const legacyChunk = JSON.stringify({
          type: 'legacy',
          content: value
        });
        
        // 前回と同じ内容でなければ送信
        const sent = this.sendChunk(legacyChunk, isWorkflowCompletion, onChunk, state.lastContent);
        
        if (sent) {
          return {
            state: {
              accumulatedText: '',
              lastContent: legacyChunk
            },
            handled: true
          };
        }
      }
    }
    
    return {
      state,
      handled: true
    };
  }
}
