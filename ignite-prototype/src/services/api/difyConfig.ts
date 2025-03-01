/**
 * Dify API 設定
 * 
 * 環境変数からDify APIの設定を取得し、アプリケーション全体で一貫して使用できるようにします。
 */

/**
 * Dify API設定インターフェース
 */
export interface DifyConfig {
  apiBaseUrl: string;
  apiKey: string;
}

/**
 * 環境変数からDify API設定を取得
 * @returns Dify API設定オブジェクト
 * @throws 必要な環境変数が設定されていない場合にエラーをスロー
 */
export function getDifyConfig(): DifyConfig {
  const apiBaseUrl = import.meta.env.VITE_DIFY_API_BASE_URL;
  const apiKey = import.meta.env.VITE_DIFY_API_KEY;
  
  if (!apiBaseUrl || !apiKey) {
    console.error('❌ [DifyAPI] API設定不足: 環境変数が設定されていません');
    throw new Error('API configuration missing. Check environment variables.');
  }
  
  return {
    apiBaseUrl,
    apiKey
  };
}

/**
 * ユーザーIDを生成
 * @returns 一意のユーザーID
 */
export function generateUserId(): string {
  return 'user-' + Date.now();
}
