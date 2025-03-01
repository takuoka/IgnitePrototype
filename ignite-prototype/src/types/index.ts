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
  data?: {
    status?: string
    outputs?: Record<string, any>
    output?: Record<string, any>
    result?: string
    answer?: string
    text?: string
    content?: string
    [key: string]: any
  }
  result?: string
  answer?: string
  [key: string]: any
}
