/**
 * API サービスのエントリーポイント
 * 
 * アプリケーションの他の部分からAPIを利用するためのメインインターフェースを提供します。
 */

// Dify APIサービスをエクスポート
export { fetchDifyInspirationStream } from './dify/difyService';

// APIクライアント
export { createDifyClient } from './dify/difyClient';

// ストリーム処理
export { createDifyStreamProcessor } from './dify/difyStreamProcessor';
export { createStreamParser } from './stream/streamParser';
export { createStreamProcessor } from './stream/streamProcessor';

// イベントハンドラー
export { createEventHandlerRegistry } from './stream/eventHandlerRegistry';
export { createDifyEventHandlers } from './dify/handlers';

// 設定
export { getDefaultApiConfig, generateUserId, getUserId } from './core/apiConfig';

// 定数をエクスポート
export * from './constants';
