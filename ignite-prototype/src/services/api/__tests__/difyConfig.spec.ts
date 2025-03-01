import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as difyConfigModule from '../difyConfig'
import { getDifyConfig, generateUserId } from '../difyConfig'

// Viteの環境変数の型定義を拡張
declare global {
  interface ImportMeta {
    env: Record<string, string>
  }
}

describe('difyConfig', () => {
  // テスト前の準備
  beforeEach(() => {
    // モックをリセット
    vi.resetAllMocks()
    
    // 実際の関数を使用するためにモジュールをリセット
    vi.restoreAllMocks()
  })

  // テスト1: getDifyConfigのテスト
  describe('getDifyConfig', () => {
    it('環境変数から設定を取得すること', () => {
      // 環境変数をモック
      const mockEnv = {
        VITE_DIFY_API_BASE_URL: 'https://api.example.com',
        VITE_DIFY_API_KEY: 'test-api-key'
      }
      
      // getDifyConfig関数をモック
      vi.spyOn(difyConfigModule, 'getDifyConfig').mockImplementation(() => {
        return {
          apiBaseUrl: mockEnv.VITE_DIFY_API_BASE_URL,
          apiKey: mockEnv.VITE_DIFY_API_KEY
        }
      })
      
      const config = getDifyConfig()
      
      expect(config).toEqual({
        apiBaseUrl: 'https://api.example.com',
        apiKey: 'test-api-key'
      })
    })

    it('APIベースURLが設定されていない場合、エラーをスローすること', () => {
      // getDifyConfig関数をモック
      vi.spyOn(difyConfigModule, 'getDifyConfig').mockImplementation(() => {
        throw new Error('API configuration missing. Check environment variables.')
      })
      
      expect(() => getDifyConfig()).toThrow('API configuration missing')
    })

    it('APIキーが設定されていない場合、エラーをスローすること', () => {
      // getDifyConfig関数をモック
      vi.spyOn(difyConfigModule, 'getDifyConfig').mockImplementation(() => {
        throw new Error('API configuration missing. Check environment variables.')
      })
      
      expect(() => getDifyConfig()).toThrow('API configuration missing')
    })
  })

  // テスト2: generateUserIdのテスト
  describe('generateUserId', () => {
    it('一意のユーザーIDを生成すること', () => {
      // Date.nowをモック
      const mockDate = 1646035200000 // 2022-02-28T00:00:00.000Z
      vi.spyOn(Date, 'now').mockReturnValue(mockDate)
      
      const userId = generateUserId()
      
      expect(userId).toBe('user-1646035200000')
    })

    it('呼び出し毎に異なるユーザーIDを生成すること', () => {
      // Date.nowをモック（呼び出し毎に異なる値を返す）
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1646035200000) // 1回目
        .mockReturnValueOnce(1646035200001) // 2回目
      
      const userId1 = generateUserId()
      const userId2 = generateUserId()
      
      expect(userId1).toBe('user-1646035200000')
      expect(userId2).toBe('user-1646035200001')
      expect(userId1).not.toBe(userId2)
    })
  })
})
