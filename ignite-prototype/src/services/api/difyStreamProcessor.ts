/**
 * Dify API ストリーム処理
 * 
 * Dify APIから返されるストリームデータを処理する機能を提供します。
 */

import { logError } from '@/utils/errorHandler';
import type { StreamingEventData, TextChunkEvent, NodeFinishedEvent, WorkflowFinishedEvent } from '@/types';

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
    onChunk: (chunk: string, isFinal?: boolean) => void
  ): Promise<void>;
}

/**
 * Difyストリームプロセッサ実装
 */
export class DifyStreamProcessor implements StreamProcessor {
  private readonly debug: boolean;
  
  /**
   * コンストラクタ
   * @param options - ストリーム処理オプション
   */
  constructor(options: StreamProcessorOptions = {}) {
    this.debug = options.debug || false;
    
    if (this.debug) {
      console.log('🔧 [DifyStreamProcessor] プロセッサ初期化完了');
    }
  }
  
  /**
   * ストリームを処理する
   * @param reader - ReadableStreamDefaultReader
   * @param onChunk - チャンク受信時のコールバック関数
   */
  async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string, isFinal?: boolean) => void
  ): Promise<void> {
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let chunkCount = 0;
    let accumulatedText = '';
    let lastContent = '';
    
    try {
      // ストリーミングデータを逐次読み取る
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // 最後に累積テキストがあれば送信
          // 改行のみのテキストも処理するように条件を変更
          if (accumulatedText && accumulatedText !== lastContent && (accumulatedText.trim() || accumulatedText.includes('\n'))) {
            if (this.debug) {
              console.log(`🏁 [DifyStreamProcessor] ストリーム終了時の累積テキストを最終結果として送信`);
            }
            this.sendChunk(accumulatedText, true, onChunk, lastContent);
          }
          break;
        }
        
        // バイナリデータをテキストにデコード
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        if (this.debug) {
          console.log(`📦 [DifyStreamProcessor] バイナリチャンク受信 #${++chunkCount}: ${value.length} bytes`);
        }
        
        // イベントは "\n\n" で区切られる
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        
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
              
              // イベントタイプに基づいて処理
              this.processEventData(eventData, onChunk, accumulatedText, lastContent);
              
              // イベント処理の結果を更新
              if (eventData.event === 'text_chunk' && (eventData as TextChunkEvent).data?.text) {
                const text = (eventData as TextChunkEvent).data.text;
                // 改行のみのチャンクも処理するように条件を変更
                if (text && (text.trim() || text.includes('\n')) && text.trim().toLowerCase() !== 'stop') {
                  accumulatedText += text;
                  lastContent = text;
                }
              } else if (eventData.event === 'node_finished' && (eventData as NodeFinishedEvent).data?.outputs?.text) {
                const text = (eventData as NodeFinishedEvent).data.outputs.text;
                // 改行のみのテキストも処理するように条件を変更
                if (text && (text.trim() || text.includes('\n'))) {
                  lastContent = text;
                  accumulatedText = '';
                }
              } else if (eventData.event === 'workflow_finished' && (eventData as WorkflowFinishedEvent).data?.outputs) {
                // outputsから結果を抽出
                for (const [key, value] of Object.entries((eventData as WorkflowFinishedEvent).data.outputs)) {
                  // 改行のみのテキストも処理するように条件を変更
                  if (typeof value === 'string' && (value.trim() || value.includes('\n')) && !this.shouldIgnoreData(key, value)) {
                    lastContent = value;
                    accumulatedText = '';
                    break;
                  }
                }
              }
            } catch (error) {
              console.error('❌ [DifyStreamProcessor] JSONパースエラー:', error);
              logError('DifyStreamProcessor', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [DifyStreamProcessor] ストリーム処理エラー:', error);
      logError('DifyStreamProcessor', error);
      throw error;
    }
  }
  
  /**
   * イベントデータを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   */
  private processEventData(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): void {
    if (eventData.event === 'text_chunk' && (eventData as TextChunkEvent).data?.text) {
      const text = (eventData as TextChunkEvent).data.text;
      // 改行のみのチャンクも処理するように条件を変更
      if (text && (text.trim() || text.includes('\n')) && text.trim().toLowerCase() !== 'stop') {
        this.sendChunk(text, false, onChunk, lastContent);
      }
    } else if (eventData.event === 'node_finished' && (eventData as NodeFinishedEvent).data?.node_type === 'llm' && (eventData as NodeFinishedEvent).data?.outputs?.text) {
      const text = (eventData as NodeFinishedEvent).data.outputs.text;
      // 改行のみのテキストも処理するように条件を変更
      if (text && (text.trim() || text.includes('\n'))) {
        this.sendChunk(text, true, onChunk, lastContent);
      }
    } else if (eventData.event === 'workflow_finished' && (eventData as WorkflowFinishedEvent).data?.outputs) {
      // outputsから結果を抽出
      for (const [key, value] of Object.entries((eventData as WorkflowFinishedEvent).data.outputs)) {
        // 改行のみのテキストも処理するように条件を変更
        if (typeof value === 'string' && (value.trim() || value.includes('\n')) && !this.shouldIgnoreData(key, value)) {
          this.sendChunk(value, true, onChunk, lastContent);
          break;
        }
      }
    }
  }
  
  /**
   * チャンクを送信する
   * @param content - 送信するコンテンツ
   * @param isFinal - 最終結果かどうか
   * @param onChunk - コールバック関数
   * @param lastContent - 前回送信したコンテンツ
   */
  private sendChunk(
    content: string,
    isFinal: boolean,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    lastContent: string
  ): void {
    // 重複チェック - 前回と同じ内容なら送信しない
    // 改行のみのチャンクも処理するように条件を変更
    if (content === lastContent || (!content.trim() && !content.includes('\n'))) {
      if (this.debug) {
        console.log(`⏭️ [DifyStreamProcessor] 重複または空のチャンクをスキップ`);
      }
      return;
    }
    
    if (this.debug) {
      console.log(`📤 [DifyStreamProcessor] チャンク送信: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''} ${isFinal ? '(最終結果)' : ''}`);
      
      // チャンクの詳細ログ（改行を可視化）
      const contentWithVisibleNewlines = content.replace(/\n/g, '\\n');
      console.log(`🔍 [DifyStreamProcessor] チャンク詳細: "${contentWithVisibleNewlines}"`);
      
      // チャンクの文字コード表示
      const charCodes = Array.from(content).map(char => {
        const code = char.charCodeAt(0);
        return `${char}(${code})`;
      }).join(' ');
      console.log(`🔢 [DifyStreamProcessor] チャンク文字コード: ${charCodes}`);
    }
    
    onChunk(content, isFinal);
  }
  
  /**
   * 無視すべきデータかどうかを判定
   * @param key - キー
   * @param value - 値
   * @returns 無視すべきデータかどうか
   */
  private shouldIgnoreData(key: string, value: any): boolean {
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
      if (this.debug) {
        console.log(`⚠️ [DifyStreamProcessor] 入力データと判断してスキップ: ${key}`);
      }
      return true;
    }
    
    // inputsキーは特別扱い - result以外はスキップ
    if (key.includes('inputs') && !key.endsWith('.result')) {
      if (this.debug) {
        console.log(`⚠️ [DifyStreamProcessor] 入力データと判断してスキップ: ${key}`);
      }
      return true;
    }
    
    // "stop"という文字列は無視
    if (typeof value === 'string' && value.trim().toLowerCase() === 'stop') {
      if (this.debug) {
        console.log(`⚠️ [DifyStreamProcessor] "stop"文字列をスキップ`);
      }
      return true;
    }
    
    return false;
  }
}

/**
 * デフォルトのDifyストリームプロセッサインスタンスを作成
 * @param options - ストリーム処理オプション
 * @returns StreamProcessor インスタンス
 */
export function createStreamProcessor(options: StreamProcessorOptions = {}): StreamProcessor {
  return new DifyStreamProcessor(options);
}
