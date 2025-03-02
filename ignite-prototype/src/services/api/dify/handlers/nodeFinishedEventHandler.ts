/**
 * ノード完了イベントハンドラー
 * 
 * node_finishedイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, NodeFinishedEvent } from '@/types';
import { BaseEventHandler } from '../../stream/baseEventHandler';
import { RESULT_KEYS } from '../../constants';
import type { EventHandlerOptions, EventHandlerResult, EventHandlerState } from '@/types/api';

/**
 * ノード完了イベントハンドラー
 */
export class NodeFinishedEventHandler extends BaseEventHandler {
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
    return eventData.event === 'node_finished';
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
    const nodeData = (eventData as NodeFinishedEvent).data;
    const nodeId = nodeData.node_id;
    const nodeType = nodeData.node_type;
    const outputs = nodeData.outputs || {};
    
    this.log(`ノード完了: ${nodeId} (タイプ: ${nodeType})`);
    
    // ノードタイプに基づいてイベントタイプを決定
    const eventType = nodeType === 'llm' ? 'node_llm' : 'node_other';
    
    // 結果を抽出
    const result = this.extractResult(outputs);
    
    if (result) {
      // JSONとして送信
      const chunk = JSON.stringify({
        type: eventType,
        content: result
      });
      
      const isWorkflowCompletion = false;
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
    }
    
    return {
      state,
      handled: true
    };
  }
  
  /**
   * 出力から結果を抽出
   * @param outputs - 出力オブジェクト
   * @returns 抽出された結果
   */
  private extractResult(outputs: Record<string, any>): string | null {
    // 結果キーに基づいて結果を抽出
    for (const key of RESULT_KEYS) {
      if (key in outputs && outputs[key]) {
        return outputs[key];
      }
    }
    
    return null;
  }
}

/**
 * デフォルトのノード完了イベントハンドラーインスタンスを作成
 * @param options - イベントハンドラーオプション
 * @returns NodeFinishedEventHandler インスタンス
 */
export function createNodeFinishedEventHandler(options: EventHandlerOptions = {}): NodeFinishedEventHandler {
  return new NodeFinishedEventHandler(options);
}
