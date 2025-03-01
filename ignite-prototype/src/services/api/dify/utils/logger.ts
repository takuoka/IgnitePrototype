/**
 * Dify API Logger
 * 
 * A simple logger for Dify API services with configurable log levels
 */

/**
 * ログレベルの定義
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * 現在の環境に基づいてログレベルを設定
 * 開発環境ではより詳細なログを出力し、本番環境では最小限のログに制限
 */
const DEFAULT_LOG_LEVEL = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO;

/**
 * Dify API用のロガークラス
 */
export class DifyLogger {
  private context: string;
  private logLevel: LogLevel;

  /**
   * ロガーを初期化
   * @param context - ログのコンテキスト名
   * @param logLevel - ログレベル（省略時は環境に基づいて自動設定）
   */
  constructor(context: string, logLevel: LogLevel = DEFAULT_LOG_LEVEL) {
    this.context = context;
    this.logLevel = logLevel;
  }

  /**
   * エラーログを出力
   * @param message - ログメッセージ
   * @param data - 追加データ（オプション）
   */
  error(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(`❌ [DifyAPI:${this.context}] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * 警告ログを出力
   * @param message - ログメッセージ
   * @param data - 追加データ（オプション）
   */
  warn(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(`⚠️ [DifyAPI:${this.context}] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * 情報ログを出力
   * @param message - ログメッセージ
   * @param data - 追加データ（オプション）
   */
  info(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(`ℹ️ [DifyAPI:${this.context}] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * デバッグログを出力
   * @param message - ログメッセージ
   * @param data - 追加データ（オプション）
   */
  debug(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.debug(`🔍 [DifyAPI:${this.context}] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * ログレベルを設定
   * @param level - 新しいログレベル
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * テキストのプレビューを取得（長いテキストを省略表示）
   * @param text - テキスト
   * @param maxLength - 最大長（デフォルト: 50）
   * @returns プレビューテキスト
   */
  static getPreview(text: string, maxLength: number = 50): string {
    if (!text) return '';
    return `${text.substring(0, maxLength)}${text.length > maxLength ? '...' : ''}`;
  }
}
