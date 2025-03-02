// 既存の型定義をエクスポート
export * from './inspiration'
export * from './api'

// その他の型定義

/**
 * 歌詞エディタインターフェース
 */
export interface LyricsEditorInterface {
  lyrics: {
    get: () => string;
  };
  favoriteLyrics: {
    get: () => string;
  };
  globalInstruction: {
    get: () => string;
  };
}

/**
 * Dify APIリクエスト
 */
export interface DifyAPIRequest {
  inputs: {
    currentLyric: string;
    favorite_lyrics?: string;
    global_instruction?: string;
  };
  user: string;
  response_mode: string;
}

/**
 * Dify APIのストリーミングイベントデータ
 */
export interface StreamingEventData {
  event: string
  data?: any
  workflow_run_id?: string
  [key: string]: any
}

/**
 * ノード開始イベント
 */
export interface NodeStartedEvent extends StreamingEventData {
  event: 'node_started'
  data: {
    id: string
    node_id: string
    node_type: string
    title: string
    index: number
    predecessor_node_id?: string
    created_at: number
    [key: string]: any
  }
}

/**
 * テキストチャンクイベント
 */
export interface TextChunkEvent extends StreamingEventData {
  event: 'text_chunk'
  data: {
    text: string
    from_variable_selector: any[]
  }
}

/**
 * ノード完了イベント
 */
export interface NodeFinishedEvent extends StreamingEventData {
  event: 'node_finished'
  data: {
    id: string
    node_id?: string
    node_type?: string
    outputs: Record<string, any>
    [key: string]: any
  }
}

/**
 * ワークフロー完了イベント
 */
export interface WorkflowFinishedEvent extends StreamingEventData {
  event: 'workflow_finished'
  data: {
    id?: string
    workflow_id?: string
    outputs: Record<string, any>
    [key: string]: any
  }
}
