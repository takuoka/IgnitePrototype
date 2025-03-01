/**
 * Text Chunk Event Handler
 * 
 * Handles text_chunk events from Dify API
 */

import type { StreamingEventData, TextChunkEvent } from '@/types';
import { BaseEventHandler } from './baseEventHandler';

/**
 * テキストチャンクイベントハンドラークラス
 */
export class TextChunkEventHandler extends BaseEventHandler {
  /**
   * コンストラクタ
   * @param callback - チャンク受信時のコールバック関数
   */
  constructor(callback: (chunk: string, isFinal?: boolean) => void) {
    super(callback, 'TextChunkHandler');
  }

  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   */
  async processEvent(eventData: StreamingEventData): Promise<void> {
    // 無視すべきイベントをスキップ
    if (this.shouldSkipEvent(eventData)) {
      return;
    }

    // イベントタイプに基づいて処理
    if (eventData.event === 'text_chunk') {
      await this.handleTextChunkEvent(eventData as TextChunkEvent);
    }
  }

  /**
   * テキストチャンクイベントの処理
   * @param event - テキストチャンクイベント
   */
  private async handleTextChunkEvent(event: TextChunkEvent): Promise<void> {
    const text = event.data.text;
    
    if (text && text.trim()) {
      this.logger.debug(`text_chunkイベント検出: ${text}`);
      
      // "stop"文字列をチェック
      if (text.trim().toLowerCase() === 'stop') {
        this.logger.warn(`"stop"文字列を検出したためスキップ`);
        return;
      }
      
      // テキストを累積
      this.accumulatedText += text;
      this.logger.debug(`テキスト累積: ${this.accumulatedText}`);
      
      // チャンクを送信
      this.sendChunk(text);
    }
  }
}
