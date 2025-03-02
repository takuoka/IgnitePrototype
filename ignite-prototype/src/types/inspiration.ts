/**
 * インスピレーション関連の型定義
 */
import { VARIABLE_NAMES } from '@/services/api/constants';

/**
 * セッションデータ
 * 基本フィールド（legacy）と動的フィールド（VARIABLE_NAMESに基づく）を持つ
 */
export interface Session {
  legacy: string;
  [key: string]: string; // 動的フィールド用
}

/**
 * ワークフロー出力データ
 * VARIABLE_NAMESに基づく動的フィールドを持つ
 */
export interface WorkflowOutputs {
  [key: string]: string;
}

/**
 * 型安全性のためのユーティリティ関数
 * 指定されたキーがVARIABLE_NAMESに含まれているかチェック
 */
export function isValidVariableName(key: string): boolean {
  return VARIABLE_NAMES.includes(key);
}

/**
 * チャンクデータ
 */
export interface ChunkData {
  type: string
  content: string | WorkflowOutputs | any
}

/**
 * セッション状態
 */
export interface SessionState {
  sessions: Session[]
  currentSession: Session
  isInitialState: boolean
  isGenerating: boolean
  isLoading: boolean
  hasError: boolean
}
