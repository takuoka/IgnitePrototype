import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDifyInspirationStream, fetchDifyInspirationStreamLegacy } from '../difyService';
import * as difyClientModule from '../difyClient';
import * as difyStreamProcessorModule from '../difyStreamProcessor';
import * as apiRegistryModule from '../../core/apiRegistry';
import type { DifyApiDefinition } from '@/types/api';

describe('DifyService', () => {
  // モック
  const mockSendStreamingRequest = vi.fn();
  const mockProcessStream = vi.fn();
  const mockReader = { read: vi.fn() };
  const mockApiRegistry = {
    getApiDefinition: vi.fn(),
    getAllApiDefinitions: vi.fn(),
    getDefaultApiDefinition: vi.fn(),
    registerApi: vi.fn()
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // APIレジストリをモック
    vi.spyOn(apiRegistryModule, 'apiRegistry', 'get').mockReturnValue(mockApiRegistry);
    
    // API定義のモック
    const defaultApiDef: DifyApiDefinition = {
      name: 'default',
      apiKeyEnvName: 'VITE_DIFY_API_KEY',
      validInputVariables: ['currentLyric', 'favorite_lyrics', 'global_instruction'],
      outputVariables: ['advice', 'words', 'phrases', 'lyric', 'final_phrase']
    };
    
    const testApiDef: DifyApiDefinition = {
      name: 'test-api',
      apiKeyEnvName: 'VITE_DIFY_TEST_API_KEY',
      validInputVariables: ['currentLyric', 'favorite_lyrics', 'global_instruction'],
      outputVariables: ['advice', 'words', 'phrases', 'lyric', 'final_phrase']
    };
    
    // getApiDefinitionの実装
    mockApiRegistry.getApiDefinition.mockImplementation((name: string) => {
      if (name === 'default') return defaultApiDef;
      if (name === 'test-api') return testApiDef;
      return undefined;
    });
    
    // DifyClientのモック
    vi.spyOn(difyClientModule, 'createDifyClient').mockImplementation((apiName) => ({
      sendStreamingRequest: mockSendStreamingRequest,
      getApiDefinition: () => ({
        name: apiName || 'default',
        apiKeyEnvName: `VITE_DIFY_${apiName?.toUpperCase() || 'DEFAULT'}_API_KEY`,
        validInputVariables: ['currentLyric', 'favorite_lyrics', 'global_instruction'],
        outputVariables: ['advice', 'words', 'phrases', 'lyric', 'final_phrase']
      })
    }));
    
    // DifyStreamProcessorのモック
    vi.spyOn(difyStreamProcessorModule, 'createDifyStreamProcessor').mockImplementation(() => ({
      processStream: mockProcessStream
    }));
    
    // sendStreamingRequestの戻り値を設定
    mockSendStreamingRequest.mockResolvedValue({
      response: {},
      reader: mockReader
    });
  });
  
  describe('fetchDifyInspirationStream', () => {
    it('should call client with correct API name and inputs', async () => {
      const onChunk = vi.fn();
      const inputs = {
        currentLyric: 'test lyric',
        favorite_lyrics: 'favorite lyric',
        global_instruction: 'test instruction'
      };
      
      await fetchDifyInspirationStream('test-api', inputs, onChunk);
      
      // 正しいAPI名でクライアントが作成されたか確認
      expect(difyClientModule.createDifyClient).toHaveBeenCalledWith('test-api');
      
      // 正しい入力でsendStreamingRequestが呼ばれたか確認
      expect(mockSendStreamingRequest).toHaveBeenCalledWith(inputs);
      
      // processStreamが正しく呼ばれたか確認
      expect(mockProcessStream).toHaveBeenCalledWith(mockReader, onChunk);
    });
    
    it('should handle errors', async () => {
      const onChunk = vi.fn();
      const error = new Error('Test error');
      
      mockSendStreamingRequest.mockRejectedValue(error);
      
      await expect(fetchDifyInspirationStream('default', {}, onChunk)).rejects.toThrow(error);
    });
  });
  
  describe('fetchDifyInspirationStreamLegacy', () => {
    it('should convert legacy parameters to new format', async () => {
      const onChunk = vi.fn();
      const lyrics = 'test lyric';
      const favoriteLyrics = 'favorite lyric';
      const globalInstruction = 'test instruction';
      
      await fetchDifyInspirationStreamLegacy(lyrics, favoriteLyrics, onChunk, globalInstruction);
      
      // デフォルトのAPI名でクライアントが作成されたか確認
      expect(difyClientModule.createDifyClient).toHaveBeenCalledWith('default');
      
      // 正しい入力でsendStreamingRequestが呼ばれたか確認
      expect(mockSendStreamingRequest).toHaveBeenCalledWith({
        currentLyric: lyrics,
        favorite_lyrics: favoriteLyrics,
        global_instruction: globalInstruction
      });
      
      // processStreamが正しく呼ばれたか確認
      expect(mockProcessStream).toHaveBeenCalledWith(mockReader, onChunk);
    });
    
    it('should handle empty inputs', async () => {
      const onChunk = vi.fn();
      
      await fetchDifyInspirationStreamLegacy('', '', onChunk);
      
      // 正しい入力でsendStreamingRequestが呼ばれたか確認
      expect(mockSendStreamingRequest).toHaveBeenCalledWith({
        currentLyric: '歌詞を入力してください',
        favorite_lyrics: ''
      });
    });
  });
});
