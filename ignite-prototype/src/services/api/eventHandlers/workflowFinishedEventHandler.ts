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
  // 処理済みのワークフローIDを追跡
  private readonly processedWorkflowIds: Set<string> = new Set();
  // セッションごとに最初のworkflow_finishedイベントのみを処理するためのフラグ
  private hasProcessedWorkflowFinishedInCurrentSession: boolean = false;
  
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
   * セッションをリセットする
   * 新しいセッションが開始されたときに呼び出す
   */
  public resetSession(): void {
    this.hasProcessedWorkflowFinishedInCurrentSession = false;
    
    if (this.debug) {
      console.log('🔄 [WorkflowFinishedEventHandler] セッションをリセット');
    }
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
    const workflowEvent = eventData as WorkflowFinishedEvent;
    const workflowId = workflowEvent.data.id;
    
    // 既に処理済みのワークフローIDの場合はスキップ
    if (workflowId && this.processedWorkflowIds.has(workflowId)) {
      if (this.debug) {
        console.log(`⏭️ [WorkflowFinishedEventHandler] 既に処理済みのワークフローをスキップ: ${workflowId}`);
      }
      return {
        accumulatedText,
        lastContent,
        handled: true
      };
    }
    
    // 同一セッション内で既にworkflow_finishedイベントを処理済みの場合はスキップ
    if (this.hasProcessedWorkflowFinishedInCurrentSession) {
      if (this.debug) {
        console.log(`⏭️ [WorkflowFinishedEventHandler] 同一セッション内で既にworkflow_finishedイベントを処理済み`);
      }
      return {
        accumulatedText,
        lastContent,
        handled: true
      };
    }
    
    const outputs = workflowEvent.data.outputs;
    
    // ワークフローIDを処理済みとしてマーク
    if (workflowId) {
      this.processedWorkflowIds.add(workflowId);
      
      if (this.debug) {
        console.log(`✅ [WorkflowFinishedEventHandler] ワークフローを処理済みとしてマーク: ${workflowId}`);
      }
    }
    
    // 同一セッション内でworkflow_finishedイベントを処理済みとしてマーク
    this.hasProcessedWorkflowFinishedInCurrentSession = true;
    
    if (this.debug) {
      console.log(`✅ [WorkflowFinishedEventHandler] 同一セッション内でworkflow_finishedイベントを処理済みとしてマーク`);
    }
    
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
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult {
    let handled = false;
    let newLastContent = lastContent;
    
    // ワークフロー完了イベントはワークフロー完了として扱う
    const isWorkflowCompletion = true;
    
    // 各セクションを一度に送信（ワークフロー完了として）
    const finalOutputs = {
      type: 'workflow_outputs',
      content: {
        advice: outputs.advice || '',
        phrases: outputs.phrases || '',
        words: outputs.words || ''
      }
    };
    
    // ワークフロー完了として送信
    const finalChunk = JSON.stringify(finalOutputs);
    
    // 前回と同じ内容でなければ送信
    if (finalChunk !== lastContent) {
      const sent = this.sendChunk(finalChunk, isWorkflowCompletion, onChunk, newLastContent);
      
      if (sent) {
        newLastContent = finalChunk;
        handled = true;
        
        if (this.debug) {
          console.log(`📤 [WorkflowFinishedEventHandler] マルチセクション出力を送信`);
        }
      }
    } else if (this.debug) {
      console.log(`⏭️ [WorkflowFinishedEventHandler] 重複するマルチセクション出力をスキップ`);
    }
    
    return {
      accumulatedText: '',
      lastContent: newLastContent,
      handled: true
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
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult {
    // ワークフロー完了イベントはワークフロー完了として扱う
    const isWorkflowCompletion = true;
    
    for (const [key, value] of Object.entries(outputs)) {
      // 改行のみのテキストも処理するように条件を変更
      if (typeof value === 'string' && (value.trim() || value.includes('\n')) && !this.contentFilter.shouldIgnoreData(key, value)) {
        const legacyChunk = JSON.stringify({
          type: 'legacy',
          content: value
        });
        
        // 前回と同じ内容でなければ送信
        if (legacyChunk !== lastContent) {
          const sent = this.sendChunk(legacyChunk, isWorkflowCompletion, onChunk, lastContent);
          
          if (this.debug) {
            console.log(`📤 [WorkflowFinishedEventHandler] レガシー出力を送信: ${key}`);
          }
          
          return {
            accumulatedText: '',
            lastContent: sent ? legacyChunk : lastContent,
            handled: true
          };
        } else if (this.debug) {
          console.log(`⏭️ [WorkflowFinishedEventHandler] 重複するレガシー出力をスキップ: ${key}`);
        }
      }
    }
    
    return {
      accumulatedText,
      lastContent,
      handled: true
    };
  }
}
