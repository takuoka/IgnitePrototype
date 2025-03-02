/**
 * ノード開始イベントハンドラー
 * 
 * node_startedイベントを処理するハンドラーを提供します。
 */

import type { StreamingEventData, NodeStartedEvent } from '@/types';
import { BaseEventHandler, type EventHandlerOptions, type EventHandlerResult } from './baseEventHandler';

/**
 * ノードタイトルとセッション変数のマッピング
 */
const TITLE_TO_VARIABLE_MAP: Record<string, string> = {
  // 日本語タイトル
  'アドバイス': 'advice',
  'フレーズ': 'phrases',
  'ワード': 'words',
  // 英語タイトル
  'advice': 'advice',
  'phrases': 'phrases',
  'words': 'words'
};

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
    
    if (this.debug) {
      console.log('🔧 [NodeStartedEventHandler] ハンドラー初期化完了');
    }
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
    
    if (this.debug) {
      console.log(`🔄 [NodeStartedEventHandler] ノードIDと変数名のマッピングを保存: ${nodeId} -> ${variableName}`);
    }
    
    return {
      accumulatedText,
      lastContent,
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
}
