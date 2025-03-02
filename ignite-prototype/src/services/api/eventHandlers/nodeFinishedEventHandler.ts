/**
 * ノード完了イベントハンドラー
 * 
 * node_finishedイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, NodeFinishedEvent } from '@/types';
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult } from './baseEventHandler';

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
    
    if (this.debug) {
      console.log('🔧 [NodeFinishedEventHandler] ハンドラー初期化完了');
    }
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
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果
   */
  handle(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult {
    const nodeData = (eventData as NodeFinishedEvent).data;
    const text = nodeData.outputs.text;
    
    // ノード完了イベントはノード出力として扱う（ワークフロー完了ではない）
    const isNodeOutput = true;
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
      
      const sent = this.sendChunk(chunk, isWorkflowCompletion, onChunk, lastContent);
      
      return {
        // ノード出力なので累積テキストは維持
        accumulatedText: accumulatedText,
        lastContent: sent ? chunk : lastContent,
        handled: true
      };
    }
    
    return {
      accumulatedText,
      lastContent,
      handled: true
    };
  }
}
