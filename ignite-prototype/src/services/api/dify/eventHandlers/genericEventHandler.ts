/**
 * Generic Event Handler
 * 
 * Handles generic events from Dify API that don't match other specific handlers
 */

import type { StreamingEventData } from '@/types';
import { BaseEventHandler } from './baseEventHandler';

/**
 * 一般イベントハンドラークラス
 */
export class GenericEventHandler extends BaseEventHandler {
  /**
   * コンストラクタ
   * @param callback - チャンク受信時のコールバック関数
   */
  constructor(callback: (chunk: string, isFinal?: boolean) => void) {
    super(callback, 'GenericHandler');
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

    // 特定のイベントタイプに該当しない場合は一般的な処理を行う
    if (!['text_chunk', 'node_finished', 'workflow_finished'].includes(eventData.event || '')) {
      await this.handleGenericEvent(eventData);
    }
  }

  /**
   * その他の一般的なイベントの処理
   * @param eventData - イベントデータ
   */
  private async handleGenericEvent(eventData: StreamingEventData): Promise<void> {
    // 一般的なフィールドをチェック
    const dataFields = ['text', 'result', 'answer', 'content'];
    
    for (const field of dataFields) {
      const value = eventData.data?.[field];
      if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(field, value)) {
        this.logger.info(`data.${field}検出: ${value}`);
        this.sendChunk(value);
        return;
      }
    }

    // トップレベルのフィールドもチェック
    for (const field of dataFields) {
      const value = eventData[field];
      if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(field, value)) {
        this.logger.info(`${field}検出: ${value}`);
        this.sendChunk(value);
        return;
      }
    }
  }
}
