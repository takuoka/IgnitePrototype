/**
 * ベースイベントハンドラー
 * 
 * すべてのイベントハンドラーの基底クラスを提供します。
 */

import type { StreamingEventData } from '@/types';

/**
 * イベントハンドラーオプション
 */
export interface EventHandlerOptions {
  /**
   * デバッグモードを有効にするかどうか
   */
  debug?: boolean;
}

/**
 * イベントハンドラーの結果
 */
export interface EventHandlerResult {
  /**
   * 累積テキスト
   */
  accumulatedText: string;
  
  /**
   * 最後に送信したコンテンツ
   */
  lastContent: string;
  
  /**
   * イベントが処理されたかどうか
   */
  handled: boolean;
}

/**
 * イベントハンドラーインターフェース
 */
export interface IEventHandler {
  /**
   * イベントを処理できるかどうかを判定
   * @param eventData - イベントデータ
   * @returns 処理可能かどうか
   */
  canHandle(eventData: StreamingEventData): boolean;
  
  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果
   */
  handle(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult;
}

/**
 * ベースイベントハンドラー
 */
export abstract class BaseEventHandler implements IEventHandler {
  protected readonly debug: boolean;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   */
  constructor(options: EventHandlerOptions = {}) {
    this.debug = options.debug || false;
  }
  
  /**
   * イベントを処理できるかどうかを判定
   * @param eventData - イベントデータ
   * @returns 処理可能かどうか
   */
  abstract canHandle(eventData: StreamingEventData): boolean;
  
  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果
   */
  abstract handle(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): EventHandlerResult;
  
  /**
   * チャンクを送信する
   * @param content - 送信するコンテンツ
   * @param isFinal - 最終結果かどうか
   * @param onChunk - コールバック関数
   * @param lastContent - 前回送信したコンテンツ
   * @returns 送信されたかどうか
   */
  protected sendChunk(
    content: string,
    isFinal: boolean,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    lastContent: string
  ): boolean {
    // 重複チェック - 前回と同じ内容なら送信しない
    // 改行のみのチャンクも処理するように条件を変更
    if (content === lastContent || (!content.trim() && !content.includes('\n'))) {
      if (this.debug) {
        console.log(`⏭️ [EventHandler] 重複または空のチャンクをスキップ`);
      }
      return false;
    }
    
    if (this.debug) {
      console.log(`📤 [EventHandler] チャンク送信: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''} ${isFinal ? '(最終結果)' : ''}`);
      
      // チャンクの詳細ログ（改行を可視化）
      const contentWithVisibleNewlines = content.replace(/\n/g, '\\n');
      console.log(`🔍 [EventHandler] チャンク詳細: "${contentWithVisibleNewlines}"`);
      
      // チャンクの文字コード表示
      const charCodes = Array.from(content).map(char => {
        const code = char.charCodeAt(0);
        return `${char}(${code})`;
      }).join(' ');
      console.log(`🔢 [EventHandler] チャンク文字コード: ${charCodes}`);
    }
    
    onChunk(content, isFinal);
    return true;
  }
}
