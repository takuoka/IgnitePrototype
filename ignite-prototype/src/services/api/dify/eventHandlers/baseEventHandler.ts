/**
 * Base Event Handler for Dify API
 * 
 * Defines the interface and base implementation for event handlers
 */

import type { StreamingEventData } from '@/types';
import { DifyLogger } from '../utils/logger';

/**
 * イベントハンドラーのインターフェース
 */
export interface IEventHandler {
  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   */
  processEvent(eventData: StreamingEventData): Promise<void>;
  
  /**
   * ストリーム終了時の処理
   */
  handleStreamEnd(): void;
}

/**
 * 基本イベントハンドラークラス
 */
export abstract class BaseEventHandler implements IEventHandler {
  protected logger: DifyLogger;
  protected accumulatedText: string = '';
  protected lastContent: string = '';
  protected onChunkCallback: (chunk: string, isFinal?: boolean) => void;

  /**
   * コンストラクタ
   * @param callback - チャンク受信時のコールバック関数
   * @param loggerContext - ロガーのコンテキスト名
   */
  constructor(
    callback: (chunk: string, isFinal?: boolean) => void,
    loggerContext: string = 'BaseEventHandler'
  ) {
    this.onChunkCallback = callback;
    this.logger = new DifyLogger(loggerContext);
  }

  /**
   * イベントを処理する（サブクラスで実装）
   * @param eventData - イベントデータ
   */
  abstract processEvent(eventData: StreamingEventData): Promise<void>;

  /**
   * ストリーム終了時の処理
   */
  handleStreamEnd(): void {
    // ストリーム終了時に累積テキストがあれば、最終結果として送信
    if (this.accumulatedText && this.accumulatedText !== this.lastContent && this.accumulatedText.trim()) {
      this.logger.info(`ストリーム終了時の累積テキストを最終結果として送信: ${DifyLogger.getPreview(this.accumulatedText)}`);
      this.sendChunk(this.accumulatedText, true);
    }
  }

  /**
   * チャンクを送信する
   * @param content - 送信するコンテンツ
   * @param isFinal - 最終結果かどうか
   */
  protected sendChunk(content: string, isFinal: boolean = false): void {
    // 空のコンテンツはスキップ
    if (!content.trim()) {
      this.logger.debug('空のチャンクをスキップ');
      return;
    }
    
    // 最終結果でない場合のみ重複チェック
    if (!isFinal && content === this.lastContent) {
      this.logger.debug('重複チャンクをスキップ (非最終結果)');
      return;
    }
    
    this.logger.info(`チャンク送信: ${DifyLogger.getPreview(content)} ${isFinal ? '(最終結果)' : ''}`);
    this.lastContent = content;
    this.onChunkCallback(content, isFinal);
  }

  /**
   * イベントをスキップすべきかどうかを判定
   * @param eventData - イベントデータ
   * @returns スキップすべきかどうか
   */
  protected shouldSkipEvent(eventData: StreamingEventData): boolean {
    // workflow_startedイベントは常にスキップ（入力データを含むため）
    if (eventData.event === 'workflow_started') {
      this.logger.debug('workflow_startedイベントをスキップ（入力データを含む）');
      return true;
    }
    
    // node_startedイベントもスキップ（通常は出力データを含まない）
    if (eventData.event === 'node_started') {
      this.logger.debug('node_startedイベントをスキップ');
      return true;
    }
    
    return false;
  }

  /**
   * 無視すべきデータかどうかを判定
   * @param key - キー
   * @param value - 値
   * @returns 無視すべきデータかどうか
   */
  protected shouldIgnoreData(key: string, value: any): boolean {
    // 最終結果を示す可能性のあるキー
    const resultKeys = ['result', 'text', 'answer', 'content'];
    
    // 最終結果を示すキーの場合はスキップしない
    if (resultKeys.some(resultKey => key === resultKey || key.endsWith(`.${resultKey}`))) {
      return false;
    }
    
    // 入力データを示す可能性のあるキー
    const inputKeys = ['currentLyric', 'sys.'];
    
    // キーが入力データを示す場合
    if (inputKeys.some(inputKey => key.includes(inputKey))) {
      this.logger.debug(`入力データと判断してスキップ: ${key}`);
      return true;
    }
    
    // inputsキーは特別扱い - result以外はスキップ
    if (key.includes('inputs') && !key.endsWith('.result')) {
      this.logger.debug(`入力データと判断してスキップ: ${key}`);
      return true;
    }
    
    // "stop"という文字列は無視
    if (typeof value === 'string' && value.trim().toLowerCase() === 'stop') {
      this.logger.debug(`"stop"文字列をスキップ`);
      return true;
    }
    
    return false;
  }
}
