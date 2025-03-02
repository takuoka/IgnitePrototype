/**
 * マークダウン変換ユーティリティ
 */
import { marked } from 'marked'
import type { Session } from '@/types/inspiration'
import { VARIABLE_NAMES, VARIABLE_TO_TITLE_MAP, UI_TEXTS } from '@/services/api/constants'

/**
 * セッションをマークダウンテキストに変換
 * @param session セッションデータ
 * @returns マークダウンテキスト
 */
export const sessionToMarkdown = (session: Session): string => {
  const sections = []
  
  // 動的に各変数名に対応するセクションを生成
  VARIABLE_NAMES.forEach(name => {
    if (session[name]) {
      sections.push(`## ${VARIABLE_TO_TITLE_MAP[name]}\n\n${session[name]}`)
    }
  })
  
  if (session.legacy) {
    sections.push(session.legacy)
  }
  
  return sections.join('\n\n')
}

/**
 * 複数のセッションをマークダウンテキストに変換
 * @param sessions セッションの配列
 * @param currentSession 現在のセッション
 * @param isGenerating 生成中かどうか
 * @returns マークダウンテキスト
 */
export const sessionsToMarkdown = (
  sessions: Session[],
  currentSession: Session,
  isGenerating: boolean
): string => {
  // 過去のセッションを変換
  const markdownSections = sessions.map(sessionToMarkdown)
  
  // 現在のセッションを追加
  const currentMarkdown = sessionToMarkdown(currentSession)
  if (currentMarkdown) {
    markdownSections.push(currentMarkdown)
  } else if (isGenerating) {
    markdownSections.push(UI_TEXTS.GENERATING_TEXT)
  }
  
  // すべてのセッションを結合
  return markdownSections.join('\n\n---\n\n')
}

/**
 * マークダウンをHTMLに変換
 * @param markdown マークダウンテキスト
 * @returns HTML
 */
export const markdownToHtml = (markdown: string): string => {
  return marked.parse(markdown) as string
}
