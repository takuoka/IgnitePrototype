/**
 * Workflow Event Handler
 * 
 * Handles workflow_finished events from Dify API
 */

import type { StreamingEventData, WorkflowFinishedEvent } from '@/types';
import { BaseEventHandler } from './baseEventHandler';
import { DifyLogger } from '../utils/logger';

/**
 * ワークフローイベントハンドラークラス
 */
export class WorkflowEventHandler extends BaseEventHandler {
  /**
   * コンストラクタ
   * @param callback - チャンク受信時のコールバック関数
   */
  constructor(callback: (chunk: string, isFinal?: boolean) => void) {
    super(callback, 'WorkflowHandler');
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
    if (eventData.event === 'workflow_finished') {
      await this.handleWorkflowFinishedEvent(eventData as WorkflowFinishedEvent);
    }
  }

  /**
   * ワークフロー完了イベントの処理
   * @param event - ワークフロー完了イベント
   */
  private async handleWorkflowFinishedEvent(event: WorkflowFinishedEvent): Promise<void> {
    this.logger.info('workflow_finishedイベント検出');
    
    // 最優先: outputs.resultを確認（最も一般的な最終結果フィールド）
    if (event.data?.outputs?.result && typeof event.data.outputs.result === 'string') {
      const result = event.data.outputs.result;
      this.logger.info(`workflow_finished.outputs.result検出: ${DifyLogger.getPreview(result)}`);
      
      // 最終結果として送信（isFinal=trueで強制的に送信）
      this.logger.info('最終結果を送信します');
      this.sendChunk(result, true);
      this.accumulatedText = '';
      return;
    }
    
    // その他のoutputsフィールドを確認
    if (event.data?.outputs) {
      for (const [key, value] of Object.entries(event.data.outputs)) {
        if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(key, value)) {
          this.logger.info(`workflow_finished.outputs.${key}検出: ${DifyLogger.getPreview(value)}`);
          this.sendChunk(value, true);
          this.accumulatedText = '';
          return;
        }
      }
    }
    
    // 累積テキストがあれば送信
    if (this.accumulatedText) {
      this.logger.info(`最終結果として累積テキストを送信: ${DifyLogger.getPreview(this.accumulatedText)}`);
      this.sendChunk(this.accumulatedText, true);
      this.accumulatedText = '';
    }
  }
}
