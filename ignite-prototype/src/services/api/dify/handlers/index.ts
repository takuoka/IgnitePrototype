/**
 * Dify イベントハンドラーのエントリーポイント
 * 
 * 各種イベントハンドラーをエクスポートします。
 */

export * from './textChunkEventHandler';
export * from './nodeStartedEventHandler';
export * from './nodeFinishedEventHandler';
export * from './workflowFinishedEventHandler';

/**
 * Dify用のイベントハンドラーを初期化して連携させる
 * @param options - イベントハンドラーオプション
 * @returns 初期化されたイベントハンドラーのオブジェクト
 */
import { createTextChunkEventHandler } from './textChunkEventHandler';
import { createNodeStartedEventHandler } from './nodeStartedEventHandler';
import { createNodeFinishedEventHandler } from './nodeFinishedEventHandler';
import { createWorkflowFinishedEventHandler } from './workflowFinishedEventHandler';
import type { EventHandlerOptions } from '@/types/api';

export function createDifyEventHandlers(options: EventHandlerOptions = {}) {
  // 各ハンドラーを作成
  const nodeStartedHandler = createNodeStartedEventHandler(options);
  const textChunkHandler = createTextChunkEventHandler(options);
  const nodeFinishedHandler = createNodeFinishedEventHandler(options);
  const workflowFinishedHandler = createWorkflowFinishedEventHandler(options);
  
  // ハンドラー間の連携を設定
  // 例: テキストチャンクハンドラーがノード開始ハンドラーの情報を利用できるようにする
  
  return {
    nodeStartedHandler,
    textChunkHandler,
    nodeFinishedHandler,
    workflowFinishedHandler
  };
}
