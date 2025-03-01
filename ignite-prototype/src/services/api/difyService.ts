/**
 * Dify API Service
 * 
 * Uses the official Dify client library to interact with the Dify API
 */

import { CompletionClient } from 'dify-client';
import { logError } from '@/utils/errorHandler';

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
  
  const apiBaseUrl = import.meta.env.VITE_DIFY_API_BASE_URL;
  const apiKey = import.meta.env.VITE_DIFY_API_KEY;
  
  if (!apiBaseUrl || !apiKey) {
    console.error('❌ [DifyAPI] API設定不足: 環境変数が設定されていません');
    throw new Error('API configuration missing. Check environment variables.');
  }
  
  // Dify公式クライアントライブラリを使用
  const client = new CompletionClient(apiKey, apiBaseUrl);
  const userId = 'user-' + Date.now();
  
  try {
    // リクエストデータの準備
    const inputs = {
      currentLyric: lyrics || '歌詞を入力してください'
    };
    
    console.log('📤 [DifyAPI] リクエスト送信:', JSON.stringify(inputs, null, 2));
    
    // 直接fetchを使用してストリーミングAPIを呼び出す
    const apiUrl = `${apiBaseUrl}/workflows/run`;
    
    console.log('📥 [DifyAPI] ストリーミング開始');
    
    const fetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs,
        user: userId,
        response_mode: 'streaming'
      })
    });
    
    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error(`❌ [DifyAPI] APIエラー: ${fetchResponse.status} ${fetchResponse.statusText}`, errorText);
      throw new Error(`API error: ${fetchResponse.status} - ${errorText}`);
    }
    
    // ReadableStreamを取得
    const reader = fetchResponse.body?.getReader();
    if (!reader) {
      throw new Error('Readable stream is not supported in this environment.');
    }
    
    // ストリームを処理
    await processStream(reader, onChunk);
    
    console.log('✅ [DifyAPI] ストリーミング完了');
  } catch (error) {
    console.error('❌ [DifyAPI] ストリーミングエラー:', error);
    logError('DifyAPI', error);
    throw error;
  }
};

/**
 * ストリームを処理する
 * @param reader - ReadableStreamDefaultReader
 * @param onChunk - チャンク受信時のコールバック関数
 */
async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (chunk: string, isFinal?: boolean) => void
): Promise<void> {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let chunkCount = 0;
  let accumulatedText = '';
  let lastContent = '';
  
  // ストリーミングデータを逐次読み取る
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      // 最後に累積テキストがあれば送信
      if (accumulatedText && accumulatedText !== lastContent && accumulatedText.trim()) {
        console.log(`🏁 [DifyAPI] ストリーム終了時の累積テキストを最終結果として送信`);
        sendChunk(accumulatedText, true, onChunk, lastContent);
      }
      break;
    }
    
    // バイナリデータをテキストにデコード
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    console.log(`📦 [DifyAPI] バイナリチャンク受信 #${++chunkCount}: ${value.length} bytes`);
    
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
          const eventData = JSON.parse(jsonStr);
          
          // イベントタイプに基づいて処理
          if (eventData.event === 'text_chunk' && eventData.data?.text) {
            const text = eventData.data.text;
            if (text && text.trim() && text.trim().toLowerCase() !== 'stop') {
              accumulatedText += text;
              sendChunk(text, false, onChunk, lastContent);
              lastContent = text;
            }
          } else if (eventData.event === 'node_finished' && eventData.data?.node_type === 'llm' && eventData.data?.outputs?.text) {
            const text = eventData.data.outputs.text;
            if (text && text.trim()) {
              sendChunk(text, true, onChunk, lastContent);
              lastContent = text;
              accumulatedText = '';
            }
          } else if (eventData.event === 'workflow_finished' && eventData.data?.outputs) {
            // outputsから結果を抽出
            for (const [key, value] of Object.entries(eventData.data.outputs)) {
              if (typeof value === 'string' && value.trim() && !shouldIgnoreData(key, value)) {
                sendChunk(value, true, onChunk, lastContent);
                lastContent = value;
                accumulatedText = '';
                break;
              }
            }
          }
        } catch (error) {
          console.error('❌ [DifyAPI] JSONパースエラー:', error);
        }
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
function sendChunk(
  content: string,
  isFinal: boolean,
  onChunk: (chunk: string, isFinal?: boolean) => void,
  lastContent: string
): void {
  // 重複チェック - 前回と同じ内容なら送信しない
  if (content === lastContent || !content.trim()) {
    console.log(`⏭️ [DifyAPI] 重複または空のチャンクをスキップ`);
    return;
  }
  
  console.log(`📤 [DifyAPI] チャンク送信: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''} ${isFinal ? '(最終結果)' : ''}`);
  onChunk(content, isFinal);
}

/**
 * 無視すべきデータかどうかを判定
 * @param key - キー
 * @param value - 値
 * @returns 無視すべきデータかどうか
 */
function shouldIgnoreData(key: string, value: any): boolean {
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
