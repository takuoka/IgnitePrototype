/**
 * Node Event Handler
 * 
 * Handles node_finished events from Dify API
 */

import type { StreamingEventData, NodeFinishedEvent } from '@/types';
import { BaseEventHandler } from './baseEventHandler';
import { DifyLogger } from '../utils/logger';

/**
 * ノードイベントハンドラークラス
 */
export class NodeEventHandler extends BaseEventHandler {
  /**
   * コンストラクタ
   * @param callback - チャンク受信時のコールバック関数
   */
  constructor(callback: (chunk: string, isFinal?: boolean) => void) {
    super(callback, 'NodeHandler');
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
    if (eventData.event === 'node_finished') {
      await this.handleNodeFinishedEvent(eventData as NodeFinishedEvent);
    }
  }

  /**
   * ノード完了イベントの処理
   * @param event - ノード完了イベント
   */
  private async handleNodeFinishedEvent(event: NodeFinishedEvent): Promise<void> {
    this.logger.debug(`node_finishedイベント検出: ${event.data.node_type} - ${event.data.title}`);
    
    // LLMノード完了の場合は特別処理
    if (event.data.node_type === 'llm') {
      await this.handleLLMNodeFinished(event);
      return;
    }
    
    // 最終ノード(end)の場合
    if (event.data.node_type === 'end') {
      await this.handleEndNodeFinished(event);
      return;
    }
    
    // その他のノード完了イベント
    if (event.data.outputs) {
      await this.extractAndSendContent(event.data.outputs);
    }
  }

  /**
   * LLMノード完了イベントの特別処理
   * @param event - ノード完了イベント
   */
  private async handleLLMNodeFinished(event: NodeFinishedEvent): Promise<void> {
    this.logger.debug('LLMノード完了イベント詳細:');
    this.logger.debug(`node_id: ${event.data.node_id}`);
    this.logger.debug(`title: ${event.data.title}`);
    
    if (event.data.outputs) {
      this.logger.debug(`outputs keys: ${Object.keys(event.data.outputs).join(', ')}`);
      
      // outputsの内容をログ出力
      for (const [key, value] of Object.entries(event.data.outputs)) {
        if (typeof value === 'string') {
          this.logger.debug(`outputs.${key}: ${DifyLogger.getPreview(value)}`);
        } else if (value !== null && typeof value === 'object') {
          this.logger.debug(`outputs.${key}: [Object]`);
        } else {
          this.logger.debug(`outputs.${key}: ${value}`);
        }
      }
      
      // 特に重要なtext出力を処理
      if (event.data.outputs.text && typeof event.data.outputs.text === 'string') {
        const text = event.data.outputs.text;
        this.logger.debug('outputs.text の完全な内容:');
        this.logger.debug(text);
        
        // 最終結果として直接送信（isFinal=trueで強制的に送信）
        this.logger.info('LLMノードの最終結果を直接送信します (isFinal=true)');
        this.sendChunk(text, true);
        
        // 累積テキストをリセット
        this.accumulatedText = '';
        return;
      }
      
      // textがない場合は他の有用なフィールドを探す
      for (const [key, value] of Object.entries(event.data.outputs)) {
        if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(key, value)) {
          this.logger.info(`LLMノード.outputs.${key}検出: ${DifyLogger.getPreview(value)}`);
          this.sendChunk(value, true);
          this.accumulatedText = '';
          return;
        }
      }
    }
  }

  /**
   * 終了ノード完了イベントの処理
   * @param event - ノード完了イベント
   */
  private async handleEndNodeFinished(event: NodeFinishedEvent): Promise<void> {
    this.logger.info('終了ノード完了イベント検出');
    
    // 最優先: outputs.resultを確認
    if (event.data.outputs?.result && typeof event.data.outputs.result === 'string') {
      const result = event.data.outputs.result;
      this.logger.info(`endノード.outputs.result検出: ${DifyLogger.getPreview(result)}`);
      
      // 最終結果として送信（isFinal=trueで強制的に送信）
      this.logger.info('終了ノードの最終結果を送信します');
      this.sendChunk(result, true);
      this.accumulatedText = '';
      return;
    }
    
    // 次に: inputs.resultを確認
    if (event.data.inputs?.result && typeof event.data.inputs.result === 'string') {
      const result = event.data.inputs.result;
      this.logger.info(`endノード.inputs.result検出: ${DifyLogger.getPreview(result)}`);
      
      // 最終結果として送信
      this.logger.info('終了ノードの入力結果を送信します');
      this.sendChunk(result, true);
      this.accumulatedText = '';
      return;
    }
    
    // その他のoutputsフィールドを確認
    if (event.data.outputs) {
      for (const [key, value] of Object.entries(event.data.outputs)) {
        if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(key, value)) {
          this.logger.info(`endノード.outputs.${key}検出: ${DifyLogger.getPreview(value)}`);
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

  /**
   * オブジェクトから有効なコンテンツを抽出して送信
   * @param obj - 検査対象オブジェクト
   */
  private async extractAndSendContent(obj: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(key, value)) {
        this.logger.info(`${key}検出: ${DifyLogger.getPreview(value)}`);
        this.sendChunk(value);
        return;
      }
    }
  }
}
