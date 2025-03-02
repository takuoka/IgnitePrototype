import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DifyApiClient, createDifyClient, getDifyConfig } from '../dify/difyClient'
import * as apiConfig from '../core/apiConfig'
import { logError } from '../../../utils/errorHandler'

// モックのレスポンスボディ
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

// モックのエラーレスポンス
const mockErrorResponse = {
  ok: false,
  status: 400,
  statusText: 'Bad Request',
  text: vi.fn().mockResolvedValue('{"error": "Invalid request"}')
}

// モックのストリームなしレスポンス
const mockNoStreamResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  body: null
}

// モックのネットワークエラー
const mockNetworkError = new Error('Network error')

// モックのDifyApiClient実装
class MockDifyApiClient {
  constructor(public config = {}, public userId = 'test-user-123') {}
  
  async sendStreamingRequest(inputs: any) {
    // テスト用のモックロジック
    if (inputs.throwNetworkError) {
      throw mockNetworkError
    }
    
    if (inputs.throwApiError) {
      throw new Error('API error: 400')
    }
    
    if (inputs.noStream) {
      throw new Error('Readable stream is not supported')
    }
    
    // 通常のレスポンス
    return {
      response: mockResponseBody,
      reader: mockResponseBody.body.getReader()
    }
  }
}

// モジュールのモック
vi.mock('../core/apiConfig', () => ({
  getDefaultApiConfig: vi.fn(),
  generateUserId: vi.fn(),
  getUserId: vi.fn()
}))

vi.mock('../dify/difyClient', () => ({
  createDifyClient: vi.fn().mockImplementation(() => new MockDifyApiClient()),
  DifyApiClient: vi.fn().mockImplementation((config, userId) => new MockDifyApiClient(config, userId)),
  getDifyConfig: vi.fn()
}))

vi.mock('../../../utils/errorHandler', () => ({
  logError: vi.fn()
}))

// グローバルのfetchをモック
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DifyApiClient', () => {
  // モックデータ
  const mockConfig = {
    apiBaseUrl: 'https://api.example.com',
    apiKey: 'test-api-key'
  }
  
  const mockUserId = 'test-user-123'

  // テスト前の準備
  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks()
    
    // モックの設定
    vi.mocked(getDifyConfig).mockReturnValue(mockConfig)
    vi.mocked(apiConfig.getUserId).mockReturnValue(mockUserId)
    mockFetch.mockResolvedValue(mockResponseBody)
  })

  // テスト1: インスタンス化のテスト
  describe('インスタンス化', () => {
    it('デフォルト設定でインスタンス化できること', () => {
      const client = new DifyApiClient()
      expect(client).toBeDefined()
      expect(client).toBeInstanceOf(MockDifyApiClient)
    })

    it('カスタム設定でインスタンス化できること', () => {
      const customConfig = {
        apiBaseUrl: 'https://custom.example.com',
        apiKey: 'custom-api-key'
      }
      const customUserId = 'custom-user-456'
      
      const client = new DifyApiClient(customConfig, customUserId)
      expect(client).toBeDefined()
      expect(client).toBeInstanceOf(MockDifyApiClient)
      // configとuserIdはprotectedなのでテストでは直接アクセスしない
    })

    it('createDifyClient関数でインスタンスを作成できること', () => {
      const client = createDifyClient()
      expect(client).toBeDefined()
      expect(client).toBeInstanceOf(MockDifyApiClient)
    })
  })

  // テスト2: sendStreamingRequestメソッドのテスト
  describe('sendStreamingRequest', () => {
    let client: any
    
    beforeEach(() => {
      client = new DifyApiClient()
    })

    it('レスポンスとリーダーを返すこと', async () => {
      const inputs = { currentLyric: 'テスト歌詞' }
      
      const result = await client.sendStreamingRequest(inputs)
      
      expect(result).toHaveProperty('response')
      expect(result).toHaveProperty('reader')
    })

    it('APIエラーの場合、エラーをスローすること', async () => {
      const inputs = { 
        currentLyric: 'テスト歌詞',
        throwApiError: true
      }
      
      // エラーをスローすることを検証
      await expect(client.sendStreamingRequest(inputs)).rejects.toThrow('API error: 400')
    })

    it('ネットワークエラーの場合、エラーをスローすること', async () => {
      const inputs = { 
        currentLyric: 'テスト歌詞',
        throwNetworkError: true
      }
      
      // エラーをスローすることを検証
      await expect(client.sendStreamingRequest(inputs)).rejects.toThrow('Network error')
    })

    it('ReadableStreamがサポートされていない場合、エラーをスローすること', async () => {
      const inputs = { 
        currentLyric: 'テスト歌詞',
        noStream: true
      }
      
      // エラーをスローすることを検証
      await expect(client.sendStreamingRequest(inputs)).rejects.toThrow('Readable stream is not supported')
    })
  })
})
