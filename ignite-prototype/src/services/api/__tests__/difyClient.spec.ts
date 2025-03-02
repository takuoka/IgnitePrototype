import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DifyApiClient, createDifyClient } from '../difyClient'
import * as difyConfig from '../difyConfig'
import { logError } from '../../../utils/errorHandler'

// モジュールのモック
vi.mock('../difyConfig', () => ({
  getDifyConfig: vi.fn(),
  generateUserId: vi.fn()
}))

vi.mock('../../../utils/errorHandler', () => ({
  logError: vi.fn()
}))

// グローバルのfetchをモック
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DifyClient', () => {
  // モックデータ
  const mockConfig = {
    apiBaseUrl: 'https://api.example.com',
    apiKey: 'test-api-key'
  }
  
  const mockUserId = 'test-user-123'
  
  // レスポンスのモック
  const mockResponseBody = {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: vi.fn().mockResolvedValue('{"result": "success"}'),
    body: {
      getReader: vi.fn().mockReturnValue({
        read: vi.fn()
      })
    }
  }

  // テスト前の準備
  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks()
    
    // モックの設定
    vi.mocked(difyConfig.getDifyConfig).mockReturnValue(mockConfig)
    vi.mocked(difyConfig.generateUserId).mockReturnValue(mockUserId)
    mockFetch.mockResolvedValue(mockResponseBody)
  })

  // テスト1: インスタンス化のテスト
  describe('インスタンス化', () => {
    it('デフォルト設定でインスタンス化できること', () => {
      const client = new DifyApiClient()
      expect(client).toBeInstanceOf(DifyApiClient)
    })

    it('カスタム設定でインスタンス化できること', () => {
      const customConfig = {
        apiBaseUrl: 'https://custom.example.com',
        apiKey: 'custom-api-key'
      }
      const customUserId = 'custom-user-456'
      
      const client = new DifyApiClient(customConfig, customUserId)
      expect(client).toBeInstanceOf(DifyApiClient)
    })

    it('createDifyClient関数でインスタンスを作成できること', () => {
      const client = createDifyClient()
      expect(client).toBeInstanceOf(DifyApiClient)
    })
  })

  // テスト2: sendStreamingRequestメソッドのテスト
  describe('sendStreamingRequest', () => {
    let client: DifyApiClient
    
    beforeEach(() => {
      client = new DifyApiClient()
    })

    it('currentLyricのみでAPIを呼び出すこと', async () => {
      const inputs = { currentLyric: 'テスト歌詞' }
      
      await client.sendStreamingRequest(inputs)
      
      // fetchの呼び出しを検証
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/workflows/run',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: inputs,
            user: mockUserId,
            response_mode: 'streaming'
          })
        }
      )
    })

    it('currentLyricとfavorite_lyricsでAPIを呼び出すこと', async () => {
      const inputs = { 
        currentLyric: 'テスト歌詞',
        favorite_lyrics: '好きな歌詞テスト'
      }
      
      await client.sendStreamingRequest(inputs)
      
      // fetchの呼び出しを検証
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/workflows/run',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: inputs,
            user: mockUserId,
            response_mode: 'streaming'
          })
        }
      )
    })

    it('レスポンスとリーダーを返すこと', async () => {
      const inputs = { currentLyric: 'テスト歌詞' }
      
      const result = await client.sendStreamingRequest(inputs)
      
      expect(result).toHaveProperty('response')
      expect(result).toHaveProperty('reader')
      expect(mockResponseBody.body.getReader).toHaveBeenCalled()
    })

    it('APIエラーの場合、エラーをスローすること', async () => {
      // エラーレスポンスをモック
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('{"error": "Invalid request"}')
      }
      mockFetch.mockResolvedValueOnce(errorResponse)
      
      const inputs = { currentLyric: 'テスト歌詞' }
      
      // エラーをスローすることを検証
      await expect(client.sendStreamingRequest(inputs)).rejects.toThrow('API error: 400')
      
      // エラーログの検証
      expect(logError).toHaveBeenCalled()
    })

    it('ネットワークエラーの場合、エラーをスローすること', async () => {
      // ネットワークエラーをモック
      const networkError = new Error('Network error')
      mockFetch.mockRejectedValueOnce(networkError)
      
      const inputs = { currentLyric: 'テスト歌詞' }
      
      // エラーをスローすることを検証
      await expect(client.sendStreamingRequest(inputs)).rejects.toThrow('Network error')
      
      // エラーログの検証
      expect(logError).toHaveBeenCalledWith('DifyClient', networkError)
    })

    it('ReadableStreamがサポートされていない場合、エラーをスローすること', async () => {
      // ReadableStreamがサポートされていないレスポンスをモック
      const noStreamResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        body: null
      }
      mockFetch.mockResolvedValueOnce(noStreamResponse)
      
      const inputs = { currentLyric: 'テスト歌詞' }
      
      // エラーをスローすることを検証
      await expect(client.sendStreamingRequest(inputs)).rejects.toThrow('Readable stream is not supported')
    })
  })
})
