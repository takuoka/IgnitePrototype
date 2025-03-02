/**
 * API クライアント基底クラス
 * 
 * API通信の基本機能を提供する抽象クラス
 */

import { logError } from '@/utils/errorHandler';
import type { ApiClient, ApiConfig, ApiRequest } from '@/types/api';

/**
 * 基本的なAPIクライアント実装
 */
export abstract class BaseApiClient implements ApiClient {
  protected readonly apiBaseUrl: string;
  protected readonly apiKey: string;
  protected readonly userId: string;
  
  /**
   * コンストラクタ
   * @param config - API設定
   * @param userId - ユーザーID
   */
  constructor(
    protected readonly config: ApiConfig,
    userId: string
  ) {
    this.apiBaseUrl = config.apiBaseUrl;
    this.apiKey = config.apiKey;
    this.userId = userId;
    
    if (this.isDebugMode()) {
      console.log('🔧 [ApiClient] クライアント初期化完了');
    }
  }
  
  /**
   * デバッグモードかどうかを判定
   * @returns デバッグモードかどうか
   */
  protected isDebugMode(): boolean {
    return process.env.NODE_ENV === 'development';
  }
  
  /**
   * リクエストデータを準備
   * @param inputs - 入力データ
   * @returns APIリクエストデータ
   */
  protected prepareRequestData(inputs: Record<string, any>): ApiRequest {
    return {
      inputs,
      user: this.userId,
      response_mode: 'streaming'
    };
  }
  
  /**
   * APIエンドポイントURLを取得
   * @param path - APIパス
   * @returns 完全なAPIエンドポイントURL
   */
  protected getApiUrl(path: string): string {
    return `${this.apiBaseUrl}/${path}`;
  }
  
  /**
   * HTTPリクエストを送信
   * @param url - APIエンドポイントURL
   * @param method - HTTPメソッド
   * @param body - リクエストボディ
   * @returns レスポンス
   */
  protected async sendRequest(
    url: string,
    method: string = 'POST',
    body?: any
  ): Promise<Response> {
    if (this.isDebugMode()) {
      console.log(`📤 [ApiClient] ${method}リクエスト送信:`, url);
      if (body) {
        console.log('📤 [ApiClient] リクエストボディ:', JSON.stringify(body, null, 2));
      }
    }
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [ApiClient] APIエラー: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('❌ [ApiClient] リクエストエラー:', error);
      logError('ApiClient', error);
      throw error;
    }
  }
  
  /**
   * リクエストヘッダーを取得
   * @returns ヘッダーオブジェクト
   */
  protected getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * ストリーミングリクエストを送信
   * @param inputs - 入力データ
   * @returns レスポンスのReadableStreamとReader
   */
  abstract sendStreamingRequest(inputs: Record<string, any>): Promise<{
    response: Response;
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }>;
}
