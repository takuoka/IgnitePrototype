import type { DifyAPIRequest, StreamingEventData } from '@/types'
import { logError } from '@/utils/errorHandler'

// UUIDパターン（例: 8bb6df6f-d3d4-482e-90d5-6c57437f3316）
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/**
 * UUIDを削除する関数
 * @param text - 処理するテキスト
 * @returns UUIDが削除されたテキスト
 */
const removeUuid = (text: string): string => {
  if (UUID_PATTERN.test(text)) {
    const cleaned = text.replace(UUID_PATTERN, '');
    console.log(`🔍 [DifyAPI] UUIDを削除しました`);
    return cleaned;
  }
  return text;
};

/**
 * 最終結果かどうかを判定する関数
 * @param eventData - イベントデータ
 * @returns 最終結果かどうか
 */
const isFinalResult = (eventData: StreamingEventData): boolean => {
  // workflow_finishedイベントは最終結果を示す
  if (eventData.event === 'workflow_finished') {
    console.log('🏁 [DifyAPI] workflow_finishedイベント検出 - 最終結果として処理します')
    return true
  }
  
  // node_finishedイベントで、最後のノードの場合も最終結果と見なす
  if (eventData.event === 'node_finished' && eventData.data?.status === 'succeeded') {
    // 通常、最後のノードはoutputsを持っている
    if (eventData.data?.outputs && Object.keys(eventData.data.outputs).length > 0) {
      console.log('🏁 [DifyAPI] 最終ノード完了イベント検出 - 最終結果として処理します')
      return true
    }
  }
  
  return false
};

/**
 * イベントデータから結果テキストを抽出する関数
 * @param eventData - イベントデータ
 * @returns 抽出された結果テキスト、または null
 */
const extractResultText = (eventData: StreamingEventData): string | null => {
  if (eventData.data?.result) {
    console.log('✨ [DifyAPI] data.result検出')
    return eventData.data.result
  } 
  if (eventData.data?.answer) {
    console.log('✨ [DifyAPI] data.answer検出')
    return eventData.data.answer
  } 
  if (eventData.result) {
    console.log('✨ [DifyAPI] result検出')
    return eventData.result
  } 
  if (eventData.answer) {
    console.log('✨ [DifyAPI] answer検出')
    return eventData.answer
  } 
  if (eventData.data?.outputs?.answer) {
    console.log('✨ [DifyAPI] data.outputs.answer検出')
    return eventData.data.outputs.answer
  } 
  if (eventData.data?.outputs?.result) {
    console.log('✨ [DifyAPI] data.outputs.result検出')
    return eventData.data.outputs.result
  } 
  if (eventData.data?.output?.answer) {
    console.log('✨ [DifyAPI] data.output.answer検出')
    return eventData.data.output.answer
  } 
  if (eventData.data?.output?.result) {
    console.log('✨ [DifyAPI] data.output.result検出')
    return eventData.data.output.result
  } 
  if (eventData.data?.text) {
    console.log('✨ [DifyAPI] data.text検出')
    return eventData.data.text
  } 
  if (eventData.data?.content) {
    console.log('✨ [DifyAPI] data.content検出')
    return eventData.data.content
  }
  
  return null
};

/**
 * データオブジェクトから文字列を探して処理する関数
 * @param obj - 処理するオブジェクト
 * @param prefix - ログ出力用のプレフィックス
 * @param eventData - イベントデータ
 * @param lastContent - 前回の内容
 * @param onChunk - チャンク処理コールバック
 * @returns 処理が完了したかどうか
 */
const processDataObject = (
  obj: Record<string, any>, 
  prefix: string,
  eventData: StreamingEventData,
  lastContent: string,
  onChunk: (chunk: string, isFinal?: boolean) => void
): boolean => {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      console.log(`✨ [DifyAPI] ${prefix}${key}検出:`, value)
      // UUIDを削除して送信
      const cleanedValue = removeUuid(value);
      if (cleanedValue !== lastContent && cleanedValue.trim()) {
        // 最終結果かどうかをチェック
        const final = isFinalResult(eventData);
        console.log(`📤 [DifyAPI] チャンク送信: ${cleanedValue.substring(0, 50)}${cleanedValue.length > 50 ? '...' : ''} ${final ? '(最終結果)' : ''}`)
        onChunk(cleanedValue, final)
        return true; // 処理完了
      }
    } else if (value && typeof value === 'object') {
      // ネストされたオブジェクトを再帰的に処理
      if (processDataObject(value, `${prefix}${key}.`, eventData, lastContent, onChunk)) {
        return true; // 子オブジェクトで処理完了
      }
    }
  }
  return false; // 処理対象なし
};

/**
 * ストリーミングでDify APIを呼び出し、逐次データをコールバックで返す
 * @param lyrics - モチベーション生成の元となる歌詞
 * @param onChunk - 各チャンク受信時に呼ばれるコールバック関数
 */
export const fetchDifyInspirationStream = async (
  lyrics: string,
  onChunk: (chunk: string, isFinal?: boolean) => void
): Promise<void> => {
  console.log('🚀 [DifyAPI] ストリーミングAPI呼び出し開始')
  console.log('📝 [DifyAPI] 入力歌詞:', lyrics.substring(0, 100) + (lyrics.length > 100 ? '...' : ''))
  
  const apiUrl = `${import.meta.env.VITE_DIFY_API_BASE_URL}/workflows/run`
  const apiKey = import.meta.env.VITE_DIFY_API_KEY
  
  if (!apiUrl || !apiKey) {
    console.error('❌ [DifyAPI] API設定不足: 環境変数が設定されていません')
    throw new Error('API configuration missing. Check environment variables.')
  }
  
  const requestBody: DifyAPIRequest = {
    inputs: {
      currentLyric: lyrics || '歌詞を入力してください'
    },
    response_mode: 'streaming',
    user: 'user-' + Date.now()
  }
  
  try {
    // APIリクエスト送信
    console.log('📤 [DifyAPI] リクエスト送信:', JSON.stringify(requestBody, null, 2))
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log(`🔄 [DifyAPI] レスポンスステータス: ${response.status} ${response.statusText}`)
    
    // エラーチェック
    if (!response.ok) {
      console.error(`❌ [DifyAPI] APIエラー: ${response.status} ${response.statusText}`)
      const errorData = await response.json()
      console.error('❌ [DifyAPI] エラー詳細:', errorData)
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }
    
    // ストリーム処理開始
    console.log('📥 [DifyAPI] ストリーミング開始')
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Readable stream is not supported in this environment.')
    }
    
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let chunkCount = 0
    let lastContent = ''
    
    // ストリーミングデータを逐次読み取る
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        console.log('✅ [DifyAPI] ストリーミング完了')
        break
      }
      
      // バイナリデータをテキストにデコード
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      console.log(`📦 [DifyAPI] バイナリチャンク受信 #${++chunkCount}: ${value.length} bytes`)
      
      // イベントは "\n\n" で区切られる
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''
      console.log(`🔍 [DifyAPI] イベント分割: ${parts.length}個のイベント検出`)
      
      // 各イベントを処理
      for (const part of parts) {
        // "data:" 行のみ抽出
        const lines = part.split('\n').filter(line => line.startsWith('data:'))
        
        for (const line of lines) {
          const jsonStr = line.slice(5).trim() // "data:" を除去
          console.log(`📄 [DifyAPI] SSEデータ受信: ${jsonStr.substring(0, 100)}${jsonStr.length > 100 ? '...' : ''}`)
          
          try {
            // JSONパース
            const eventData = JSON.parse(jsonStr) as StreamingEventData
            console.log('🔄 [DifyAPI] イベントタイプ:', eventData.event || 'unknown')
            
            // 結果テキストを抽出
            let result = extractResultText(eventData);
            
            if (result) {
              // UUIDを削除
              result = removeUuid(result);
              
              // 最終結果かどうかをチェック
              const final = isFinalResult(eventData);
              
              // 重複チェック - 前回と同じ内容なら送信しない
              if (result !== lastContent && result.trim()) {
                console.log(`📤 [DifyAPI] チャンク送信: ${result.substring(0, 50)}${result.length > 50 ? '...' : ''} ${final ? '(最終結果)' : ''}`)
                lastContent = result;
                onChunk(result, final)
              } else {
                console.log(`⏭️ [DifyAPI] 重複または空のチャンクをスキップ`)
              }
            } else {
              console.log('⚠️ [DifyAPI] 結果フィールドなし:', eventData)
              
              // node_finishedイベントの場合は、メッセージを送信
              if ((eventData.event === 'message' || eventData.event === 'node_finished') && 
                  eventData.data && typeof eventData.data === 'object') {
                // データオブジェクトを処理
                processDataObject(eventData.data, 'data.', eventData, lastContent, onChunk);
              }
            }
          } catch (error) {
            console.error('❌ [DifyAPI] JSONパースエラー:', error)
            console.error('❌ [DifyAPI] 問題のJSONデータ:', jsonStr)
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ [DifyAPI] ストリーミングエラー:', error)
    logError('DifyAPI', error)
    throw error
  }
}
