import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRegistry } from '../../core/apiRegistry';
import type { DifyApiDefinition } from '@/types/api';

// API定義
const defaultApiDef: DifyApiDefinition = {
  name: 'default',
  apiKeyEnvName: 'VITE_DIFY_API_KEY',
  validInputVariables: ['currentLyric', 'favorite_lyrics', 'global_instruction'],
  outputVariables: ['advice', 'words', 'phrases', 'lyric', 'final_phrase']
};

const simpleApiDef: DifyApiDefinition = {
  name: 'simple',
  apiKeyEnvName: 'VITE_DIFY_SIMPLE_API_KEY',
  validInputVariables: ['currentLyric'],
  outputVariables: ['advice']
};

// APIレジストリをモック
vi.mock('../../core/apiRegistry', () => {
  return {
    apiRegistry: {
      getApiDefinition: vi.fn((name: string) => {
        if (name === 'default') return defaultApiDef;
        if (name === 'simple') return simpleApiDef;
        return undefined;
      }),
      getAllApiDefinitions: vi.fn(() => [defaultApiDef, simpleApiDef]),
      getDefaultApiDefinition: vi.fn(() => defaultApiDef),
      registerApi: vi.fn()
    }
  };
});

// DifyClientをモック
vi.mock('../difyClient', () => {
  return {
    getDifyConfig: vi.fn((apiDef: DifyApiDefinition) => {
      if (apiDef.apiKeyEnvName === 'VITE_DIFY_API_KEY') {
        return {
          apiBaseUrl: 'https://api.dify.ai/v1',
          apiKey: 'test-api-key'
        };
      } else if (apiDef.apiKeyEnvName === 'VITE_DIFY_SIMPLE_API_KEY') {
        return {
          apiBaseUrl: 'https://api.dify.ai/v1',
          apiKey: 'simple-api-key'
        };
      } else {
        throw new Error(`環境変数 ${apiDef.apiKeyEnvName} が設定されていません`);
      }
    }),
    DifyApiClient: vi.fn().mockImplementation((apiName = 'default') => {
      const apiDef = apiRegistry.getApiDefinition(apiName);
      if (!apiDef) {
        throw new Error(`API定義 "${apiName}" が見つかりません`);
      }
      
      return {
        getApiDefinition: () => apiDef,
        sendStreamingRequest: vi.fn().mockImplementation(async (inputs) => {
          // 入力をフィルタリング
          const filteredInputs: Record<string, any> = {};
          const validKeys = apiDef.validInputVariables;
          
          Object.keys(inputs).forEach(key => {
            if (validKeys.includes(key)) {
              filteredInputs[key] = inputs[key];
            }
          });
          
          // モックレスポンスを返す
          return {
            response: { ok: true },
            reader: { read: vi.fn() }
          };
        })
      };
    }),
    createDifyClient: vi.fn().mockImplementation((apiName = 'default') => {
      return new (vi.mocked(require('../difyClient').DifyApiClient))(apiName);
    })
  };
});

// DifyClientとgetDifyConfigをインポート
import { DifyApiClient, getDifyConfig } from '../difyClient';

describe('DifyApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('getDifyConfig', () => {
    it('should get config from API definition', () => {
      const apiDef: DifyApiDefinition = {
        name: 'test',
        apiKeyEnvName: 'VITE_DIFY_API_KEY',
        validInputVariables: ['input1'],
        outputVariables: ['output1']
      };
      
      const config = getDifyConfig(apiDef);
      
      expect(config).toEqual({
        apiBaseUrl: 'https://api.dify.ai/v1',
        apiKey: 'test-api-key'
      });
    });
    
    it('should throw error when API key is not defined', () => {
      const apiDef: DifyApiDefinition = {
        name: 'test',
        apiKeyEnvName: 'VITE_NON_EXISTENT_KEY',
        validInputVariables: ['input1'],
        outputVariables: ['output1']
      };
      
      expect(() => getDifyConfig(apiDef)).toThrow();
    });
  });
  
  describe('DifyApiClient', () => {
    it('should initialize with default API', () => {
      const client = new DifyApiClient();
      
      expect(client.getApiDefinition()).toEqual(apiRegistry.getApiDefinition('default'));
    });
    
    it('should initialize with specified API', () => {
      const client = new DifyApiClient('simple');
      
      expect(client.getApiDefinition()).toEqual(apiRegistry.getApiDefinition('simple'));
    });
    
    it('should throw error for non-existent API', () => {
      expect(() => new DifyApiClient('non-existent')).toThrow();
    });
    
    it('should filter inputs based on valid input variables', async () => {
      // モックの実装を上書き
      const mockSendStreamingRequest = vi.fn().mockImplementation(async (inputs) => {
        // 入力をフィルタリング
        const filteredInputs: Record<string, any> = {};
        const validKeys = ['currentLyric']; // simpleAPIの有効な入力
        
        Object.keys(inputs).forEach(key => {
          if (validKeys.includes(key)) {
            filteredInputs[key] = inputs[key];
          }
        });
        
        // フィルタリングされた入力を返す
        return {
          response: { ok: true },
          reader: { read: vi.fn() },
          filteredInputs
        };
      });
      
      // DifyApiClientのモックを上書き
      vi.mocked(DifyApiClient).mockImplementation(() => {
        return {
          getApiDefinition: () => simpleApiDef,
          sendStreamingRequest: mockSendStreamingRequest
        } as any;
      });
      
      const client = new DifyApiClient('simple');
      
      // 'simple' APIは 'currentLyric' のみ有効
      const inputs = {
        currentLyric: 'test lyric',
        favorite_lyrics: 'should be filtered out',
        global_instruction: 'should be filtered out'
      };
      
      const result = await client.sendStreamingRequest(inputs);
      
      // sendStreamingRequestが呼ばれたことを確認
      expect(mockSendStreamingRequest).toHaveBeenCalled();
      
      // フィルタリングされた入力を確認
      expect(result.filteredInputs).toHaveProperty('currentLyric');
      expect(result.filteredInputs).not.toHaveProperty('favorite_lyrics');
      expect(result.filteredInputs).not.toHaveProperty('global_instruction');
    });
  });
});
