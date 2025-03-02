/**
 * マークダウン変換ユーティリティ
 */
import { marked } from 'marked'
import type { Session } from '@/types/inspiration'

/**
 * セッションをマークダウンテキストに変換
 * @param session セッションデータ
 * @returns マークダウンテキスト
 */
export const sessionToMarkdown = (session: Session): string => {
  const sections = []
  
  if (session.advice) {
    sections.push(`## アドバイス\n\n${session.advice}`)
  }
  
  if (session.phrases) {
    sections.push(`## フレーズ\n\n${session.phrases}`)
  }
  
  if (session.words) {
    sections.push(`## キーワード\n\n${session.words}`)
  }
  
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
    markdownSections.push('## 生成中...')
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
