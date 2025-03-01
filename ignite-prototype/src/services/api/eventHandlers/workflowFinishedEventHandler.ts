/**
 * ワークフロー完了イベントハンドラー
 * 
 * workflow_finishedイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, WorkflowFinishedEvent } from '@/types';
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult } from './baseEventHandler';
import type { ContentFilter } from './contentFilter';
import { createContentFilter } from './contentFilter';

/**
 * ワークフロー完了イベントハンドラー
 */
export class WorkflowFinishedEventHandler extends BaseEventHandler {
  private readonly contentFilter: ContentFilter;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   * @param contentFilter - コンテンツフィルター
   */
  constructor(
    options: EventHandlerOptions = {},
    contentFilter: ContentFilter = createContentFilter(options)
  ) {
    super(options);
    this.contentFilter = contentFilter;
    
    if (this.debug) {
      console.log('🔧 [WorkflowFinishedEventHandler] ハンドラー初期化完了');
    }
  }
  
  /**
   * イベントを処理できるかどうかを判定
   * @param eventData - イベントデータ
   * @returns 処理可能かどうか
   */
  canHandle(eventData: StreamingEventData): boolean {
    return eventData.event === 'workflow_finished' && 
           !!(eventData as WorkflowFinishedEvent).data?.outputs;
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
    const outputs = (eventData as WorkflowFinishedEvent).data.outputs;
    
    // 新しいフィールド（advice, phrases, words）が存在するか確認
    if (this.hasMultiSectionOutputs(outputs)) {
      return this.handleMultiSectionOutputs(outputs, onChunk, accumulatedText, lastContent);
    } else {
      return this.handleLegacyOutputs(outputs, onChunk, accumulatedText, lastContent);
    }
  }
  
  /**
   * 複数セクションの出力があるかどうかを判定
   * @param outputs - 出力データ
   * @returns 複数セクションの出力があるかどうか
   */
  private hasMultiSectionOutputs(outputs: Record<string, any>): boolean {
    return !!(outputs.advice || outputs.phrases || outputs.words);
  }
  
  /**
   * 複数セクションの出力を処理
   * @param outputs - 出力データ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果
   */
  private handleMultiSectionOutputs(
    outputs: Record<string, any>,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult {
    let handled = false;
    let newLastContent = lastContent;
    
    // 各セクションを個別に送信
    if (outputs.advice && typeof outputs.advice === 'string' && (outputs.advice.trim() || outputs.advice.includes('\n'))) {
      const adviceChunk = JSON.stringify({
        type: 'advice',
        content: outputs.advice
      });
      
      const sent = this.sendChunk(adviceChunk, true, onChunk, newLastContent);
      if (sent) {
        newLastContent = adviceChunk;
        handled = true;
      }
    }
    
    if (outputs.phrases && typeof outputs.phrases === 'string' && (outputs.phrases.trim() || outputs.phrases.includes('\n'))) {
      const phrasesChunk = JSON.stringify({
        type: 'phrases',
        content: outputs.phrases
      });
      
      const sent = this.sendChunk(phrasesChunk, true, onChunk, newLastContent);
      if (sent) {
        newLastContent = phrasesChunk;
        handled = true;
      }
    }
    
    if (outputs.words && typeof outputs.words === 'string' && (outputs.words.trim() || outputs.words.includes('\n'))) {
      const wordsChunk = JSON.stringify({
        type: 'words',
        content: outputs.words
      });
      
      const sent = this.sendChunk(wordsChunk, true, onChunk, newLastContent);
      if (sent) {
        newLastContent = wordsChunk;
        handled = true;
      }
    }
    
    return {
      accumulatedText: '',
      lastContent: newLastContent,
      handled: handled
    };
  }
  
  /**
   * 従来の出力を処理（後方互換性のため）
   * @param outputs - 出力データ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果
   */
  private handleLegacyOutputs(
    outputs: Record<string, any>,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult {
    for (const [key, value] of Object.entries(outputs)) {
      // 改行のみのテキストも処理するように条件を変更
      if (typeof value === 'string' && (value.trim() || value.includes('\n')) && !this.contentFilter.shouldIgnoreData(key, value)) {
        const legacyChunk = JSON.stringify({
          type: 'legacy',
          content: value
        });
        
        const sent = this.sendChunk(legacyChunk, true, onChunk, lastContent);
        
        return {
          accumulatedText: '',
          lastContent: sent ? legacyChunk : lastContent,
          handled: true
        };
      }
    }
    
    return {
      accumulatedText,
      lastContent,
      handled: true
    };
  }
}
