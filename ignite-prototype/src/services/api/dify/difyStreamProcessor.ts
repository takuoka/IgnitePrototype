/**
 * Dify ストリームプロセッサ
 * 
 * Dify APIから返されるストリームデータを処理する機能を提供します。
 */

import { BaseStreamProcessor } from '../stream/streamProcessor';
import { createStreamParser } from '../stream/streamParser';
import { createEventHandlerRegistry } from '../stream/eventHandlerRegistry';
import { createDifyEventHandlers } from './handlers';
import type { StreamProcessorOptions, StreamParser, EventHandlerRegistry } from '@/types/api';

/**
 * Dify ストリームプロセッサ
 */
export class DifyStreamProcessor extends BaseStreamProcessor {
  /**
   * コンストラクタ
   * @param options - ストリーム処理オプション
   * @param streamParser - ストリームパーサー
   * @param eventHandlerRegistry - イベントハンドラーレジストリ
   */
  constructor(
    options: StreamProcessorOptions = {},
    streamParser?: StreamParser,
    eventHandlerRegistry?: EventHandlerRegistry
  ) {
    // 基底クラスのコンストラクタを呼び出し
    super(options, streamParser, eventHandlerRegistry);
    
    // Dify固有のイベントハンドラーを登録
    this.registerDifyEventHandlers(options);
  }
  
  /**
   * Dify固有のイベントハンドラーを登録
   * @param options - イベントハンドラーオプション
   */
  private registerDifyEventHandlers(options: StreamProcessorOptions): void {
    const registry = this.getEventHandlerRegistry();
    const handlers = createDifyEventHandlers(options);
    
    // 各ハンドラーを登録
    registry.registerHandler(handlers.nodeStartedHandler);
    registry.registerHandler(handlers.textChunkHandler);
    registry.registerHandler(handlers.nodeFinishedHandler);
    registry.registerHandler(handlers.workflowFinishedHandler);
  }
}

/**
 * デフォルトのDifyストリームプロセッサインスタンスを作成
 * @param options - ストリーム処理オプション
 * @returns DifyStreamProcessor インスタンス
 */
export function createDifyStreamProcessor(options: StreamProcessorOptions = {}): DifyStreamProcessor {
  const streamParser = createStreamParser(options);
  const eventHandlerRegistry = createEventHandlerRegistry(options);
  
  return new DifyStreamProcessor(options, streamParser, eventHandlerRegistry);
}
