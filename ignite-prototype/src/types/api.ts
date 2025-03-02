/**
 * API関連の型定義
 * 
 * API通信に関連する型定義を提供します。
 */

// 既存の型をインポート
import type { StreamingEventData } from './index';

/**
 * API設定インターフェース
 */
export interface ApiConfig {
  /**
   * APIのベースURL
   */
  apiBaseUrl: string;
  
  /**
   * APIキー
   */
  apiKey: string;
}

/**
 * APIリクエストインターフェース
 */
export interface ApiRequest {
  /**
   * リクエスト入力データ
   */
  inputs: Record<string, any>;
  
  /**
   * ユーザーID
   */
  user: string;
  
  /**
   * レスポンスモード（'streaming'など）
   */
  response_mode: string;
}

/**
 * APIクライアントインターフェース
 */
export interface ApiClient {
  /**
   * ストリーミングリクエストを送信
   * @param inputs - 入力データ
   * @returns レスポンスのReadableStreamとReader
   */
  sendStreamingRequest(inputs: Record<string, any>): Promise<{
    response: Response;
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }>;
}

/**
 * ストリームパーサーオプション
 */
export interface StreamParserOptions {
  /**
   * デバッグモードを有効にするかどうか
   */
  debug?: boolean;
}

/**
 * ストリームパーサーインターフェース
 */
export interface StreamParser {
  /**
   * ストリームデータを解析する
   * @param chunk - バイナリチャンク
   * @returns 解析されたイベントデータの配列
   */
  parseChunk(chunk: Uint8Array): StreamingEventData[];
  
  /**
   * バッファをクリアする
   */
  clearBuffer(): void;
  
  /**
   * 現在のバッファを取得する
   * @returns 現在のバッファ
   */
  getBuffer(): string;
}

/**
 * ストリーム処理オプション
 */
export interface StreamProcessorOptions {
  /**
   * デバッグモードを有効にするかどうか
   */
  debug?: boolean;
}

/**
 * ストリームプロセッサインターフェース
 */
export interface StreamProcessor {
  /**
   * ストリームを処理する
   * @param reader - ReadableStreamDefaultReader
   * @param onChunk - チャンク受信時のコールバック関数
   */
  processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void
  ): Promise<void>;
}

/**
 * イベントハンドラーの状態
 */
export interface EventHandlerState {
  /**
   * 累積テキスト
   */
  accumulatedText: string;
  
  /**
   * 最後に送信したコンテンツ
   */
  lastContent: string;
}

/**
 * イベントハンドラーの結果
 */
export interface EventHandlerResult {
  /**
   * 更新された状態
   */
  state: EventHandlerState;
  
  /**
   * イベントが処理されたかどうか
   */
  handled: boolean;
}

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
 * イベントハンドラーインターフェース
 */
export interface EventHandler {
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
   * @param state - 現在の状態
   * @returns 処理結果
   */
  handle(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    state: EventHandlerState
  ): EventHandlerResult;
  
  /**
   * セッションをリセットする
   * 新しいセッションが開始されたときに呼び出す
   */
  resetSession?(): void;
}

/**
 * イベントハンドラーレジストリインターフェース
 */
export interface EventHandlerRegistry {
  /**
   * イベントハンドラーを登録する
   * @param handler - イベントハンドラー
   */
  registerHandler(handler: EventHandler): void;
  
  /**
   * イベントを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param state - 現在の状態
   * @returns 処理結果
   */
  handleEvent(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
    state: EventHandlerState
  ): EventHandlerResult;
  
  /**
   * セッションをリセットする
   */
  resetSession(): void;
}
