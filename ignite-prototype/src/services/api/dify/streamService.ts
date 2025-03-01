/**
 * Dify API Stream Service
 * 
 * Handles streaming API calls to Dify
 */

import type { DifyAPIRequest } from '@/types';
import { logError } from '@/utils/errorHandler';
import { EventHandlerFactory } from './eventHandlers/eventHandlerFactory';
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
  
  const apiUrl = `${import.meta.env.VITE_DIFY_API_BASE_URL}/workflows/run`;
  const apiKey = import.meta.env.VITE_DIFY_API_KEY;
  
  if (!apiUrl || !apiKey) {
    logger.error('API設定不足: 環境変数が設定されていません');
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
    logger.debug('リクエスト送信:', JSON.stringify(requestBody, null, 2));
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    logger.info(`レスポンスステータス: ${response.status} ${response.statusText}`);
    
    // エラーチェック
    if (!response.ok) {
      logger.error(`APIエラー: ${response.status} ${response.statusText}`);
      const errorData = await response.json();
      logger.error('エラー詳細:', errorData);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    // ストリーム処理開始
    logger.info('ストリーミング開始');
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Readable stream is not supported in this environment.');
    }
    
    // イベントハンドラーの初期化
    const eventHandler = EventHandlerFactory.createHandler(onChunk);
    
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
    logger.debug(`イベント分割: ${parts.length}個のイベント検出`);
    
    // 各イベントを処理
    for (const part of parts) {
      await processEventPart(part, eventHandler);
    }
  }
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
    logger.debug(`SSEデータ受信: ${jsonStr.substring(0, 100)}${jsonStr.length > 100 ? '...' : ''}`);
    
    try {
      // JSONパース
      const eventData = JSON.parse(jsonStr);
      logger.debug('イベントタイプ:', eventData.event || 'unknown');
      
      // イベント処理
      await eventHandler.processEvent(eventData);
    } catch (error) {
      logger.error('JSONパースエラー:', error);
      logger.error('問題のJSONデータ:', jsonStr);
    }
  }
}
