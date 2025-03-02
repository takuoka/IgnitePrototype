/**
 * API定数
 * 
 * APIに関連する定数を定義します。
 */

/**
 * 変数名の配列
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
 * 結果キーの配列
 * フィルタリングに使用するキー
 */
export const RESULT_KEYS = ['result', 'text', 'answer', 'content', ...VARIABLE_NAMES];
