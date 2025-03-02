/**
 * API定数
 * 
 * APIに関連する定数を定義します。
 */

/**
 * 入力変数名の配列
 */
export const INPUT_VARIABLE_NAMES = ['currentLyric', 'favorite_lyrics', 'global_instruction'];

/**
 * 出力変数名の配列
 */
export const VARIABLE_NAMES = ['advice', 'words', 'phrases', 'lyric', 'final_phrase'];

/**
 * ノードタイトルとセッション変数のマッピング
 */
export const TITLE_TO_VARIABLE_MAP: Record<string, string> = {
  // 日本語タイトル
  '歌詞にAdvice': 'advice',
  'ブラッシュアップWords': 'words',
  'ブラッシュアップPhrases': 'phrases',
  'インスピレーションLyric': 'lyric',
  '最後のフレーズ': 'final_phrase',
  // 英語タイトル
  'advice': 'advice',
  'words': 'words',
  'phrases': 'phrases',
  'lyric': 'lyric',
  'final_phrase': 'final_phrase'
};

/**
 * 変数名とセクションタイトルのマッピング
 */
export const VARIABLE_TO_TITLE_MAP: Record<string, string> = {
  'advice': '歌詞にAdvice',
  'phrases': 'ブラッシュアップPhrases',
  'words': 'ブラッシュアップWords',
  'lyric': 'インスピレーションLyric',
  'final_phrase': '最後のフレーズ'
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
