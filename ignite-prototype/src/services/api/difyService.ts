import type { 
  DifyAPIRequest, 
  StreamingEventData, 
  TextChunkEvent,
  WorkflowStartedEvent,
  NodeStartedEvent,
  NodeFinishedEvent,
  WorkflowFinishedEvent
} from '@/types'
import { logError } from '@/utils/errorHandler'

/**
 * Dify API イベントハンドラークラス
 * ストリーミングイベントの処理を担当
 */
class DifyEventHandler {
  private accumulatedText: string = '';
  private lastContent: string = '';
  private onChunkCallback: (chunk: string, isFinal?: boolean) => void;

  constructor(callback: (chunk: string, isFinal?: boolean) => void) {
    this.onChunkCallback = callback;
  }

  /**
   * イベントデータを処理する
   * @param eventData - イベントデータ
   */
  processEvent(eventData: StreamingEventData): void {
    // 無視すべきイベントをスキップ
    if (this.shouldSkipEvent(eventData)) {
      return;
    }

    // イベントタイプに基づいて処理
    switch (eventData.event) {
      case 'text_chunk':
        this.handleTextChunkEvent(eventData as TextChunkEvent);
        break;
      case 'node_finished':
        this.handleNodeFinishedEvent(eventData as NodeFinishedEvent);
        break;
      case 'workflow_finished':
        this.handleWorkflowFinishedEvent(eventData as WorkflowFinishedEvent);
        break;
      default:
        this.handleGenericEvent(eventData);
        break;
    }
  }

  /**
   * ストリーム終了時の処理
   */
  handleStreamEnd(): void {
    // ストリーム終了時に累積テキストがあれば、最終結果として送信
    if (this.accumulatedText && this.accumulatedText !== this.lastContent && this.accumulatedText.trim()) {
      console.log(`🏁 [DifyAPI] ストリーム終了時の累積テキストを最終結果として送信: ${this.getPreview(this.accumulatedText)}`);
      this.sendChunk(this.accumulatedText, true);
    }
  }

  /**
   * テキストチャンクイベントの処理
   * @param event - テキストチャンクイベント
   */
  private handleTextChunkEvent(event: TextChunkEvent): void {
    const text = event.data.text;
    
    if (text && text.trim()) {
      console.log(`✨ [DifyAPI] text_chunkイベント検出: ${text}`);
      
      // "stop"文字列をチェック
      if (text.trim().toLowerCase() === 'stop') {
        console.log(`⚠️ [DifyAPI] "stop"文字列を検出したためスキップ`);
        return;
      }
      
      // テキストを累積
      this.accumulatedText += text;
      console.log(`📝 [DifyAPI] テキスト累積: ${this.getPreview(this.accumulatedText)}`);
      
      // チャンクを送信
      this.sendChunk(text);
    }
  }

  /**
   * ノード完了イベントの処理
   * @param event - ノード完了イベント
   */
  private handleNodeFinishedEvent(event: NodeFinishedEvent): void {
    console.log(`🔄 [DifyAPI] node_finishedイベント検出: ${event.data.node_type} - ${event.data.title}`);
    
    // LLMノード完了の場合は特別処理
    if (event.data.node_type === 'llm') {
      this.handleLLMNodeFinished(event);
      return;
    }
    
    // 最終ノード(end)の場合
    if (event.data.node_type === 'end') {
      this.handleEndNodeFinished(event);
      return;
    }
    
    // その他のノード完了イベント
    if (event.data.outputs) {
      this.extractAndSendContent(event.data.outputs);
    }
  }

  /**
   * LLMノード完了イベントの特別処理
   * @param event - ノード完了イベント
   */
  private handleLLMNodeFinished(event: NodeFinishedEvent): void {
    console.log('🔍 [DifyAPI] LLMノード完了イベント詳細:');
    console.log('🔍 [DifyAPI] node_id:', event.data.node_id);
    console.log('🔍 [DifyAPI] title:', event.data.title);
    
    if (event.data.outputs) {
      console.log('🔍 [DifyAPI] outputs keys:', Object.keys(event.data.outputs));
      
      // outputsの内容をログ出力
      for (const [key, value] of Object.entries(event.data.outputs)) {
        if (typeof value === 'string') {
          console.log(`🔍 [DifyAPI] outputs.${key}: ${this.getPreview(value)}`);
        } else if (value !== null && typeof value === 'object') {
          console.log(`🔍 [DifyAPI] outputs.${key}: [Object]`);
        } else {
          console.log(`🔍 [DifyAPI] outputs.${key}:`, value);
        }
      }
      
      // 特に重要なtext出力を処理
      if (event.data.outputs.text && typeof event.data.outputs.text === 'string') {
        console.log(`🔍 [DifyAPI] outputs.text の完全な内容:`);
        console.log(event.data.outputs.text);
        
        // 最終結果として直接送信
        console.log(`🏁 [DifyAPI] LLMノードの最終結果を直接送信します (isFinal=true)`);
        this.sendChunk(event.data.outputs.text, true);
        
        // 累積テキストをリセット
        this.accumulatedText = '';
      }
    }
  }

  /**
   * 終了ノード完了イベントの処理
   * @param event - ノード完了イベント
   */
  private handleEndNodeFinished(event: NodeFinishedEvent): void {
    // outputs.resultを確認
    if (event.data.outputs?.result && typeof event.data.outputs.result === 'string') {
      console.log(`🏁 [DifyAPI] endノード.outputs.result検出: ${this.getPreview(event.data.outputs.result)}`);
      this.sendChunk(event.data.outputs.result, true);
      this.accumulatedText = '';
      return;
    }
    
    // inputs.resultを確認
    if (event.data.inputs?.result && typeof event.data.inputs.result === 'string') {
      console.log(`🏁 [DifyAPI] endノード.inputs.result検出: ${this.getPreview(event.data.inputs.result)}`);
      this.sendChunk(event.data.inputs.result, true);
      this.accumulatedText = '';
      return;
    }
    
    // 累積テキストがあれば送信
    if (this.accumulatedText) {
      console.log(`🏁 [DifyAPI] 最終結果として累積テキストを送信: ${this.getPreview(this.accumulatedText)}`);
      this.sendChunk(this.accumulatedText, true);
      this.accumulatedText = '';
    }
  }

  /**
   * ワークフロー完了イベントの処理
   * @param event - ワークフロー完了イベント
   */
  private handleWorkflowFinishedEvent(event: WorkflowFinishedEvent): void {
    console.log('🏁 [DifyAPI] workflow_finishedイベント検出');
    
    // outputsから結果を抽出
    if (event.data?.outputs) {
      for (const [key, value] of Object.entries(event.data.outputs)) {
        if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(key, value)) {
          console.log(`✨ [DifyAPI] workflow_finished.outputs.${key}検出: ${this.getPreview(value)}`);
          this.sendChunk(value, true);
          this.accumulatedText = '';
          return;
        }
      }
    }
    
    // 累積テキストがあれば送信
    if (this.accumulatedText) {
      console.log(`🏁 [DifyAPI] 最終結果として累積テキストを送信: ${this.getPreview(this.accumulatedText)}`);
      this.sendChunk(this.accumulatedText, true);
      this.accumulatedText = '';
    }
  }

  /**
   * その他の一般的なイベントの処理
   * @param eventData - イベントデータ
   */
  private handleGenericEvent(eventData: StreamingEventData): void {
    // 一般的なフィールドをチェック
    const dataFields = ['text', 'result', 'answer', 'content'];
    
    for (const field of dataFields) {
      const value = eventData.data?.[field];
      if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(field, value)) {
        console.log(`✨ [DifyAPI] data.${field}検出: ${this.getPreview(value)}`);
        this.sendChunk(value);
        return;
      }
    }
  }

  /**
   * オブジェクトから有効なコンテンツを抽出して送信
   * @param obj - 検査対象オブジェクト
   */
  private extractAndSendContent(obj: Record<string, any>): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.trim() && !this.shouldIgnoreData(key, value)) {
        console.log(`✨ [DifyAPI] ${key}検出: ${this.getPreview(value)}`);
        this.sendChunk(value);
        return;
      }
    }
  }

  /**
   * チャンクを送信する
   * @param content - 送信するコンテンツ
   * @param isFinal - 最終結果かどうか
   */
  private sendChunk(content: string, isFinal: boolean = false): void {
    // 重複チェック - 前回と同じ内容なら送信しない
    if (content === this.lastContent || !content.trim()) {
      console.log(`⏭️ [DifyAPI] 重複または空のチャンクをスキップ`);
      return;
    }
    
    console.log(`📤 [DifyAPI] チャンク送信: ${this.getPreview(content)} ${isFinal ? '(最終結果)' : ''}`);
    this.lastContent = content;
    this.onChunkCallback(content, isFinal);
  }

  /**
   * イベントをスキップすべきかどうかを判定
   * @param eventData - イベントデータ
   * @returns スキップすべきかどうか
   */
  private shouldSkipEvent(eventData: StreamingEventData): boolean {
    // workflow_startedイベントは常にスキップ（入力データを含むため）
    if (eventData.event === 'workflow_started') {
      console.log('⏭️ [DifyAPI] workflow_startedイベントをスキップ（入力データを含む）');
      return true;
    }
    
    // node_startedイベントもスキップ（通常は出力データを含まない）
    if (eventData.event === 'node_started') {
      console.log('⏭️ [DifyAPI] node_startedイベントをスキップ');
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
      console.log(`⚠️ [DifyAPI] 入力データと判断してスキップ: ${key}`);
      return true;
    }
    
    // inputsキーは特別扱い - result以外はスキップ
    if (key.includes('inputs') && !key.endsWith('.result')) {
      console.log(`⚠️ [DifyAPI] 入力データと判断してスキップ: ${key}`);
      return true;
    }
    
    // "stop"という文字列は無視
    if (typeof value === 'string' && value.trim().toLowerCase() === 'stop') {
      console.log(`⚠️ [DifyAPI] "stop"文字列をスキップ`);
      return true;
    }
    
    return false;
  }

  /**
   * テキストのプレビューを取得（長いテキストを省略表示）
   * @param text - テキスト
   * @returns プレビューテキスト
   */
  private getPreview(text: string): string {
    return `${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
  }
}

/**
 * ストリーミングでDify APIを呼び出し、逐次データをコールバックで返す
 * @param lyrics - モチベーション生成の元となる歌詞
 * @param onChunk - 各チャンク受信時に呼ばれるコールバック関数
 */
export const fetchDifyInspirationStream = async (
  lyrics: string,
  onChunk: (chunk: string, isFinal?: boolean) => void
): Promise<void> => {
  console.log('🚀 [DifyAPI] ストリーミングAPI呼び出し開始');
  console.log('📝 [DifyAPI] 入力歌詞:', lyrics.substring(0, 100) + (lyrics.length > 100 ? '...' : ''));
  
  const apiUrl = `${import.meta.env.VITE_DIFY_API_BASE_URL}/workflows/run`;
  const apiKey = import.meta.env.VITE_DIFY_API_KEY;
  
  if (!apiUrl || !apiKey) {
    console.error('❌ [DifyAPI] API設定不足: 環境変数が設定されていません');
    throw new Error('API configuration missing. Check environment variables.');
  }
  
  const requestBody: DifyAPIRequest = {
    inputs: {
      currentLyric: lyrics || '歌詞を入力してください'
    },
    response_mode: 'streaming',
    user: 'user-' + Date.now()
  };
  
  try {
    // APIリクエスト送信
    console.log('📤 [DifyAPI] リクエスト送信:', JSON.stringify(requestBody, null, 2));
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`🔄 [DifyAPI] レスポンスステータス: ${response.status} ${response.statusText}`);
    
    // エラーチェック
    if (!response.ok) {
      console.error(`❌ [DifyAPI] APIエラー: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      console.error('❌ [DifyAPI] エラー詳細:', errorData);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    // ストリーム処理開始
    console.log('📥 [DifyAPI] ストリーミング開始');
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Readable stream is not supported in this environment.');
    }
    
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let chunkCount = 0;
    
    // イベントハンドラーの初期化
    const eventHandler = new DifyEventHandler(onChunk);
    
    // ストリーミングデータを逐次読み取る
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('✅ [DifyAPI] ストリーミング完了');
        eventHandler.handleStreamEnd();
        break;
      }
      
      // バイナリデータをテキストにデコード
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      console.log(`📦 [DifyAPI] バイナリチャンク受信 #${++chunkCount}: ${value.length} bytes`);
      
      // イベントは "\n\n" で区切られる
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      console.log(`🔍 [DifyAPI] イベント分割: ${parts.length}個のイベント検出`);
      
      // 各イベントを処理
      for (const part of parts) {
        // "data:" 行のみ抽出
        const lines = part.split('\n').filter(line => line.startsWith('data:'));
        
        for (const line of lines) {
          const jsonStr = line.slice(5).trim(); // "data:" を除去
          console.log(`📄 [DifyAPI] SSEデータ受信: ${jsonStr.substring(0, 100)}${jsonStr.length > 100 ? '...' : ''}`);
          
          try {
            // JSONパース
            const eventData = JSON.parse(jsonStr) as StreamingEventData;
            console.log('🔄 [DifyAPI] イベントタイプ:', eventData.event || 'unknown');
            
            // イベント処理
            eventHandler.processEvent(eventData);
          } catch (error) {
            console.error('❌ [DifyAPI] JSONパースエラー:', error);
            console.error('❌ [DifyAPI] 問題のJSONデータ:', jsonStr);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ [DifyAPI] ストリーミングエラー:', error);
    logError('DifyAPI', error);
    throw error;
  }
};
