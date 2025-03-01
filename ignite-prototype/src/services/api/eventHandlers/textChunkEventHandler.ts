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
  // 前回のチャンクを保持する変数
  private previousChunk: string = '';
  
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
   * 見出し記号で終わるテキストかどうかを判定
   * @param text - テキスト
   * @returns 見出し記号で終わるかどうか
   */
  private endsWithHeadingMarker(text: string): boolean {
    // 行末または文字列末尾の見出し記号を検出
    return /#{1,6}$/.test(text.trim());
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
    let text = (eventData as TextChunkEvent).data.text;
    
    // 前回のチャンクが見出し記号で終わっていた場合、現在のチャンクの先頭にスペースを挿入
    if (this.previousChunk && this.endsWithHeadingMarker(this.previousChunk) && text.trim() && !text.startsWith(' ')) {
      if (this.debug) {
        console.log(`🔍 [TextChunkEventHandler] 見出し記号の後にスペースを挿入: "${this.previousChunk}" + " " + "${text}"`);
      }
      text = ' ' + text;
    }
    
    // 改行のみのチャンクも処理するように条件を変更
    if (text && (text.trim() || text.includes('\n')) && text.trim().toLowerCase() !== 'stop') {
      // 現在のチャンクを保存
      this.previousChunk = text;
      
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
