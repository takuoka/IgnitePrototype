/**
 * API定義レジストリ
 * 
 * 複数のDify API定義を管理するためのレジストリ
 */

import type { DifyApiDefinition } from '@/types/api';

/**
 * APIレジストリクラス
 */
export class ApiRegistry {
  private apiDefinitions: Map<string, DifyApiDefinition> = new Map();
  
  /**
   * API定義を登録
   * @param definition - API定義
   */
  registerApi(definition: DifyApiDefinition): void {
    this.apiDefinitions.set(definition.name, definition);
  }
  
  /**
   * API定義を取得
   * @param name - API名
   * @returns API定義（存在しない場合はundefined）
   */
  getApiDefinition(name: string): DifyApiDefinition | undefined {
    return this.apiDefinitions.get(name);
  }
  
  /**
   * 登録されているすべてのAPI定義を取得
   * @returns API定義の配列
   */
  getAllApiDefinitions(): DifyApiDefinition[] {
    return Array.from(this.apiDefinitions.values());
  }
  
  /**
   * デフォルトのAPI定義を取得
   * @returns デフォルトのAPI定義（存在しない場合はundefined）
   */
  getDefaultApiDefinition(): DifyApiDefinition | undefined {
    return this.getApiDefinition('default');
  }
}

// シングルトンインスタンス
const apiRegistry = new ApiRegistry();

// デフォルトのAPI定義を登録
apiRegistry.registerApi({
  name: 'default',
  apiKeyEnvName: 'VITE_DIFY_API_KEY',
  validInputVariables: ['currentLyric', 'favorite_lyrics', 'global_instruction'],
  outputVariables: ['advice', 'words', 'phrases', 'lyric', 'final_phrase']
});

// シンプルなAPI定義を登録（入力は currentLyric のみ）
apiRegistry.registerApi({
  name: 'simple',
  apiKeyEnvName: 'VITE_DIFY_SIMPLE_API_KEY',
  validInputVariables: ['currentLyric'],
  outputVariables: ['advice']
});

// デバッグ用API定義を登録
apiRegistry.registerApi({
  name: 'debug',
  apiKeyEnvName: 'VITE_DIFY_DEBUG_API_KEY',
  validInputVariables: ['currentLyric', 'favorite_lyrics', 'global_instruction'],
  outputVariables: ['advice', 'words', 'phrases', 'lyric', 'final_phrase', 'debug_info']
});

// マルチ出力API定義を登録
apiRegistry.registerApi({
  name: 'multi-output',
  apiKeyEnvName: 'VITE_DIFY_MULTI_OUTPUT_API_KEY',
  validInputVariables: ['currentLyric', 'favorite_lyrics'],
  outputVariables: ['advice', 'words', 'phrases', 'lyric', 'final_phrase', 'alternative_lyrics', 'theme_analysis']
});

// マルチ入出力API定義を登録
apiRegistry.registerApi({
  name: 'multi-io',
  apiKeyEnvName: 'VITE_DIFY_MULTI_IO_API_KEY',
  validInputVariables: ['currentLyric', 'favorite_lyrics', 'global_instruction', 'genre', 'mood', 'theme'],
  outputVariables: ['advice', 'words', 'phrases', 'lyric', 'final_phrase', 'alternative_lyrics', 'theme_analysis']
});

// 軽量版API定義を登録
apiRegistry.registerApi({
  name: 'lite',
  apiKeyEnvName: 'VITE_DIFY_LITE_API_KEY',
  validInputVariables: ['currentLyric'],
  outputVariables: ['advice', 'words']
});

export { apiRegistry };
