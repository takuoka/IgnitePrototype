/**
 * Dify API クライアント
 * 
 * Dify APIとの通信を担当するクライアント実装
 */

import { BaseApiClient } from '../core/apiClient';
import { getDefaultApiConfig, getUserId } from '../core/apiConfig';
import { logError } from '@/utils/errorHandler';
import type { ApiConfig } from '@/types/api';

/**
 * Dify APIクライアントインターフェース
 */
export interface DifyClient {
  /**
   * ストリーミングリクエストを送信
   * @param inputs - 入力データ
   * @returns レスポンスのReadableStreamとReader
   */
  sendStreamingRequest(inputs: { 
    currentLyric: string;
    favorite_lyrics?: string;
    global_instruction?: string;
  }): Promise<{
    response: Response;
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }>;
}

/**
 * Dify APIクライアント実装
 */
export class DifyApiClient extends BaseApiClient implements DifyClient {
  /**
   * コンストラクタ
   * @param config - API設定（省略時は環境変数から取得）
   * @param userId - ユーザーID（省略時は自動生成）
   */
  constructor(
    config: ApiConfig = getDifyConfig(),
    userId: string = getUserId('dify_user_id')
  ) {
    super(config, userId);
    
    if (this.isDebugMode()) {
      console.log('🔧 [DifyClient] クライアント初期化完了');
    }
  }
  
  /**
   * ストリーミングリクエストを送信
   * @param inputs - 入力データ
   * @returns レスポンスのReadableStreamとReader
   */
  async sendStreamingRequest(inputs: { 
    currentLyric: string;
    favorite_lyrics?: string;
    global_instruction?: string;
  }): Promise<{
    response: Response;
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }> {
    if (this.isDebugMode()) {
      console.log('📤 [DifyClient] リクエスト送信:', JSON.stringify(inputs, null, 2));
    }
    
    // リクエストデータの準備
    const requestData = this.prepareRequestData(inputs);
    
    // APIエンドポイント
    const apiUrl = this.getApiUrl('workflows/run');
    
    if (this.isDebugMode()) {
      console.log('📥 [DifyClient] ストリーミング開始');
    }
    
    try {
      // fetchを使用してストリーミングAPIを呼び出す
      const response = await this.sendRequest(apiUrl, 'POST', requestData);
      
      // ReadableStreamを取得
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Readable stream is not supported in this environment.');
      }
      
      return { response, reader };
    } catch (error) {
      console.error('❌ [DifyClient] リクエストエラー:', error);
      logError('DifyClient', error);
      throw error;
    }
  }
}

/**
 * Dify API設定を取得
 * @returns Dify API設定オブジェクト
 */
export function getDifyConfig(): ApiConfig {
  const apiBaseUrl = import.meta.env.VITE_DIFY_API_BASE_URL;
  const apiKey = import.meta.env.VITE_DIFY_API_KEY;
  
  if (!apiBaseUrl) {
    throw new Error('環境変数 VITE_DIFY_API_BASE_URL が設定されていません');
  }
  
  if (!apiKey) {
    throw new Error('環境変数 VITE_DIFY_API_KEY が設定されていません');
  }
  
  return {
    apiBaseUrl,
    apiKey
  };
}

/**
 * デフォルトのDify APIクライアントインスタンスを作成
 * @returns DifyClient インスタンス
 */
export function createDifyClient(): DifyClient {
  return new DifyApiClient();
}
