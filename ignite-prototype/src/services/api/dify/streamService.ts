/**
 * Dify API Stream Service
 * 
 * Handles streaming API calls to Dify using the official client library
 */

import { CompletionClient } from 'dify-client';
import { logError } from '@/utils/errorHandler';
import { EventHandlerFactory } from '../dify/eventHandlers/eventHandlerFactory';
import { DifyLogger } from './utils/logger';

const logger = new DifyLogger('StreamService');

/**
 * ストリーミングでDify APIを呼び出し、逐次データをコールバックで返す
 * @param lyrics - モチベーション生成の元となる歌詞
 * @param onChunk - 各チャンク受信時に呼ばれるコールバック関数
 */
export const fetchDifyInspirationStream = async (
  lyrics: string,
  onChunk: (chunk: string, isFinal?: boolean) => void
): Promise<void> => {
  logger.info('ストリーミングAPI呼び出し開始');
  logger.info(`入力歌詞: ${lyrics.substring(0, 100)}${lyrics.length > 100 ? '...' : ''}`);
  
  const apiBaseUrl = import.meta.env.VITE_DIFY_API_BASE_URL;
  const apiKey = import.meta.env.VITE_DIFY_API_KEY;
  
  if (!apiBaseUrl || !apiKey) {
    logger.error('API設定不足: 環境変数が設定されていません');
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
    
    logger.debug('リクエスト送信:', JSON.stringify(inputs, null, 2));
    
    // イベントハンドラーの初期化
    const eventHandler = EventHandlerFactory.createHandler(onChunk);
    
    // 直接fetchを使用してストリーミングAPIを呼び出す
    const apiUrl = `${apiBaseUrl}/workflows/run`;
    
    logger.info('ストリーミング開始');
    
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
      logger.error(`APIエラー: ${fetchResponse.status} ${fetchResponse.statusText}`, errorText);
      throw new Error(`API error: ${fetchResponse.status} - ${errorText}`);
    }
    
    // ReadableStreamを取得
    const reader = fetchResponse.body?.getReader();
    if (!reader) {
      throw new Error('Readable stream is not supported in this environment.');
    }
    
    // ストリームを処理
    await processStream(reader, eventHandler);
    
    logger.info('ストリーミング完了');
    eventHandler.handleStreamEnd();
  } catch (error) {
    logger.error('ストリーミングエラー:', error);
    logError('DifyAPI', error);
    throw error;
  }
};

/**
 * ストリームを処理する
 * @param reader - ReadableStreamDefaultReader
 * @param eventHandler - イベントハンドラー
 */
async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  eventHandler: ReturnType<typeof EventHandlerFactory.createHandler>
): Promise<void> {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let chunkCount = 0;
  const pendingProcesses: Promise<void>[] = [];
  
  // ストリーミングデータを逐次読み取る
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }
    
    // バイナリデータをテキストにデコード
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    logger.debug(`バイナリチャンク受信 #${++chunkCount}: ${value.length} bytes`);
    
    // イベントは "\n\n" で区切られる
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    
    if (parts.length > 0) {
      logger.debug(`イベント分割: ${parts.length}個のイベント検出`);
    }
    
    // 各イベントを処理（非同期処理を待たないが、追跡する）
    for (const part of parts) {
      const process = processEventPart(part, eventHandler).catch(error => {
        logger.error('イベント処理エラー:', error);
      });
      pendingProcesses.push(process);
    }
  }
  
  // 残りのバッファを処理
  if (buffer.trim()) {
    const process = processEventPart(buffer, eventHandler).catch(error => {
      logger.error('イベント処理エラー:', error);
    });
    pendingProcesses.push(process);
  }
  
  // 全ての処理が完了するのを待つ
  await Promise.all(pendingProcesses);
}

/**
 * イベントパートを処理する
 * @param part - イベントパート
 * @param eventHandler - イベントハンドラー
 */
async function processEventPart(
  part: string,
  eventHandler: ReturnType<typeof EventHandlerFactory.createHandler>
): Promise<void> {
  // "data:" 行のみ抽出
  const lines = part.split('\n').filter(line => line.startsWith('data:'));
  
  for (const line of lines) {
    const jsonStr = line.slice(5).trim(); // "data:" を除去
    
    if (!jsonStr) continue;
    
    try {
      // JSONパース
      const eventData = JSON.parse(jsonStr);
      
      // イベント処理
      await eventHandler.processEvent(eventData);
    } catch (error) {
      logger.error('JSONパースエラー:', error);
      logger.error('問題のJSONデータ:', jsonStr);
    }
  }
}
