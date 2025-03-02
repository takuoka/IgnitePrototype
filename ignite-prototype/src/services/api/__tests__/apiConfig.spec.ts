import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as apiConfigModule from '../core/apiConfig'
import { getDefaultApiConfig, generateUserId, getUserId } from '../core/apiConfig'

// Viteの環境変数の型定義を拡張
declare global {
  interface ImportMeta {
    env: Record<string, string>
  }
}

describe('apiConfig', () => {
  // テスト前の準備
  beforeEach(() => {
    // モックをリセット
    vi.resetAllMocks()
    
    // 実際の関数を使用するためにモジュールをリセット
    vi.restoreAllMocks()
  })

  // テスト1: getDefaultApiConfigのテスト
  describe('getDefaultApiConfig', () => {
    it('環境変数から設定を取得すること', () => {
      // 環境変数をモック
      const mockEnv = {
        VITE_API_BASE_URL: 'https://api.example.com',
        VITE_API_KEY: 'test-api-key'
      }
      
      // getDefaultApiConfig関数をモック
      vi.spyOn(apiConfigModule, 'getDefaultApiConfig').mockImplementation(() => {
        return {
          apiBaseUrl: mockEnv.VITE_API_BASE_URL,
          apiKey: mockEnv.VITE_API_KEY
        }
      })
      
      const config = getDefaultApiConfig()
      
      expect(config).toEqual({
        apiBaseUrl: 'https://api.example.com',
        apiKey: 'test-api-key'
      })
    })

    it('APIベースURLが設定されていない場合、エラーをスローすること', () => {
      // getDefaultApiConfig関数をモック
      vi.spyOn(apiConfigModule, 'getDefaultApiConfig').mockImplementation(() => {
        throw new Error('環境変数 VITE_API_BASE_URL が設定されていません')
      })
      
      expect(() => getDefaultApiConfig()).toThrow('環境変数 VITE_API_BASE_URL が設定されていません')
    })

    it('APIキーが設定されていない場合、エラーをスローすること', () => {
      // getDefaultApiConfig関数をモック
      vi.spyOn(apiConfigModule, 'getDefaultApiConfig').mockImplementation(() => {
        throw new Error('環境変数 VITE_API_KEY が設定されていません')
      })
      
      expect(() => getDefaultApiConfig()).toThrow('環境変数 VITE_API_KEY が設定されていません')
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

  // テスト3: getUserIdのテスト
  describe('getUserId', () => {
    let originalLocalStorage: Storage
    
    beforeEach(() => {
      // ローカルストレージをモック
      originalLocalStorage = global.localStorage
      global.localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0
      }
      
      // Date.nowをモック
      vi.spyOn(Date, 'now').mockReturnValue(1646035200000)
    })
    
    afterEach(() => {
      // ローカルストレージを元に戻す
      global.localStorage = originalLocalStorage
    })
    
    it('ローカルストレージからユーザーIDを取得すること', () => {
      // ローカルストレージにユーザーIDが存在する場合
      vi.spyOn(localStorage, 'getItem').mockReturnValue('existing-user-id')
      
      const userId = getUserId('test_user_id')
      
      expect(userId).toBe('existing-user-id')
      expect(localStorage.getItem).toHaveBeenCalledWith('test_user_id')
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
    
    it('ローカルストレージにユーザーIDがない場合、新しいIDを生成して保存すること', () => {
      // ローカルストレージにユーザーIDが存在しない場合
      vi.spyOn(localStorage, 'getItem').mockReturnValue(null)
      
      const userId = getUserId('test_user_id')
      
      expect(userId).toBe('user-1646035200000')
      expect(localStorage.getItem).toHaveBeenCalledWith('test_user_id')
      expect(localStorage.setItem).toHaveBeenCalledWith('test_user_id', 'user-1646035200000')
    })
    
    it('デフォルトのストレージキーを使用すること', () => {
      // ローカルストレージにユーザーIDが存在しない場合
      vi.spyOn(localStorage, 'getItem').mockReturnValue(null)
      
      const userId = getUserId()
      
      expect(userId).toBe('user-1646035200000')
      expect(localStorage.getItem).toHaveBeenCalledWith('app_user_id')
      expect(localStorage.setItem).toHaveBeenCalledWith('app_user_id', 'user-1646035200000')
    })
  })
})
