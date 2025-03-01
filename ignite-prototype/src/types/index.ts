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
