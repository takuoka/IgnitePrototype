/**
 * API定数
 * 
 * APIに関連する定数を定義します。
 */

/**
 * 入力変数名の配列
 */
export const INPUT_VARIABLE_NAMES = ['currentLyric', 'favorite_lyrics'];

/**
 * 出力変数名の配列
 */
export const VARIABLE_NAMES = ['advice', 'phrases', 'words'];

/**
 * ノードタイトルとセッション変数のマッピング
 */
export const TITLE_TO_VARIABLE_MAP: Record<string, string> = {
  // 日本語タイトル
  'アドバイス': 'advice',
  'フレーズ': 'phrases',
  'ワード': 'words',
  // 英語タイトル
  'advice': 'advice',
  'phrases': 'phrases',
  'words': 'words'
};

/**
 * 変数名とセクションタイトルのマッピング
 */
export const VARIABLE_TO_TITLE_MAP: Record<string, string> = {
  'advice': 'アドバイス',
  'phrases': 'フレーズ',
  'words': 'キーワード'
};

/**
 * 結果キーの配列
 * フィルタリングに使用するキー
 */
export const RESULT_KEYS = ['result', 'text', 'answer', 'content', ...VARIABLE_NAMES];

/**
 * イベントタイプ
 */
export const EVENT_TYPES = {
  LEGACY: 'legacy',
  NODE_LLM: 'node_llm',
  NODE_OTHER: 'node_other',
  WORKFLOW_OUTPUTS: 'workflow_outputs',
  COMPLETION: 'completion'
};

/**
 * UI表示用テキスト
 */
export const UI_TEXTS = {
  INITIAL_TEXT: 'AIのインスピレーションがここに表示されます',
  GENERATING_TEXT: '## 生成中...'
};
