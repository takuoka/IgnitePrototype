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
 * @param favoriteLyrics - 好きな歌詞
 * @param onChunk - 各チャンク受信時に呼ばれるコールバック関数
 * @param globalInstruction - ユーザー指示
 */
export const fetchDifyInspirationStream = async (
  lyrics: string,
  favoriteLyrics: string = '',
  onChunk: (chunk: string, isWorkflowCompletion?: boolean) => void,
  globalInstruction: string = ''
): Promise<void> => {
  console.log('🚀 [DifyService] ストリーミングAPI呼び出し開始');
  console.log('📝 [DifyService] 入力歌詞:', lyrics.substring(0, 100) + (lyrics.length > 100 ? '...' : ''));
  console.log('📝 [DifyService] 好きな歌詞:', favoriteLyrics.substring(0, 100) + (favoriteLyrics.length > 100 ? '...' : ''));
  console.log('📝 [DifyService] ユーザー指示:', globalInstruction.substring(0, 100) + (globalInstruction.length > 100 ? '...' : ''));
  
  try {
    // クライアントとストリームプロセッサを作成
    const client = createDifyClient();
    const streamProcessor = createStreamProcessor({ debug: true }); // デバッグモードを有効化
    
    // リクエストデータの準備
    const inputs: {
      currentLyric: string;
      favorite_lyrics: string;
      global_instruction?: string;
    } = {
      currentLyric: lyrics || '歌詞を入力してください',
      favorite_lyrics: favoriteLyrics
    };

    // ユーザー指示が存在する場合は追加
    if (globalInstruction) {
      inputs.global_instruction = globalInstruction;
    }
    
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
