/**
 * ノード完了イベントハンドラー
 * 
 * node_finishedイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, NodeFinishedEvent } from '@/types';
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult, type EventHandlerState } from './baseEventHandler';

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
    return eventData.event === 'node_finished' && 
           !!(eventData as NodeFinishedEvent).data?.outputs?.text;
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
    const text = nodeData.outputs.text;
    
    // ノード完了イベントはノード出力として扱う（ワークフロー完了ではない）
    const isWorkflowCompletion = false;
    
    // 改行のみのテキストも処理するように条件を変更
    if (text && (text.trim() || text.includes('\n'))) {
      // ノードタイプに応じてチャンクタイプを設定
      const chunkType = nodeData.node_type === 'llm' ? 'node_llm' : 'node_other';
      
      // JSONとして送信
      const chunk = JSON.stringify({
        type: chunkType,
        content: text
      });
      
      const sent = this.sendChunk(chunk, isWorkflowCompletion, onChunk, state.lastContent);
      
      if (sent) {
        return {
          state: {
            // ノード出力なので累積テキストは維持
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
}
