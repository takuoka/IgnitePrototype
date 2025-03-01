// Common type definitions for the application

export interface LyricsEditorInterface {
  lyrics: {
    get: () => string
  }
}

export interface DifyAPIResponse {
  data?: {
    outputs?: {
      result?: string
    }
  }
}

export interface DifyAPIRequest {
  inputs: {
    currentLyric: string
  }
  response_mode: string
  user: string
}

/**
 * ストリーミングイベントデータの型定義
 */
export interface StreamingEventData {
  event?: string
  workflow_run_id?: string
  task_id?: string
  data?: {
    status?: string
    outputs?: Record<string, any>
    output?: Record<string, any>
    result?: string
    answer?: string
    text?: string
    content?: string
    from_variable_selector?: string[]
    id?: string
    node_id?: string
    node_type?: string
    title?: string
    index?: number
    predecessor_node_id?: string | null
    inputs?: Record<string, any>
    process_data?: any
    created_at?: number
    finished_at?: number
    files?: any[]
    parallel_id?: string | null
    parallel_start_node_id?: string | null
    parent_parallel_id?: string | null
    parent_parallel_start_node_id?: string | null
    iteration_id?: string | null
    [key: string]: any
  }
  result?: string
  answer?: string
  [key: string]: any
}

/**
 * テキストチャンクイベントの型定義
 */
export interface TextChunkEvent extends StreamingEventData {
  event: 'text_chunk'
  data: {
    text: string
    from_variable_selector: string[]
  }
}

/**
 * ワークフロー開始イベントの型定義
 */
export interface WorkflowStartedEvent extends StreamingEventData {
  event: 'workflow_started'
  workflow_run_id: string
  task_id: string
  data: {
    id: string
    workflow_id: string
    sequence_number: number
    inputs: Record<string, any>
    created_at: number
  }
}

/**
 * ノード開始イベントの型定義
 */
export interface NodeStartedEvent extends StreamingEventData {
  event: 'node_started'
  workflow_run_id: string
  task_id: string
  data: {
    id: string
    node_id: string
    node_type: string
    title: string
    index: number
    predecessor_node_id: string | null
    inputs: any
    created_at: number
    extras: Record<string, any>
    parallel_id: string | null
    parallel_start_node_id: string | null
    parent_parallel_id: string | null
    parent_parallel_start_node_id: string | null
    iteration_id: string | null
    parallel_run_id: string | null
    agent_strategy: string | null
  }
}

/**
 * ノード完了イベントの型定義
 */
export interface NodeFinishedEvent extends StreamingEventData {
  event: 'node_finished'
  workflow_run_id: string
  task_id: string
  data: {
    id: string
    node_id: string
    node_type: string
    title: string
    index: number
    predecessor_node_id: string | null
    inputs: Record<string, any>
    process_data: any
    outputs: Record<string, any>
    status: string
    error: any
    elapsed_time: number
    execution_metadata: any
    created_at: number
    finished_at: number
    files: any[]
    parallel_id: string | null
    parallel_start_node_id: string | null
    parent_parallel_id: string | null
    parent_parallel_start_node_id: string | null
    iteration_id: string | null
  }
}

/**
 * ワークフロー完了イベントの型定義
 */
export interface WorkflowFinishedEvent extends StreamingEventData {
  event: 'workflow_finished'
  workflow_run_id: string
  task_id: string
  data: {
    id: string
    workflow_id: string
    status: string
    error: any
    elapsed_time: number
    outputs: Record<string, any>
    created_at: number
    finished_at: number
  }
}
