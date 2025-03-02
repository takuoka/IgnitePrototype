/**
 * Dify API Service
 * 
 * Dify APIとの通信を行うサービス層
 * このファイルは、アプリケーションの他の部分からDify APIを利用するためのメインインターフェースを提供します。
 */

import { logError } from '@/utils/errorHandler';
import { createDifyClient } from './difyClient';
import { createStreamProcessor } from './difyStreamProcessor';

/**
 * ストリーミングでDify APIを呼び出し、逐次データをコールバックで返す
 * @param lyrics - モチベーション生成の元となる歌詞
 * @param onChunk - 各チャンク受信時に呼ばれるコールバック関数
 */
export const fetchDifyInspirationStream = async (
  lyrics: string,
  onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void
): Promise<void> => {
  console.log('🚀 [DifyService] ストリーミングAPI呼び出し開始');
  console.log('📝 [DifyService] 入力歌詞:', lyrics.substring(0, 100) + (lyrics.length > 100 ? '...' : ''));
  
  try {
    // クライアントとストリームプロセッサを作成
    const client = createDifyClient();
    const streamProcessor = createStreamProcessor({ debug: true }); // デバッグモードを有効化
    
    // リクエストデータの準備
    const inputs = {
      currentLyric: lyrics || '歌詞を入力してください'
    };
    
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
