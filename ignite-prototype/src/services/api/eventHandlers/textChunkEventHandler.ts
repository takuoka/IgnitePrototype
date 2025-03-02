/**
 * テキストチャンクイベントハンドラー
 * 
 * text_chunkイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, TextChunkEvent } from '@/types';
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult } from './baseEventHandler';
import { NodeStartedEventHandler } from './nodeStartedEventHandler';

/**
 * テキストチャンクイベントハンドラー
 */
export class TextChunkEventHandler extends BaseEventHandler {
  // 前回のチャンクを保持する変数
  private previousChunk: string = '';
  // ノード開始イベントハンドラーへの参照
  private readonly nodeStartedHandler: NodeStartedEventHandler;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   * @param nodeStartedHandler - ノード開始イベントハンドラー
   */
  constructor(
    options: EventHandlerOptions = {},
    nodeStartedHandler?: NodeStartedEventHandler
  ) {
    super(options);
    this.nodeStartedHandler = nodeStartedHandler || new NodeStartedEventHandler(options);
    
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
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult {
    const textChunkEvent = eventData as TextChunkEvent;
    let text = textChunkEvent.data.text;
    
    // 前回のチャンクが見出し記号で終わっていた場合、現在のチャンクの先頭にスペースを挿入
    if (this.previousChunk && this.endsWithHeadingMarker(this.previousChunk) && text.trim() && !text.startsWith(' ')) {
      if (this.debug) {
        console.log(`🔍 [TextChunkEventHandler] 見出し記号の後にスペースを挿入: "${this.previousChunk}" + " " + "${text}"`);
      }
      text = ' ' + text;
    }
    
    // テキストチャンクイベントはワークフロー完了ではない
    const isWorkflowCompletion = false;
    
    // from_variable_selectorからノードIDを取得
    const variableSelector = textChunkEvent.data.from_variable_selector;
    const nodeId = variableSelector && variableSelector.length > 0 ? variableSelector[0] : null;
    
    // 改行のみのチャンクも処理するように条件を変更
    if (text && (text.trim() || text.includes('\n')) && text.trim().toLowerCase() !== 'stop') {
      // 現在のチャンクを保存
      this.previousChunk = text;
      
      // ノードIDから変数名を取得し、適切なタイプとして送信
      let chunkType = 'legacy';
      if (nodeId) {
        chunkType = this.nodeStartedHandler.getVariableNameForNodeId(nodeId);
        
        if (this.debug) {
          console.log(`🔍 [TextChunkEventHandler] ノードID ${nodeId} の変数名: ${chunkType}`);
        }
      }
      
      // JSONとして送信
      const chunk = JSON.stringify({
        type: chunkType,
        content: text
      });
      
      const sent = this.sendChunk(chunk, isWorkflowCompletion, onChunk, lastContent);
      
      return {
        // 中間結果なので累積テキストは維持
        accumulatedText: sent ? accumulatedText + text : accumulatedText,
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
