/**
 * Dify API クライアント
 * 
 * Dify APIとの通信を担当するクライアント実装
 */

import { BaseApiClient } from '../core/apiClient';
import { getUserId } from '../core/apiConfig';
import { apiRegistry } from '../core/apiRegistry';
import { logError } from '@/utils/errorHandler';
import type { ApiConfig, DifyApiDefinition } from '@/types/api';

// 固定のAPIエンドポイント
const DIFY_API_BASE_URL = 'https://api.dify.ai/v1';
const DIFY_API_ENDPOINT = 'workflows/run';

/**
 * Dify APIクライアントインターフェース
 */
export interface DifyClient {
  /**
   * ストリーミングリクエストを送信
   * @param inputs - 入力データ
   * @returns レスポンスのReadableStreamとReader
   */
  sendStreamingRequest(inputs: Record<string, any>): Promise<{
    response: Response;
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }>;
  
  /**
   * API定義を取得
   * @returns API定義
   */
  getApiDefinition(): DifyApiDefinition;
}

/**
 * Dify APIクライアント実装
 */
export class DifyApiClient extends BaseApiClient implements DifyClient {
  private apiDefinition: DifyApiDefinition;
  
  /**
   * コンストラクタ
   * @param apiName - API名（省略時はデフォルト）
   * @param userId - ユーザーID（省略時は自動生成）
   */
  constructor(
    apiName: string = 'default',
    userId: string = getUserId('dify_user_id')
  ) {
    // API定義を取得
    const apiDef = apiRegistry.getApiDefinition(apiName);
    if (!apiDef) {
      throw new Error(`API定義 "${apiName}" が見つかりません`);
    }
    
    // API設定を生成
    const apiConfig = getDifyConfig(apiDef);
    
    super(apiConfig, userId);
    this.apiDefinition = apiDef;
    
    if (this.isDebugMode()) {
      console.log(`🔧 [DifyClient] クライアント初期化完了 (API: ${apiName})`);
    }
  }
  
  /**
   * API定義を取得
   * @returns API定義
   */
  getApiDefinition(): DifyApiDefinition {
    return this.apiDefinition;
  }
  
  /**
   * 入力データをフィルタリング
   * @param inputs - 入力データ
   * @returns フィルタリングされた入力データ
   */
  private filterInputs(inputs: Record<string, any>): Record<string, any> {
    const validInputs: Record<string, any> = {};
    const validKeys = this.apiDefinition.validInputVariables;
    
    // 有効な入力変数のみを抽出
    Object.keys(inputs).forEach(key => {
      if (validKeys.includes(key) && inputs[key] !== undefined && inputs[key] !== null) {
        validInputs[key] = inputs[key];
      }
    });
    
    return validInputs;
  }
  
  /**
   * ストリーミングリクエストを送信
   * @param inputs - 入力データ
   * @returns レスポンスのReadableStreamとReader
   */
  async sendStreamingRequest(inputs: Record<string, any>): Promise<{
    response: Response;
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }> {
    if (this.isDebugMode()) {
      console.log('📤 [DifyClient] リクエスト送信:', JSON.stringify(inputs, null, 2));
    }
    
    // 有効な入力のみをフィルタリング
    const filteredInputs = this.filterInputs(inputs);
    
    // リクエストデータの準備
    const requestData = this.prepareRequestData(filteredInputs);
    
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
 * API定義に基づいてDify API設定を取得
 * @param apiDef - API定義
 * @returns API設定オブジェクト
 */
export function getDifyConfig(apiDef: DifyApiDefinition): ApiConfig {
  // APIキーを環境変数から取得
  const apiKey = import.meta.env[apiDef.apiKeyEnvName];
  
  if (!apiKey) {
    throw new Error(`環境変数 ${apiDef.apiKeyEnvName} が設定されていません`);
  }
  
  return {
    apiBaseUrl: DIFY_API_BASE_URL,
    apiKey
  };
}

/**
 * Dify APIクライアントインスタンスを作成
 * @param apiName - API名（省略時はデフォルト）
 * @returns DifyClient インスタンス
 */
export function createDifyClient(apiName: string = 'default'): DifyClient {
  return new DifyApiClient(apiName);
}
