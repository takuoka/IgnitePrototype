import type { DifyAPIRequest, DifyAPIResponse } from '@/types'
import { logError } from '@/utils/errorHandler'

/**
 * Calls the Dify API to get inspiration based on lyrics (blocking mode)
 * @param lyrics - The current lyrics to generate inspiration from
 * @returns The inspiration text from the API
 * @throws Error if the API call fails
 */
export const fetchDifyInspiration = async (lyrics: string): Promise<string> => {
  try {
    console.log('🚀 [DifyAPI] ブロッキングAPI呼び出し開始')
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
      response_mode: 'blocking',
      user: 'user-' + Date.now()
    }
    
    console.log('📤 [DifyAPI] リクエスト送信:', JSON.stringify(requestBody, null, 2))

    let response
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log(`🔄 [DifyAPI] レスポンスステータス: ${response.status} ${response.statusText}`)
    } catch (error) {
      console.error('❌ [DifyAPI] フェッチエラー:', error)
      throw error
    }

    if (!response.ok) {
      console.error(`❌ [DifyAPI] APIエラー: ${response.status} ${response.statusText}`)
      const errorData = await response.json()
      console.error('❌ [DifyAPI] エラー詳細:', errorData)
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    console.log('📥 [DifyAPI] レスポンスJSONの解析開始')
    const data = await response.json() as DifyAPIResponse
    
    if (data.data?.outputs?.result) {
      const result = data.data.outputs.result
      console.log(`✅ [DifyAPI] 結果取得成功: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`)
      return result
    } else {
      console.error('❌ [DifyAPI] 無効なレスポンス形式:', data)
      throw new Error('Invalid response format')
    }
  } catch (error) {
    console.error('❌ [DifyAPI] エラー発生:', error)
    logError('DifyAPI', error)
    throw error
  }
}

/**
 * ストリーミングでDify APIを呼び出し、逐次データをコールバックで返す
 * @param lyrics - モチベーション生成の元となる歌詞
 * @param onChunk - 各チャンク受信時に呼ばれるコールバック関数
 */
export const fetchDifyInspirationStream = async (
  lyrics: string,
  onChunk: (chunk: string) => void
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
  
  console.log('📤 [DifyAPI] リクエスト送信:', JSON.stringify(requestBody, null, 2))
  
  let response
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log(`🔄 [DifyAPI] レスポンスステータス: ${response.status} ${response.statusText}`)
  } catch (error) {
    console.error('❌ [DifyAPI] フェッチエラー:', error)
    throw error
  }
  
  if (!response.ok) {
    console.error(`❌ [DifyAPI] APIエラー: ${response.status} ${response.statusText}`)
    const errorData = await response.json()
    console.error('❌ [DifyAPI] エラー詳細:', errorData)
    throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`)
  }
  
  console.log('📥 [DifyAPI] ストリーミング開始')
  
  // ストリームの読み取り開始
  const reader = response.body?.getReader()
  if (!reader) {
    console.error('❌ [DifyAPI] Readable streamがサポートされていません')
    throw new Error('Readable stream is not supported in this environment.')
  }
  
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let chunkCount = 0
  
  // ストリーミングデータを逐次読み取る
  while (true) {
    try {
      const { done, value } = await reader.read()
      
      if (done) {
        console.log('✅ [DifyAPI] ストリーミング完了')
        break
      }
      
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      
      console.log(`📦 [DifyAPI] バイナリチャンク受信 #${++chunkCount}: ${value.length} bytes`)
      
      // イベントは "\n\n" で区切られる
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''
      
      console.log(`🔍 [DifyAPI] イベント分割: ${parts.length}個のイベント検出`)
      
      for (const part of parts) {
        // "data:" 行のみ抽出
        const lines = part.split('\n').filter(line => line.startsWith('data:'))
        
        for (const line of lines) {
          const jsonStr = line.slice(5).trim() // "data:" を除去
          console.log(`📄 [DifyAPI] SSEデータ受信: ${jsonStr.substring(0, 100)}${jsonStr.length > 100 ? '...' : ''}`)
          
          try {
            const eventData = JSON.parse(jsonStr)
            console.log('🔄 [DifyAPI] イベントタイプ:', eventData.event || 'unknown')
            
            let result = null
            
            if (eventData.data?.result) {
              result = eventData.data.result
              console.log('✨ [DifyAPI] data.result検出')
            } else if (eventData.data?.answer) {
              result = eventData.data.answer
              console.log('✨ [DifyAPI] data.answer検出')
            } else if (eventData.result) {
              result = eventData.result
              console.log('✨ [DifyAPI] result検出')
            } else if (eventData.answer) {
              result = eventData.answer
              console.log('✨ [DifyAPI] answer検出')
            } else if (eventData.data?.outputs?.answer) {
              result = eventData.data.outputs.answer
              console.log('✨ [DifyAPI] data.outputs.answer検出')
            } else if (eventData.data?.outputs?.result) {
              result = eventData.data.outputs.result
              console.log('✨ [DifyAPI] data.outputs.result検出')
            } else if (eventData.data?.output?.answer) {
              result = eventData.data.output.answer
              console.log('✨ [DifyAPI] data.output.answer検出')
            } else if (eventData.data?.output?.result) {
              result = eventData.data.output.result
              console.log('✨ [DifyAPI] data.output.result検出')
            } else if (eventData.data?.text) {
              result = eventData.data.text
              console.log('✨ [DifyAPI] data.text検出')
            } else if (eventData.data?.content) {
              result = eventData.data.content
              console.log('✨ [DifyAPI] data.content検出')
            }
            
            if (result) {
              console.log(`📤 [DifyAPI] チャンク送信: ${result.substring(0, 50)}${result.length > 50 ? '...' : ''}`)
              onChunk(result)
            } else {
              console.log('⚠️ [DifyAPI] 結果フィールドなし:', eventData)
              // 詳細なデータ構造をログに出力
              if (eventData.data) {
                console.log('📊 [DifyAPI] data構造:', JSON.stringify(eventData.data, null, 2))
              }
              
              // node_finishedイベントの場合は、メッセージを送信
              if (eventData.event === 'message' || eventData.event === 'node_finished') {
                if (eventData.data && typeof eventData.data === 'object') {
                  // dataオブジェクトの中から文字列フィールドを探す
                  for (const [key, value] of Object.entries(eventData.data)) {
                    if (typeof value === 'string' && value.trim().length > 0) {
                      console.log(`✨ [DifyAPI] data.${key}検出:`, value)
                      onChunk(value)
                      break
                    } else if (value && typeof value === 'object') {
                      // ネストされたオブジェクトの中も探す
                      for (const [nestedKey, nestedValue] of Object.entries(value)) {
                        if (typeof nestedValue === 'string' && nestedValue.trim().length > 0) {
                          console.log(`✨ [DifyAPI] data.${key}.${nestedKey}検出:`, nestedValue)
                          onChunk(nestedValue)
                          break
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ [DifyAPI] JSONパースエラー:', error)
            console.error('❌ [DifyAPI] 問題のJSONデータ:', jsonStr)
          }
        }
      }
    } catch (error) {
      console.error('❌ [DifyAPI] ストリーム読み取りエラー:', error)
      throw error
    }
  }
}
