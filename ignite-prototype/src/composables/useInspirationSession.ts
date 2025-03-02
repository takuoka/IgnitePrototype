/**
 * インスピレーションセッション管理のコンポーザブル
 */
import { ref, computed } from 'vue'
import { fetchDifyInspirationStream } from '@/services/api/difyService'
import { createEventHandler } from '@/services/api/difyEventHandler'
import { createApiErrorMessage, logError } from '@/utils/errorHandler'
import { sessionsToMarkdown, markdownToHtml } from '@/utils/markdownConverter'
import type { Session, ChunkData, SessionState, WorkflowOutputs } from '@/types/inspiration'

// 初期表示用テキスト
const INITIAL_TEXT = 'AIのインスピレーションがここに表示されます'

// 空のセッションを作成
const createEmptySession = (): Session => ({
  advice: '',
  phrases: '',
  words: '',
  legacy: ''
})

/**
 * インスピレーションセッション管理のコンポーザブル
 */
export function useInspirationSession() {
  // 状態管理
  const sessions = ref<Session[]>([])
  const currentSession = ref<Session>(createEmptySession())
  const isInitialState = ref(true)
  const isGenerating = ref(false)
  const renderedHtml = ref(markdownToHtml(INITIAL_TEXT))
  const isLoading = ref(false)
  const hasError = ref(false)
  
  // 最後に処理したチャンクの内容を保持（重複防止）
  const lastProcessedChunk = ref<string>('')
  
  // イベントハンドラーを作成
  const eventHandler = createEventHandler({ debug: true })
  
  /**
   * 表示用のテキストを生成
   */
  const inspirationText = computed(() => {
    if (isInitialState.value) {
      return INITIAL_TEXT
    }
    
    return sessionsToMarkdown(sessions.value, currentSession.value, isGenerating.value)
  })
  
  /**
   * HTMLを更新
   */
  const updateHtml = () => {
    renderedHtml.value = markdownToHtml(inspirationText.value)
  }
  
  /**
   * チャンクデータを解析
   */
  const parseChunk = (chunk: string): ChunkData => {
    try {
      // JSONとして解析を試みる
      const data = JSON.parse(chunk)
      
      if (data && typeof data === 'object' && 'type' in data && 'content' in data) {
        return {
          type: data.type,
          content: data.content
        }
      }
      
      // 必要なプロパティがない場合はlegacyとして扱う
      return {
        type: 'legacy',
        content: chunk
      }
    } catch (e) {
      // JSONではない場合はlegacyとして扱う
      return {
        type: 'legacy',
        content: chunk
      }
    }
  }
  
  /**
   * チャンクを処理
   */
  const processChunk = (chunk: string, isWorkflowCompletion: boolean, processedTypes: Set<string>) => {
    // 重複チェック - 前回と同じチャンクは処理しない
    if (chunk === lastProcessedChunk.value) {
      console.log('⏭️ [InspirationSession] 重複チャンクをスキップ');
      return;
    }
    
    const parsedChunk = parseChunk(chunk)
    
    // 既に処理済みのタイプは無視（重複防止）
    if (isWorkflowCompletion && processedTypes.has(parsedChunk.type)) {
      console.log(`⏭️ [InspirationSession] 処理済みタイプをスキップ: ${parsedChunk.type}`);
      return;
    }
    
    // チャンクのタイプに応じて適切な状態を更新
    switch (parsedChunk.type) {
      case 'advice':
        // adviceテキストを累積
        currentSession.value.advice += parsedChunk.content as string
        break
      case 'phrases':
        // phrasesテキストを累積
        currentSession.value.phrases += parsedChunk.content as string
        break
      case 'words':
        // wordsテキストを累積
        currentSession.value.words += parsedChunk.content as string
        break
      case 'legacy':
        // legacyテキストを累積
        currentSession.value.legacy += parsedChunk.content as string
        break
      case 'node_llm':
      case 'node_other':
        // ノード完了イベントは中間結果として扱う（無視）
        console.log(`ℹ️ [InspirationSession] ノード出力をスキップ: ${parsedChunk.type}`);
        break
      case 'workflow_outputs':
        // ワークフロー完了イベントは最終結果として扱う
        if (isWorkflowCompletion) {
          console.log(`✅ [InspirationSession] ワークフロー出力を処理: ${parsedChunk.type}`);
          const outputs = parsedChunk.content as WorkflowOutputs
          if (outputs.advice) currentSession.value.advice = outputs.advice
          if (outputs.phrases) currentSession.value.phrases = outputs.phrases
          if (outputs.words) currentSession.value.words = outputs.words
          
          // 処理済みとしてマーク
          processedTypes.add('workflow_outputs')
          
          // 他のタイプも処理済みとしてマーク（重複防止）
          processedTypes.add('advice')
          processedTypes.add('phrases')
          processedTypes.add('words')
        }
        break
      case 'completion':
        // 完了通知の場合
        if (isWorkflowCompletion) {
          console.log(`✅ [InspirationSession] 完了通知を処理`);
          
          // 完了通知の内容がある場合は処理
          if (typeof parsedChunk.content === 'string' && parsedChunk.content.trim()) {
            currentSession.value.legacy += parsedChunk.content as string
          }
          
          processedTypes.add('completion')
        }
        break
      default:
        console.log(`⚠️ [InspirationSession] 未知のチャンクタイプ: ${parsedChunk.type}`);
        break
    }
    
    // 処理したチャンクを記録
    lastProcessedChunk.value = chunk
    
    // ワークフロー完了の場合は処理済みとしてマーク
    if (isWorkflowCompletion) {
      processedTypes.add(parsedChunk.type)
    }
    
    // HTMLを更新
    updateHtml()
  }
  
  /**
   * インスピレーションを更新
   * @param lyrics 歌詞
   * @param onUpdate 更新時のコールバック
   */
  const updateInspiration = async (lyrics: string = '', onUpdate?: () => void) => {
    try {
      isLoading.value = true
      hasError.value = false
      isGenerating.value = true
      
      // 初期状態フラグを更新
      if (isInitialState.value) {
        isInitialState.value = false
      } else if (Object.values(currentSession.value).some(v => v)) {
        // 現在のセッションが空でなければ保存
        sessions.value.push({ ...currentSession.value })
      }
      
      // 現在のセッションをクリア
      currentSession.value = createEmptySession()
      
      // 最後に処理したチャンクをリセット
      lastProcessedChunk.value = ''
      
      // イベントハンドラーのセッションをリセット
      if (eventHandler.resetSession) {
        eventHandler.resetSession()
        console.log('🔄 [InspirationSession] イベントハンドラーのセッションをリセット');
      }
      
      // HTMLを更新
      updateHtml()
      if (onUpdate) onUpdate()
      
      // 処理済みタイプを追跡（重複防止）
      const processedTypes = new Set<string>()
      
      console.log('🚀 [InspirationSession] ストリーミング開始');
      
      // ストリーミングモードでAPI呼び出し
      await fetchDifyInspirationStream(lyrics, (chunk: string, isWorkflowCompletion?: boolean) => {
        console.log(`📦 [InspirationSession] チャンク受信: ${isWorkflowCompletion ? '(完了)' : ''}`);
        
        processChunk(chunk, !!isWorkflowCompletion, processedTypes)
        if (onUpdate) onUpdate()
        
        // ワークフロー完了が届いたら生成終了
        if (isWorkflowCompletion && processedTypes.size > 0) {
          console.log('✅ [InspirationSession] ワークフロー完了を検出');
          isGenerating.value = false
        }
      })
      
      console.log('🏁 [InspirationSession] ストリーミング終了');
      
      // ストリーミングが終了しても最終結果が届いていない場合
      if (isGenerating.value) {
        console.log('⚠️ [InspirationSession] 明示的な完了通知なしでストリーミング終了');
        isGenerating.value = false
      }
      
    } catch (error: any) {
      console.error('❌ エラー発生:', error?.message || error)
      logError('InspirationSession', error)
      hasError.value = true
      isGenerating.value = false
      renderedHtml.value = markdownToHtml(createApiErrorMessage(error))
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 状態を取得
   */
  const getState = (): SessionState => ({
    sessions: sessions.value,
    currentSession: currentSession.value,
    isInitialState: isInitialState.value,
    isGenerating: isGenerating.value,
    isLoading: isLoading.value,
    hasError: hasError.value
  })
  
  return {
    // 状態
    sessions,
    currentSession,
    isInitialState,
    isGenerating,
    renderedHtml,
    isLoading,
    hasError,
    inspirationText,
    
    // メソッド
    updateInspiration,
    updateHtml,
    getState
  }
}
