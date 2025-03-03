/**
 * インスピレーションセッション管理のコンポーザブル
 */
import { ref, computed } from 'vue'
import { fetchDifyInspirationStream, fetchDifyInspirationStreamLegacy } from '@/services/api'
import { createEventHandlerRegistry } from '@/services/api/stream/eventHandlerRegistry'
import { createApiErrorMessage, logError } from '@/utils/errorHandler'
import { sessionsToMarkdown, markdownToHtml } from '@/utils/markdownConverter'
import { VARIABLE_NAMES, EVENT_TYPES, UI_TEXTS } from '@/services/api/constants'
import type { Session, ChunkData, SessionState, WorkflowOutputs } from '@/types/inspiration'

// 空のセッションを作成
const createEmptySession = (): Session => {
  const session: Session = { legacy: '' };
  
  // 動的に変数名に基づいてフィールドを初期化
  VARIABLE_NAMES.forEach(name => {
    session[name] = '';
  });
  
  return session;
}

/**
 * インスピレーションセッション管理のコンポーザブル
 */
export function useInspirationSession() {
  // 状態管理
  const sessions = ref<Session[]>([])
  const currentSession = ref<Session>(createEmptySession())
  const isInitialState = ref(true)
  const isGenerating = ref(false)
  const renderedHtml = ref(markdownToHtml(UI_TEXTS.INITIAL_TEXT))
  const isLoading = ref(false)
  const hasError = ref(false)
  
  // 最後に処理したチャンクの内容を保持（重複防止）
  const lastProcessedChunk = ref<string>('')
  
  // イベントハンドラーを作成
  const eventHandler = createEventHandlerRegistry()
  
  /**
   * 表示用のテキストを生成
   */
  const inspirationText = computed(() => {
    if (isInitialState.value) {
      return UI_TEXTS.INITIAL_TEXT
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
        type: EVENT_TYPES.LEGACY,
        content: chunk
      }
    } catch (e) {
      // JSONではない場合はlegacyとして扱う
      return {
        type: EVENT_TYPES.LEGACY,
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
      return;
    }
    
    const parsedChunk = parseChunk(chunk)
    
    // 既に処理済みのタイプは無視（重複防止）
    if (isWorkflowCompletion && processedTypes.has(parsedChunk.type)) {
      return;
    }
    
    // チャンクのタイプに応じて適切な状態を更新
    const type = parsedChunk.type;
    
    // 変数名に一致するタイプの場合
    if (VARIABLE_NAMES.includes(type)) {
      // 対応するフィールドにテキストを累積
      currentSession.value[type] += parsedChunk.content as string;
    } else if (type === EVENT_TYPES.LEGACY) {
      // legacyテキストを累積
      currentSession.value.legacy += parsedChunk.content as string;
    } else if (type === EVENT_TYPES.NODE_LLM || type === EVENT_TYPES.NODE_OTHER) {
      // ノード完了イベントは中間結果として扱う（無視）
      // 何もしない
    } else if (type === EVENT_TYPES.WORKFLOW_OUTPUTS) {
      // ワークフロー完了イベントは最終結果として扱う
      if (isWorkflowCompletion) {
        const outputs = parsedChunk.content as WorkflowOutputs;
        
        // 動的に各変数名に対応する出力を設定
        VARIABLE_NAMES.forEach(name => {
          if (outputs[name]) {
            currentSession.value[name] = outputs[name];
          }
        });
        
        // 処理済みとしてマーク
        processedTypes.add(EVENT_TYPES.WORKFLOW_OUTPUTS);
        
        // 他のタイプも処理済みとしてマーク（重複防止）
        VARIABLE_NAMES.forEach(name => {
          processedTypes.add(name);
        });
      }
    } else if (type === EVENT_TYPES.COMPLETION) {
      // 完了通知の場合
      if (isWorkflowCompletion) {
        // 完了通知の内容がある場合は処理
        if (typeof parsedChunk.content === 'string' && parsedChunk.content.trim()) {
          currentSession.value.legacy += parsedChunk.content as string;
        }
        
        processedTypes.add(EVENT_TYPES.COMPLETION);
      }
    }
    
    // 処理したチャンクを記録
    lastProcessedChunk.value = chunk;
    
    // ワークフロー完了の場合は処理済みとしてマーク
    if (isWorkflowCompletion) {
      processedTypes.add(parsedChunk.type);
    }
    
    // HTMLを更新
    updateHtml();
  }
  
  /**
   * インスピレーションを更新
   * @param lyrics 歌詞
   * @param favoriteLyrics 好きな歌詞
   * @param onUpdate 更新時のコールバック
   * @param globalInstruction ユーザー指示
   * @param apiName 使用するAPI名
   */
  const updateInspiration = async (
    lyrics: string = '', 
    favoriteLyrics: string = '', 
    onUpdate?: () => void,
    globalInstruction: string = '',
    apiName: string = 'default'
  ) => {
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
      }
      
      // HTMLを更新
      updateHtml()
      if (onUpdate) onUpdate()
      
      // 処理済みタイプを追跡（重複防止）
      const processedTypes = new Set<string>()
      
      // 入力データを準備
      const inputs: Record<string, any> = {
        currentLyric: lyrics || '歌詞を入力してください',
        favorite_lyrics: favoriteLyrics
      };

      // ユーザー指示が存在する場合は追加
      if (globalInstruction) {
        inputs.global_instruction = globalInstruction;
      }
      
      // ストリーミングモードでAPI呼び出し
      await fetchDifyInspirationStream(
        apiName,
        inputs,
        (chunk: string, isWorkflowCompletion?: boolean) => {
          processChunk(chunk, !!isWorkflowCompletion, processedTypes)
          if (onUpdate) onUpdate()
          
          // ワークフロー完了が届いたら生成終了
          if (isWorkflowCompletion && processedTypes.size > 0) {
            isGenerating.value = false
          }
        }
      )
      
      // ストリーミングが終了しても最終結果が届いていない場合
      if (isGenerating.value) {
        isGenerating.value = false
      }
      
    } catch (error: any) {
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
