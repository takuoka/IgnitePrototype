/**
 * ワークフロー完了イベントハンドラー
 * 
 * workflow_finishedイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, WorkflowFinishedEvent, WorkflowOutputs } from '@/types';
import { BaseEventHandler } from '../../stream/baseEventHandler';
import { VARIABLE_NAMES } from '../../constants';
import type { EventHandlerOptions, EventHandlerResult, EventHandlerState } from '@/types/api';

/**
 * ワークフロー完了イベントハンドラー
 */
export class WorkflowFinishedEventHandler extends BaseEventHandler {
  // 最後に処理したワークフローID
  private lastWorkflowId: string | null = null;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    super(options);
  }
  
  /**
   * イベントを処理できるかどうかを判定
   * @param eventData - イベントデータ
   * @returns 処理可能かどうか
   */
  canHandle(eventData: StreamingEventData): boolean {
    return eventData.event === 'workflow_finished';
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
    const workflowData = (eventData as WorkflowFinishedEvent).data;
    const workflowId = workflowData.id || eventData.workflow_run_id || 'unknown';
    const outputs = workflowData.outputs || {};
    
    // 同じワークフローIDのイベントを重複して処理しないようにする
    if (this.lastWorkflowId === workflowId) {
      this.log(`ワークフロー完了イベントを重複検出: ${workflowId}`);
      return {
        state,
        handled: true
      };
    }
    
    this.lastWorkflowId = workflowId;
    this.log(`ワークフロー完了: ${workflowId}`);
    
    // 出力を処理
    const workflowOutputs = this.processOutputs(outputs);
    
    // JSONとして送信
    const chunk = JSON.stringify({
      type: 'workflow_outputs',
      content: workflowOutputs
    });
    
    const isWorkflowCompletion = true;
    const sent = this.sendChunk(chunk, isWorkflowCompletion, onChunk, state.lastContent);
    
    if (sent) {
      return {
        state: {
          accumulatedText: state.accumulatedText,
          lastContent: chunk
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
   * 出力を処理
   * @param outputs - 出力オブジェクト
   * @returns 処理された出力
   */
  private processOutputs(outputs: Record<string, any>): WorkflowOutputs {
    const result: WorkflowOutputs = {};
    
    // 変数名に基づいて出力を抽出
    for (const varName of VARIABLE_NAMES) {
      if (varName in outputs && outputs[varName]) {
        result[varName] = outputs[varName];
      }
    }
    
    return result;
  }
  
  /**
   * セッションをリセットする
   */
  resetSession(): void {
    this.lastWorkflowId = null;
    this.log('セッションリセット');
  }
}

/**
 * デフォルトのワークフロー完了イベントハンドラーインスタンスを作成
 * @param options - イベントハンドラーオプション
 * @returns WorkflowFinishedEventHandler インスタンス
 */
export function createWorkflowFinishedEventHandler(options: EventHandlerOptions = {}): WorkflowFinishedEventHandler {
  return new WorkflowFinishedEventHandler(options);
}
