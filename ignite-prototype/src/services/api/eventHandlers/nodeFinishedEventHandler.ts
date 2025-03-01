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
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult {
    const nodeData = (eventData as NodeFinishedEvent).data;
    const text = nodeData.outputs.text;
    
    // LLMノードの場合は最終結果として扱う
    const isFinal = nodeData.node_type === 'llm';
    
    // 改行のみのテキストも処理するように条件を変更
    if (text && (text.trim() || text.includes('\n'))) {
      const sent = this.sendChunk(text, isFinal, onChunk, lastContent);
      
      return {
        // 最終結果の場合は累積テキストをリセット
        accumulatedText: isFinal ? '' : accumulatedText,
        lastContent: sent ? text : lastContent,
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
