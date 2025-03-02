import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchDifyInspirationStream } from '../difyService'
import * as difyClient from '../difyClient'
import * as difyStreamProcessor from '../difyStreamProcessor'
import { logError } from '../../../utils/errorHandler'

// モジュールのモック
vi.mock('../difyClient', () => ({
  createDifyClient: vi.fn()
}))

vi.mock('../difyStreamProcessor', () => ({
  createStreamProcessor: vi.fn()
}))

vi.mock('../../../utils/errorHandler', () => ({
  logError: vi.fn()
}))

describe('difyService', () => {
  // モックオブジェクト
  const mockReader = {
    read: vi.fn()
  }
  
  const mockResponse = {
    reader: mockReader
  }
  
  const mockClient = {
    sendStreamingRequest: vi.fn().mockResolvedValue(mockResponse)
  }
  
  const mockStreamProcessor = {
    processStream: vi.fn().mockResolvedValue(undefined)
  }
  
  const mockOnChunk = vi.fn()

  // テスト前の準備
  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks()
    
    // モックの設定
    vi.mocked(difyClient.createDifyClient).mockReturnValue(mockClient)
    vi.mocked(difyStreamProcessor.createStreamProcessor).mockReturnValue(mockStreamProcessor)
  })

  // テスト1: 正常系のテスト
  describe('fetchDifyInspirationStream - 正常系', () => {
    it('クライアントとストリームプロセッサを作成し、ストリームを処理すること', async () => {
      // テスト実行
      await fetchDifyInspirationStream('テスト歌詞', '', mockOnChunk)
      
      // 検証
      expect(difyClient.createDifyClient).toHaveBeenCalledTimes(1)
      expect(difyStreamProcessor.createStreamProcessor).toHaveBeenCalledWith({ debug: true })
      
      expect(mockClient.sendStreamingRequest).toHaveBeenCalledWith({
        currentLyric: 'テスト歌詞',
        favorite_lyrics: ''
      })
      
      expect(mockStreamProcessor.processStream).toHaveBeenCalledWith(mockReader, mockOnChunk)
    })

    it('空の歌詞が渡された場合、デフォルトメッセージを使用すること', async () => {
      // テスト実行
      await fetchDifyInspirationStream('', '', mockOnChunk)
      
      // 検証
      expect(mockClient.sendStreamingRequest).toHaveBeenCalledWith({
        currentLyric: '歌詞を入力してください',
        favorite_lyrics: ''
      })
    })
  })

  // テスト2: 異常系のテスト
  describe('fetchDifyInspirationStream - 異常系', () => {
    it('クライアントでエラーが発生した場合、エラーをログに記録してスローすること', async () => {
      // エラーをスローするようにモックを設定
      const testError = new Error('テストエラー')
      mockClient.sendStreamingRequest.mockRejectedValueOnce(testError)
      
      // テスト実行とエラー検証
      await expect(fetchDifyInspirationStream('テスト歌詞', '', mockOnChunk)).rejects.toThrow('テストエラー')
      
      // エラーログの検証
      expect(logError).toHaveBeenCalledWith('DifyService', testError)
    })

    it('ストリーム処理でエラーが発生した場合、エラーをログに記録してスローすること', async () => {
      // エラーをスローするようにモックを設定
      const testError = new Error('ストリーム処理エラー')
      mockStreamProcessor.processStream.mockRejectedValueOnce(testError)
      
      // テスト実行とエラー検証
      await expect(fetchDifyInspirationStream('テスト歌詞', '', mockOnChunk)).rejects.toThrow('ストリーム処理エラー')
      
      // エラーログの検証
      expect(logError).toHaveBeenCalledWith('DifyService', testError)
    })
  })
})
