/**
 * API設定管理
 * 
 * API設定の取得と管理を行う機能を提供します。
 */

import type { ApiConfig } from '@/types/api';

/**
 * デフォルトのAPI設定を取得
 * @returns API設定オブジェクト
 * @throws 必要な環境変数が設定されていない場合にエラーをスロー
 */
export function getDefaultApiConfig(): ApiConfig {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const apiKey = import.meta.env.VITE_API_KEY;
  
  if (!apiBaseUrl) {
    throw new Error('環境変数 VITE_API_BASE_URL が設定されていません');
  }
  
  if (!apiKey) {
    throw new Error('環境変数 VITE_API_KEY が設定されていません');
  }
  
  return {
    apiBaseUrl,
    apiKey
  };
}

/**
 * 一意のユーザーIDを生成
 * @returns 一意のユーザーID
 */
export function generateUserId(): string {
  return 'user-' + Date.now();
}

/**
 * ローカルストレージからユーザーIDを取得または生成
 * @param storageKey - ローカルストレージのキー
 * @returns ユーザーID
 */
export function getUserId(storageKey: string = 'app_user_id'): string {
  // ブラウザ環境でない場合は新しいIDを生成して返す
  if (typeof localStorage === 'undefined') {
    return generateUserId();
  }
  
  // ローカルストレージからIDを取得
  let userId = localStorage.getItem(storageKey);
  
  // IDが存在しない場合は新しいIDを生成して保存
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(storageKey, userId);
  }
  
  return userId;
}
