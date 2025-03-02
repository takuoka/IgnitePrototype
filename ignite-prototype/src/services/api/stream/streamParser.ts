/**
 * ストリームパーサー
 * 
 * ストリームデータを解析する機能を提供します。
 */

import { logError, getJsonParseErrorDetails } from '@/utils/errorHandler';
import type { StreamingEventData } from '@/types';
import type { StreamParser, StreamParserOptions } from '@/types/api';

/**
 * 基本的なストリームパーサー実装
 */
export class BaseStreamParser implements StreamParser {
  protected readonly debug: boolean;
  protected buffer: string = '';
  protected readonly decoder: TextDecoder;
  protected chunkCount: number = 0;
  
  /**
   * コンストラクタ
   * @param options - ストリームパーサーオプション
   */
  constructor(options: StreamParserOptions = {}) {
    this.debug = options.debug || false;
    this.decoder = new TextDecoder('utf-8');
    
    if (this.debug) {
      console.log('🔧 [StreamParser] パーサー初期化完了');
    }
  }
  
  /**
   * ストリームデータを解析する
   * @param chunk - バイナリチャンク
   * @returns 解析されたイベントデータの配列
   */
  parseChunk(chunk: Uint8Array): StreamingEventData[] {
    // バイナリデータをテキストにデコード
    const text = this.decoder.decode(chunk, { stream: true });
    this.buffer += text;
    
    if (this.debug) {
      console.log(`📦 [StreamParser] バイナリチャンク受信 #${++this.chunkCount}: ${chunk.length} bytes`);
    }
    
    // イベントは "\n\n" で区切られる
    const parts = this.buffer.split('\n\n');
    this.buffer = parts.pop() || '';
    
    const events: StreamingEventData[] = [];
    
    // 各イベントを処理
    for (const part of parts) {
      // "data:" 行のみ抽出
      const lines = part.split('\n').filter(line => line.startsWith('data:'));
      
      for (const line of lines) {
        const jsonStr = line.slice(5).trim(); // "data:" を除去
        
        if (!jsonStr) continue;
        
        try {
          // JSONパース
          const eventData = JSON.parse(jsonStr) as StreamingEventData;
          events.push(eventData);
        } catch (error) {
          // 詳細なエラー情報を取得して出力
          const errorDetails = getJsonParseErrorDetails(error, jsonStr);
          console.error(`❌ [StreamParser] ${errorDetails}`);
          
          // スタックトレースも出力
          logError('StreamParser', error);
        }
      }
    }
    
    return events;
  }
  
  /**
   * バッファをクリアする
   */
  clearBuffer(): void {
    this.buffer = '';
  }
  
  /**
   * 現在のバッファを取得する
   * @returns 現在のバッファ
   */
  getBuffer(): string {
    return this.buffer;
  }
}

/**
 * デフォルトのストリームパーサーインスタンスを作成
 * @param options - ストリームパーサーオプション
 * @returns StreamParser インスタンス
 */
export function createStreamParser(options: StreamParserOptions = {}): StreamParser {
  return new BaseStreamParser(options);
}
