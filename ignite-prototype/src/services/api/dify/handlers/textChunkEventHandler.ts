/**
 * テキストチャンクイベントハンドラー
 * 
 * text_chunkイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, TextChunkEvent } from '@/types';
import { BaseEventHandler } from '../../stream/baseEventHandler';
import type { EventHandlerOptions, EventHandlerResult, EventHandlerState } from '@/types/api';

/**
 * テキストチャンクイベントハンドラー
 */
export class TextChunkEventHandler extends BaseEventHandler {
  // 前回のチャンクを保持する変数
  private previousChunk: string = '';
  // ノードIDと変数名のマッピングを保持
  private readonly nodeIdToVariable: Map<string, string> = new Map();
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    super(options);
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
   * ノードIDと変数名のマッピングを設定
   * @param nodeId - ノードID
   * @param variableName - 変数名
   */
  setVariableNameForNodeId(nodeId: string, variableName: string): void {
    this.nodeIdToVariable.set(nodeId, variableName);
    this.log(`ノードID ${nodeId} に変数名 ${variableName} を設定`);
  }
  
  /**
   * ノードIDから変数名を取得
   * @param nodeId - ノードID
   * @returns 変数名（見つからない場合は'legacy'）
   */
  getVariableNameForNodeId(nodeId: string): string {
    return this.nodeIdToVariable.get(nodeId) || 'legacy';
  }
  
  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param state - 現在の状態
   * @returns 処理結果
   */
  handle(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    state: EventHandlerState
  ): EventHandlerResult {
    const textChunkEvent = eventData as TextChunkEvent;
    let text = textChunkEvent.data.text;
    
    // 前回のチャンクが見出し記号で終わっていた場合、現在のチャンクの先頭にスペースを挿入
    if (this.previousChunk && this.endsWithHeadingMarker(this.previousChunk) && text.trim() && !text.startsWith(' ')) {
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
        chunkType = this.getVariableNameForNodeId(nodeId);
      }
      
      // JSONとして送信
      const chunk = JSON.stringify({
        type: chunkType,
        content: text
      });
      
      const sent = this.sendChunk(chunk, isWorkflowCompletion, onChunk, state.lastContent);
      
      if (sent) {
        return {
          state: {
            accumulatedText: state.accumulatedText + text,
            lastContent: chunk
          },
          handled: true
        };
      }
    }
    
    return {
      state,
      handled: true
    };
  }
  
  /**
   * セッションをリセットする
   */
  resetSession(): void {
    this.previousChunk = '';
    this.log('セッションリセット');
  }
}

/**
 * デフォルトのテキストチャンクイベントハンドラーインスタンスを作成
 * @param options - イベントハンドラーオプション
 * @returns TextChunkEventHandler インスタンス
 */
export function createTextChunkEventHandler(options: EventHandlerOptions = {}): TextChunkEventHandler {
  return new TextChunkEventHandler(options);
}
