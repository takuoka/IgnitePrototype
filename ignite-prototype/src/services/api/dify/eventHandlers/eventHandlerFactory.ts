/**
 * Event Handler Factory
 * 
 * Creates and manages event handlers for Dify API events
 */

import type { StreamingEventData } from '@/types';
import type { IEventHandler } from './baseEventHandler';
import { TextChunkEventHandler } from './textChunkEventHandler';
import { NodeEventHandler } from './nodeEventHandler';
import { WorkflowEventHandler } from './workflowEventHandler';
import { GenericEventHandler } from './genericEventHandler';
import { DifyLogger } from '../utils/logger';

/**
 * イベントハンドラーファクトリークラス
 * 
 * 複合イベントハンドラーを作成し、適切なハンドラーにイベントを振り分ける
 */
export class EventHandlerFactory {
  /**
   * 複合イベントハンドラーを作成
   * @param callback - チャンク受信時のコールバック関数
   * @returns 複合イベントハンドラー
   */
  static createHandler(
    callback: (chunk: string, isFinal?: boolean) => void
  ): IEventHandler {
    // 各種ハンドラーを作成
    const handlers = [
      new TextChunkEventHandler(callback),
      new NodeEventHandler(callback),
      new WorkflowEventHandler(callback),
      new GenericEventHandler(callback)
    ];
    
    const logger = new DifyLogger('EventHandlerFactory');
    
    // 複合ハンドラーを返す
    return {
      /**
       * イベントを処理する
       * @param eventData - イベントデータ
       */
      async processEvent(eventData: StreamingEventData): Promise<void> {
        logger.debug(`イベント処理: ${eventData.event || 'unknown'}`);
        
        // workflow_finishedイベントは最優先で処理（最終結果を含むため）
        if (eventData.event === 'workflow_finished') {
          logger.info('workflow_finishedイベントを優先処理');
          // WorkflowEventHandlerのみで処理
          const workflowHandler = handlers.find(h => h instanceof WorkflowEventHandler);
          if (workflowHandler) {
            await workflowHandler.processEvent(eventData);
            return; // 他のハンドラーでは処理しない
          }
        }
        
        // node_finishedイベントでLLMノードの場合は特別処理
        if (eventData.event === 'node_finished' && 
            eventData.data?.node_type === 'llm' && 
            eventData.data?.outputs?.text) {
          logger.info('LLMノード完了イベントを優先処理');
          // NodeEventHandlerのみで処理
          const nodeHandler = handlers.find(h => h instanceof NodeEventHandler);
          if (nodeHandler) {
            await nodeHandler.processEvent(eventData);
            return; // 他のハンドラーでは処理しない
          }
        }
        
        // その他のイベントは全てのハンドラーで処理
        for (const handler of handlers) {
          await handler.processEvent(eventData);
        }
      },
      
      /**
       * ストリーム終了時の処理
       */
      handleStreamEnd(): void {
        logger.debug('ストリーム終了処理');
        
        // 最初のハンドラーのみでストリーム終了処理を行う
        // (複数のハンドラーで行うと重複して結果が送信される可能性がある)
        if (handlers.length > 0) {
          handlers[0].handleStreamEnd();
        }
      }
    };
  }
}
