/**
 * インスピレーション関連の型定義
 */

/**
 * セッションデータ
 */
export interface Session {
  advice: string
  phrases: string
  words: string
  legacy: string
}

/**
 * ワークフロー出力データ
 */
export interface WorkflowOutputs {
  advice: string
  phrases: string
  words: string
}

/**
 * チャンクデータ
 */
export interface ChunkData {
  type: string
  content: string | WorkflowOutputs | any
}

/**
 * セッション状態
 */
export interface SessionState {
  sessions: Session[]
  currentSession: Session
  isInitialState: boolean
  isGenerating: boolean
  isLoading: boolean
  hasError: boolean
}
