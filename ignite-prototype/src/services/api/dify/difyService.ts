/**
 * Dify API Service
 * 
 * Dify APIとの通信を行うサービス層
 * このファイルは、アプリケーションの他の部分からDify APIを利用するためのメインインターフェースを提供します。
 */

import { logError } from '@/utils/errorHandler';
import { createDifyClient } from './difyClient';
import { createDifyStreamProcessor } from './difyStreamProcessor';
import { apiRegistry } from '../core/apiRegistry';

/**
 * ストリーミングでDify APIを呼び出し、逐次データをコールバックで返す
 * @param apiName - 使用するAPI名
 * @param inputs - 入力データ
 * @param onChunk - 各チャンク受信時に呼ばれるコールバック関数
 */
export const fetchDifyInspirationStream = async (
  apiName: string = 'default',
  inputs: Record<string, any> = {},
  onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void
): Promise<void> => {
  console.log(`🚀 [DifyService] ストリーミングAPI呼び出し開始 (API: ${apiName})`);
  
  try {
    // API定義を取得
    const apiDef = apiRegistry.getApiDefinition(apiName);
    if (!apiDef) {
      throw new Error(`API定義 "${apiName}" が見つかりません`);
    }
    
    // クライアントとストリームプロセッサを作成
    const client = createDifyClient(apiName);
    const streamProcessor = createDifyStreamProcessor({ debug: true });
    
    // 入力データをログ出力
    Object.entries(inputs).forEach(([key, value]) => {
      if (typeof value === 'string') {
        console.log(`📝 [DifyService] ${key}:`, value.substring(0, 100) + (value.length > 100 ? '...' : ''));
      }
    });
    
    // ストリーミングリクエストを送信
    const { reader } = await client.sendStreamingRequest(inputs);
    
    // ストリームを処理
    await streamProcessor.processStream(reader, onChunk);
    
    console.log('✅ [DifyService] ストリーミング完了');
  } catch (error) {
    console.error('❌ [DifyService] ストリーミングエラー:', error);
    logError('DifyService', error);
    throw error;
  }
};

/**
 * 後方互換性のための関数
 * 従来の引数形式でDify APIを呼び出す
 * @param lyrics - モチベーション生成の元となる歌詞
 * @param favoriteLyrics - 好きな歌詞
 * @param onChunk - 各チャンク受信時に呼ばれるコールバック関数
 * @param globalInstruction - ユーザー指示
 */
export const fetchDifyInspirationStreamLegacy = async (
  lyrics: string,
  favoriteLyrics: string = '',
  onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
  globalInstruction: string = ''
): Promise<void> => {
  // 入力データを準備
  const inputs: Record<string, any> = {
    currentLyric: lyrics || '歌詞を入力してください',
    favorite_lyrics: favoriteLyrics
  };

  // ユーザー指示が存在する場合は追加
  if (globalInstruction) {
    inputs.global_instruction = globalInstruction;
  }
  
  // 新しい関数を呼び出す
  return fetchDifyInspirationStream('default', inputs, onChunk);
};
