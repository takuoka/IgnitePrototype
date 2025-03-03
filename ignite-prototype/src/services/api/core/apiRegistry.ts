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
    // 最初に登録されたAPIをデフォルトとする
    const definitions = this.getAllApiDefinitions();
    return definitions.length > 0 ? definitions[0] : undefined;
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

// シンプルなAPI定義を登録（例）
apiRegistry.registerApi({
  name: 'simple',
  apiKeyEnvName: 'VITE_DIFY_SIMPLE_API_KEY',
  validInputVariables: ['currentLyric'],
  outputVariables: ['advice']
});

export { apiRegistry };
