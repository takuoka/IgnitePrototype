/**
 * Dify API イベントハンドラー
 * 
 * Dify APIから返されるイベントデータを処理する機能を提供します。
 */

import type { StreamingEventData, TextChunkEvent, NodeFinishedEvent, WorkflowFinishedEvent } from '@/types';

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
   * イベントデータを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @returns 処理結果（累積テキストと最後のコンテンツ）
   */
  handleEvent(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): { accumulatedText: string; lastContent: string };
}

/**
 * Difyイベントハンドラー実装
 */
export class DifyEventHandler implements EventHandler {
  private readonly debug: boolean;
  private readonly contentFilter: ContentFilter;
  
  /**
   * コンストラクタ
   * @param options - イベントハンドラーオプション
   * @param contentFilter - コンテンツフィルター
   */
  constructor(
    options: EventHandlerOptions = {},
    contentFilter: ContentFilter = new DifyContentFilter(options)
  ) {
    this.debug = options.debug || false;
    this.contentFilter = contentFilter;
    
    if (this.debug) {
      console.log('🔧 [DifyEventHandler] ハンドラー初期化完了');
    }
  }
  
  /**
   * イベントデータを処理する
   * @param eventData - イベントデータ
   * @param onChunk - コールバック関数
   * @param accumulatedText - 累積テキスト
   * @param lastContent - 前回送信したコンテンツ
   * @returns 処理結果（累積テキストと最後のコンテンツ）
   */
  handleEvent(
    eventData: StreamingEventData,
    onChunk: (chunk: string, isFinal?: boolean) => void,
    accumulatedText: string,
    lastContent: string
  ): { accumulatedText: string; lastContent: string } {
    let newAccumulatedText = accumulatedText;
    let newLastContent = lastContent;
    
    if (eventData.event === 'text_chunk' && (eventData as TextChunkEvent).data?.text) {
      const text = (eventData as TextChunkEvent).data.text;
      // 改行のみのチャンクも処理するように条件を変更
      if (text && (text.trim() || text.includes('\n')) && text.trim().toLowerCase() !== 'stop') {
        this.sendChunk(text, false, onChunk, lastContent);
        newAccumulatedText += text;
        newLastContent = text;
      }
    } else if (eventData.event === 'node_finished' && (eventData as NodeFinishedEvent).data?.node_type === 'llm' && (eventData as NodeFinishedEvent).data?.outputs?.text) {
      const text = (eventData as NodeFinishedEvent).data.outputs.text;
      // 改行のみのテキストも処理するように条件を変更
      if (text && (text.trim() || text.includes('\n'))) {
        this.sendChunk(text, true, onChunk, lastContent);
        newLastContent = text;
        newAccumulatedText = '';
      }
    } else if (eventData.event === 'workflow_finished' && (eventData as WorkflowFinishedEvent).data?.outputs) {
      const outputs = (eventData as WorkflowFinishedEvent).data.outputs;
      
      // 新しいフィールド（advice, phrases, words）が存在するか確認
      if (outputs.advice || outputs.phrases || outputs.words) {
        // 複数フィールドを連結して表示
        const sections = [];
        
        if (outputs.advice && typeof outputs.advice === 'string' && (outputs.advice.trim() || outputs.advice.includes('\n'))) {
          sections.push(`## アドバイス\n\n${outputs.advice}`);
        }
        
        if (outputs.phrases && typeof outputs.phrases === 'string' && (outputs.phrases.trim() || outputs.phrases.includes('\n'))) {
          sections.push(`## フレーズ\n\n${outputs.phrases}`);
        }
        
        if (outputs.words && typeof outputs.words === 'string' && (outputs.words.trim() || outputs.words.includes('\n'))) {
          sections.push(`## キーワード\n\n${outputs.words}`);
        }
        
        if (sections.length > 0) {
          const combinedContent = sections.join('\n\n');
          this.sendChunk(combinedContent, true, onChunk, lastContent);
          newLastContent = combinedContent;
          newAccumulatedText = '';
        }
      } else {
        // 従来の処理（後方互換性のため）
        for (const [key, value] of Object.entries(outputs)) {
          // 改行のみのテキストも処理するように条件を変更
          if (typeof value === 'string' && (value.trim() || value.includes('\n')) && !this.contentFilter.shouldIgnoreData(key, value)) {
            this.sendChunk(value, true, onChunk, lastContent);
            newLastContent = value;
            newAccumulatedText = '';
            break;
          }
        }
      }
    } else if (eventData.event === 'node_finished' && (eventData as NodeFinishedEvent).data?.outputs?.text) {
      const text = (eventData as NodeFinishedEvent).data.outputs.text;
      // 改行のみのテキストも処理するように条件を変更
      if (text && (text.trim() || text.includes('\n'))) {
        newLastContent = text;
        newAccumulatedText = '';
      }
    }
    
    return { accumulatedText: newAccumulatedText, lastContent: newLastContent };
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
        console.log(`⏭️ [DifyEventHandler] 重複または空のチャンクをスキップ`);
      }
      return;
    }
    
    if (this.debug) {
      console.log(`📤 [DifyEventHandler] チャンク送信: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''} ${isFinal ? '(最終結果)' : ''}`);
      
      // チャンクの詳細ログ（改行を可視化）
      const contentWithVisibleNewlines = content.replace(/\n/g, '\\n');
      console.log(`🔍 [DifyEventHandler] チャンク詳細: "${contentWithVisibleNewlines}"`);
      
      // チャンクの文字コード表示
      const charCodes = Array.from(content).map(char => {
        const code = char.charCodeAt(0);
        return `${char}(${code})`;
      }).join(' ');
      console.log(`🔢 [DifyEventHandler] チャンク文字コード: ${charCodes}`);
    }
    
    onChunk(content, isFinal);
  }
}

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
 * デフォルトのDifyイベントハンドラーインスタンスを作成
 * @param options - イベントハンドラーオプション
 * @returns EventHandler インスタンス
 */
export function createEventHandler(options: EventHandlerOptions = {}): EventHandler {
  return new DifyEventHandler(options);
}
