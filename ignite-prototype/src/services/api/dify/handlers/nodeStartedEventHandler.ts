/**
 * ノード開始イベントハンドラー
 * 
 * node_startedイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, NodeStartedEvent } from '@/types';
import { BaseEventHandler } from '../../stream/baseEventHandler';
import { TITLE_TO_VARIABLE_MAP } from '../../constants';
import type { EventHandlerOptions, EventHandlerResult, EventHandlerState } from '@/types/api';

/**
 * ノード開始イベントハンドラー
 */
export class NodeStartedEventHandler extends BaseEventHandler {
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
    return eventData.event === 'node_started';
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
    const nodeData = (eventData as NodeStartedEvent).data;
    const nodeId = nodeData.node_id;
    const title = nodeData.title.toLowerCase();
    
    // タイトルから変数名を取得
    let variableName = 'legacy';
    for (const [titlePattern, varName] of Object.entries(TITLE_TO_VARIABLE_MAP)) {
      if (title.includes(titlePattern.toLowerCase())) {
        variableName = varName;
        break;
      }
    }
    
    // ノードIDと変数名のマッピングを保存
    this.nodeIdToVariable.set(nodeId, variableName);
    
    this.log(`ノード開始: ${title} (ID: ${nodeId}, 変数名: ${variableName})`);
    
    return {
      state,
      handled: true
    };
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
   * セッションをリセットする
   */
  resetSession(): void {
    this.nodeIdToVariable.clear();
    this.log('セッションリセット');
  }
}

/**
 * デフォルトのノード開始イベントハンドラーインスタンスを作成
 * @param options - イベントハンドラーオプション
 * @returns NodeStartedEventHandler インスタンス
 */
export function createNodeStartedEventHandler(options: EventHandlerOptions = {}): NodeStartedEventHandler {
  return new NodeStartedEventHandler(options);
}
