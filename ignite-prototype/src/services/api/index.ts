/**
 * API サービスのエントリーポイント
 * 
 * アプリケーションの他の部分からAPIを利用するためのメインインターフェースを提供します。
 */

// Dify APIサービスをエクスポート
export { fetchDifyInspirationStream } from './dify/difyService';

// 後方互換性のために既存のエクスポートを維持
export { createDifyClient } from './dify/difyClient';
export { createDifyStreamProcessor } from './dify/difyStreamProcessor';

// 定数をエクスポート
export * from './constants';
