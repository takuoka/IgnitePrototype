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
  
  // node_finishedイベントで、node_typeがendの場合も最終結果と見なす
  if (eventData.event === 'node_finished' && eventData.data?.node_type === 'end') {
    console.log('🏁 [DifyAPI] 最終ノード(end)完了イベント検出 - 最終結果として処理します')
    return true
  }
  
  // node_finishedイベントで、node_typeがllmの場合も最終結果と見なす
  if (eventData.event === 'node_finished' && eventData.data?.node_type === 'llm') {
    console.log('🏁 [DifyAPI] LLMノード完了イベント検出 - 最終結果として処理します')
    return true
  }
  
  return false
}

/**
 * 最終結果のテキストを抽出する関数
 * @param eventData - イベントデータ
 * @returns 最終結果のテキスト、または null
 */
const extractFinalResult = (eventData: StreamingEventData): string | null => {
  // node_finishedイベントでnode_typeがllmの場合（優先度高）
  if (eventData.event === 'node_finished' && eventData.data?.node_type === 'llm') {
    // outputs.textを確認
    if (eventData.data?.outputs?.text) {
      console.log('🏁 [DifyAPI] LLMノード.outputs.text検出')
      return eventData.data.outputs.text
    }
  }
  
  // node_finishedイベントでnode_typeがendの場合
  if (eventData.event === 'node_finished' && eventData.data?.node_type === 'end') {
    // outputs.resultを確認
    if (eventData.data?.outputs?.result) {
      console.log('🏁 [DifyAPI] endノード.outputs.result検出')
      return eventData.data.outputs.result
    }
    
    // inputs.resultを確認
    if (eventData.data?.inputs?.result) {
      console.log('🏁 [DifyAPI] endノード.inputs.result検出')
      return eventData.data.inputs.result
    }
  }
  
  // workflow_finishedイベントの場合
  if (eventData.event === 'workflow_finished') {
    if (eventData.data?.outputs?.result) {
      console.log('🏁 [DifyAPI] workflow_finished.outputs.result検出')
      return eventData.data.outputs.result
    }
  }
  
  // その他のnode_finishedイベントの場合
  if (eventData.event === 'node_finished') {
    // outputs.resultを確認
    if (eventData.data?.outputs?.result) {
      console.log('🏁 [DifyAPI] node_finished.outputs.result検出')
      return eventData.data.outputs.result
    }
    
    // inputs.resultを確認
    if (eventData.data?.inputs?.result) {
      console.log('🏁 [DifyAPI] node_finished.inputs.result検出')
      return eventData.data.inputs.result
    }
    
    // outputs.textを確認
    if (eventData.data?.outputs?.text) {
      console.log('🏁 [DifyAPI] node_finished.outputs.text検出')
      return eventData.data.outputs.text
    }
  }
  
  return null
}

/**
 * 無視すべきデータかどうかを判定する関数
 * @param key - キー
 * @param value - 値
 * @returns 無視すべきデータかどうか
 */
const shouldIgnoreData = (key: string, value: any): boolean => {
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
    console.log(`⚠️ [DifyAPI] 入力データと判断してスキップ: ${key}`)
    return true;
  }
  
  // inputsキーは特別扱い - result以外はスキップ
  if (key.includes('inputs') && !key.endsWith('.result')) {
    console.log(`⚠️ [DifyAPI] 入力データと判断してスキップ: ${key}`)
    return true;
  }
  
  // "stop"という文字列は無視
  if (typeof value === 'string' && value.trim().toLowerCase() === 'stop') {
    console.log(`⚠️ [DifyAPI] "stop"文字列をスキップ`)
    return true;
  }
  
  return false;
}

/**
 * イベントデータを処理する関数
 * @param eventData - イベントデータ
 * @param lastContent - 前回の内容
 * @param onChunk - チャンク処理コールバック
 * @returns 処理結果（テキストと最終フラグ）
 */
const processEventData = (
  eventData: StreamingEventData,
  lastContent: string,
  onChunk: (chunk: string, isFinal?: boolean) => void
): { processed: boolean, content?: string } => {
  // workflow_startedイベントは常にスキップ（入力データを含むため）
  if (eventData.event === 'workflow_started') {
    console.log('⏭️ [DifyAPI] workflow_startedイベントをスキップ（入力データを含む）')
    return { processed: false }
  }
  
  // node_startedイベントもスキップ（通常は出力データを含まない）
  if (eventData.event === 'node_started') {
    console.log('⏭️ [DifyAPI] node_startedイベントをスキップ')
    return { processed: false }
  }
  
  // イベントタイプに基づいて処理
  switch (eventData.event) {
    case 'text_chunk': {
      // text_chunkイベントの場合、data.textフィールドからテキストを抽出
      const textChunkEvent = eventData as TextChunkEvent
      const text = textChunkEvent.data.text
      
      if (text && text.trim()) {
        console.log(`✨ [DifyAPI] text_chunkイベント検出: ${text}`)
        return { processed: true, content: text }
      }
      break
    }
    
    case 'workflow_finished': {
      // workflow_finishedイベントの場合、最終結果としてマーク
      const workflowFinishedEvent = eventData as WorkflowFinishedEvent
      console.log('🏁 [DifyAPI] workflow_finishedイベント検出')
      
      // outputsから結果を抽出（入力データをフィルタリング）
      if (workflowFinishedEvent.data?.outputs) {
        const outputs = workflowFinishedEvent.data.outputs
        for (const [key, value] of Object.entries(outputs)) {
          if (typeof value === 'string' && value.trim() && !shouldIgnoreData(key, value)) {
            console.log(`✨ [DifyAPI] workflow_finished.outputs.${key}検出: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
            return { processed: true, content: value }
          }
        }
      }
      break
    }
    
    case 'node_finished': {
      // node_finishedイベントの場合、outputsから結果を抽出（入力データをフィルタリング）
      const nodeFinishedEvent = eventData as NodeFinishedEvent
      console.log(`🔄 [DifyAPI] node_finishedイベント検出: ${nodeFinishedEvent.data.node_type} - ${nodeFinishedEvent.data.title}`)
      
      if (nodeFinishedEvent.data.outputs) {
        const outputs = nodeFinishedEvent.data.outputs
        for (const [key, value] of Object.entries(outputs)) {
          if (typeof value === 'string' && value.trim() && !shouldIgnoreData(key, value)) {
            console.log(`✨ [DifyAPI] node_finished.outputs.${key}検出: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
            return { processed: true, content: value }
          }
        }
      }
      break
    }
    
    default: {
      // その他のイベントタイプの場合、一般的なフィールドをチェック（入力データをフィルタリング）
      if (eventData.data?.text && typeof eventData.data.text === 'string' && 
          eventData.data.text.trim() && !shouldIgnoreData('text', eventData.data.text)) {
        console.log(`✨ [DifyAPI] data.text検出: ${eventData.data.text.substring(0, 50)}${eventData.data.text.length > 50 ? '...' : ''}`)
        return { processed: true, content: eventData.data.text }
      }
      
      if (eventData.data?.result && typeof eventData.data.result === 'string' && 
          eventData.data.result.trim() && !shouldIgnoreData('result', eventData.data.result)) {
        console.log(`✨ [DifyAPI] data.result検出: ${eventData.data.result.substring(0, 50)}${eventData.data.result.length > 50 ? '...' : ''}`)
        return { processed: true, content: eventData.data.result }
      }
      
      if (eventData.data?.answer && typeof eventData.data.answer === 'string' && 
          eventData.data.answer.trim() && !shouldIgnoreData('answer', eventData.data.answer)) {
        console.log(`✨ [DifyAPI] data.answer検出: ${eventData.data.answer.substring(0, 50)}${eventData.data.answer.length > 50 ? '...' : ''}`)
        return { processed: true, content: eventData.data.answer }
      }
      
      if (eventData.data?.content && typeof eventData.data.content === 'string' && 
          eventData.data.content.trim() && !shouldIgnoreData('content', eventData.data.content)) {
        console.log(`✨ [DifyAPI] data.content検出: ${eventData.data.content.substring(0, 50)}${eventData.data.content.length > 50 ? '...' : ''}`)
        return { processed: true, content: eventData.data.content }
      }
    }
  }
  
  return { processed: false }
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
    let accumulatedText = ''
    
    // ストリーミングデータを逐次読み取る
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        console.log('✅ [DifyAPI] ストリーミング完了')
        
        // ストリーム終了時に累積テキストがあれば、最終結果として送信
        if (accumulatedText && accumulatedText !== lastContent && accumulatedText.trim()) {
          console.log(`🏁 [DifyAPI] ストリーム終了時の累積テキストを最終結果として送信: ${accumulatedText.substring(0, 50)}${accumulatedText.length > 50 ? '...' : ''}`)
          onChunk(accumulatedText, true)
        }
        
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
            
            // LLMノード完了イベントの場合、詳細をログ出力
            if (eventData.event === 'node_finished' && eventData.data?.node_type === 'llm') {
              console.log('🔍 [DifyAPI] LLMノード完了イベント詳細:')
              console.log('🔍 [DifyAPI] node_id:', eventData.data.node_id)
              console.log('🔍 [DifyAPI] title:', eventData.data.title)
              
              if (eventData.data.outputs) {
                console.log('🔍 [DifyAPI] outputs keys:', Object.keys(eventData.data.outputs))
                
                // outputsの内容を詳細にログ出力
                for (const [key, value] of Object.entries(eventData.data.outputs)) {
                  if (typeof value === 'string') {
                    console.log(`🔍 [DifyAPI] outputs.${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
                  } else if (value !== null && typeof value === 'object') {
                    console.log(`🔍 [DifyAPI] outputs.${key}: [Object]`)
                  } else {
                    console.log(`🔍 [DifyAPI] outputs.${key}:`, value)
                  }
                }
                
                // 特に重要なtext出力を詳細にログ出力
                if (eventData.data.outputs.text) {
                  console.log(`🔍 [DifyAPI] outputs.text の完全な内容:`)
                  console.log(eventData.data.outputs.text)
                  
                  // 最終結果として直接送信
                  console.log(`🏁 [DifyAPI] LLMノードの最終結果を直接送信します (isFinal=true)`)
                  lastContent = eventData.data.outputs.text
                  onChunk(eventData.data.outputs.text, true)
                  
                  // 累積テキストをリセット
                  accumulatedText = ''
                  continue
                }
              }
            }
            
            // イベントデータを処理
            const { processed, content } = processEventData(eventData, lastContent, onChunk)
            
            if (processed && content) {
              // "stop"文字列をチェック
              if (typeof content === 'string' && content.trim().toLowerCase() === 'stop') {
                console.log(`⚠️ [DifyAPI] "stop"文字列を検出したためスキップ`)
                continue
              }
              
              // 最終結果かどうかをチェック
              const final = isFinalResult(eventData)
              console.log(`🔄 [DifyAPI] 最終結果フラグ: ${final ? 'true' : 'false'} (${eventData.event})`)
              
              // 最終結果の場合
              if (final) {
                // 最終結果のテキストを抽出
                const finalResult = extractFinalResult(eventData)
                
                if (finalResult) {
                  console.log(`🏁 [DifyAPI] 最終結果を検出: ${finalResult.substring(0, 50)}${finalResult.length > 50 ? '...' : ''}`)
                  console.log(`🏁 [DifyAPI] 最終結果の長さ: ${finalResult.length} 文字`)
                  
                  // 最終結果を送信
                  if (finalResult !== lastContent && finalResult.trim()) {
                    console.log(`🏁 [DifyAPI] 最終結果を送信します (isFinal=true)`)
                    lastContent = finalResult
                    onChunk(finalResult, true)
                  } else {
                    console.log(`⚠️ [DifyAPI] 最終結果が前回と同じか空のためスキップ`)
                  }
                  
                  // 累積テキストをリセット
                  accumulatedText = ''
                  continue
                } else if (accumulatedText) {
                  // 最終結果が抽出できなかった場合は、累積テキストを最終結果として送信
                  console.log(`🏁 [DifyAPI] 最終結果として累積テキストを送信: ${accumulatedText.substring(0, 50)}${accumulatedText.length > 50 ? '...' : ''}`)
                  console.log(`🏁 [DifyAPI] 累積テキストの長さ: ${accumulatedText.length} 文字`)
                  
                  // 最終結果として累積テキストを送信
                  if (accumulatedText !== lastContent && accumulatedText.trim()) {
                    console.log(`🏁 [DifyAPI] 累積テキストを最終結果として送信します (isFinal=true)`)
                    lastContent = accumulatedText
                    onChunk(accumulatedText, true)
                  } else {
                    console.log(`⚠️ [DifyAPI] 累積テキストが前回と同じか空のためスキップ`)
                  }
                  
                  // 累積テキストをリセット
                  accumulatedText = ''
                  continue
                } else {
                  console.log(`⚠️ [DifyAPI] 最終結果も累積テキストも見つかりませんでした`)
                }
              }
              
              // text_chunkイベントの場合は累積
              if (eventData.event === 'text_chunk') {
                accumulatedText += content
                console.log(`📝 [DifyAPI] テキスト累積: ${accumulatedText.substring(0, 50)}${accumulatedText.length > 50 ? '...' : ''}`)
                
                // 重複チェック - 前回と同じ内容なら送信しない
                if (content !== lastContent && content.trim()) {
                  console.log(`📤 [DifyAPI] チャンク送信: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''} ${final ? '(最終結果)' : ''}`)
                  lastContent = content
                  onChunk(content, final)
                } else {
                  console.log(`⏭️ [DifyAPI] 重複または空のチャンクをスキップ`)
                }
              } else {
                // その他のイベントの場合は直接送信
                if (content !== lastContent && content.trim()) {
                  console.log(`📤 [DifyAPI] 完全なコンテンツ送信: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''} ${final ? '(最終結果)' : ''}`)
                  lastContent = content
                  onChunk(content, final)
                }
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
