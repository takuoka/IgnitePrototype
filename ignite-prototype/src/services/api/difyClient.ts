/**
 * Dify API クライアント
 * 
 * Dify APIとの通信を担当するクライアント実装
 */

import { CompletionClient } from 'dify-client';
import { logError } from '@/utils/errorHandler';
import { getDifyConfig, generateUserId } from './difyConfig';
import type { DifyAPIRequest } from '@/types';

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
  }): Promise<{
    response: Response;
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }>;
}

/**
 * Dify APIクライアント実装
 */
export class DifyApiClient implements DifyClient {
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly userId: string;
  private readonly client: CompletionClient;

  /**
   * コンストラクタ
   * @param config - API設定（省略時は環境変数から取得）
   * @param userId - ユーザーID（省略時は自動生成）
   */
  constructor(
    config = getDifyConfig(),
    userId = generateUserId()
  ) {
    this.apiBaseUrl = config.apiBaseUrl;
    this.apiKey = config.apiKey;
    this.userId = userId;
    this.client = new CompletionClient(this.apiKey, this.apiBaseUrl);
    
    console.log('🔧 [DifyClient] クライアント初期化完了');
  }

  /**
   * ストリーミングリクエストを送信
   * @param inputs - 入力データ
   * @returns レスポンスのReadableStreamとReader
   */
  async sendStreamingRequest(inputs: { 
    currentLyric: string;
    favorite_lyrics?: string;
  }): Promise<{
    response: Response;
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }> {
    console.log('📤 [DifyClient] リクエスト送信:', JSON.stringify(inputs, null, 2));
    
    // リクエストデータの準備
    const requestData: DifyAPIRequest = {
      inputs: inputs,
      user: this.userId,
      response_mode: 'streaming'
    };
    
    // APIエンドポイント
    const apiUrl = `${this.apiBaseUrl}/workflows/run`;
    
    console.log('📥 [DifyClient] ストリーミング開始');
    
    try {
      // fetchを使用してストリーミングAPIを呼び出す
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [DifyClient] APIエラー: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
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
 * デフォルトのDify APIクライアントインスタンスを作成
 * @returns DifyClient インスタンス
 */
export function createDifyClient(): DifyClient {
  return new DifyApiClient();
}
