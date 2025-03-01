/**
 * テキストチャンクイベントハンドラー
 * 
 * text_chunkイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, TextChunkEvent } from '@/types';
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult } from './baseEventHandler';

/**
 * テキストチャンクイベントハンドラー
 */
export class TextChunkEventHandler extends BaseEventHandler {
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    super(options);
    
    if (this.debug) {
      console.log('🔧 [TextChunkEventHandler] ハンドラー初期化完了');
    }
  }
  
  /**
   * イベントを処理できるかどうかを判定
   * @param eventData - イベントデータ
   * @returns 処理可能かどうか
   */
  canHandle(eventData: StreamingEventData): boolean {
    return eventData.event === 'text_chunk' && !!(eventData as TextChunkEvent).data?.text;
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
    const text = (eventData as TextChunkEvent).data.text;
    
    // 改行のみのチャンクも処理するように条件を変更
    if (text && (text.trim() || text.includes('\n')) && text.trim().toLowerCase() !== 'stop') {
      const sent = this.sendChunk(text, false, onChunk, lastContent);
      
      return {
        accumulatedText: sent ? accumulatedText + text : accumulatedText,
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
