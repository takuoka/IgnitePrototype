/**
 * コンテンツフィルター
 * 
 * イベントデータのフィルタリング機能を提供します。
 */

import type { EventHandlerOptions } from './baseEventHandler';

/**
 * コンテンツフィルターインターフェース
 */
export interface ContentFilter {
  /**
   * 無視すべきデータかどうかを判定
   * @param key - キー
   * @param value - 値
   * @returns 無視すべきデータかどうか
   */
  shouldIgnoreData(key: string, value: any): boolean;
}

/**
 * Difyコンテンツフィルター実装
 */
export class DifyContentFilter implements ContentFilter {
  private readonly debug: boolean;
  
  /**
   * コンストラクタ
   * @param options - フィルターオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    this.debug = options.debug || false;
  }
  
  /**
   * 無視すべきデータかどうかを判定
   * @param key - キー
   * @param value - 値
   * @returns 無視すべきデータかどうか
   */
  shouldIgnoreData(key: string, value: any): boolean {
    // 最終結果を示す可能性のあるキー
    const resultKeys = ['result', 'text', 'answer', 'content', 'advice', 'phrases', 'words'];
    
    // 最終結果を示すキーの場合はスキップしない
    if (resultKeys.some(resultKey => key === resultKey || key.endsWith(`.${resultKey}`))) {
      return false;
    }
    
    // 入力データを示す可能性のあるキー
    const inputKeys = ['currentLyric', 'sys.'];
    
    // キーが入力データを示す場合
    if (inputKeys.some(inputKey => key.includes(inputKey))) {
      if (this.debug) {
        console.log(`⚠️ [DifyContentFilter] 入力データと判断してスキップ: ${key}`);
      }
      return true;
    }
    
    // inputsキーは特別扱い - result以外はスキップ
    if (key.includes('inputs') && !key.endsWith('.result')) {
      if (this.debug) {
        console.log(`⚠️ [DifyContentFilter] 入力データと判断してスキップ: ${key}`);
      }
      return true;
    }
    
    // "stop"という文字列は無視
    if (typeof value === 'string' && value.trim().toLowerCase() === 'stop') {
      if (this.debug) {
        console.log(`⚠️ [DifyContentFilter] "stop"文字列をスキップ`);
      }
      return true;
    }
    
    return false;
  }
}

/**
 * デフォルトのDifyコンテンツフィルターインスタンスを作成
 * @param options - フィルターオプション
 * @returns ContentFilter インスタンス
 */
export function createContentFilter(options: EventHandlerOptions = {}): ContentFilter {
  return new DifyContentFilter(options);
}
