/**
 * Markdown ストリームレンダラー
 * 
 * ストリーミング中のMarkdownテキストを適切に処理し、
 * 不完全なMarkdownでも可能な限りきれいに表示するためのユーティリティ
 */

import { marked } from 'marked'

/**
 * Markdownレンダリング結果のインターフェース
 */
export interface MarkdownRenderResult {
  /** 元のMarkdownテキスト */
  text: string
  /** レンダリングされたHTML */
  html: string
}

/**
 * Markdownストリームレンダラークラス
 */
export class MarkdownStreamRenderer {
  private accumulatedText: string = ''
  private openCodeBlock: boolean = false
  private openBlockquote: boolean = false
  private listItemCount: number = 0
  
  // markedライブラリへの参照（テスト用にプロパティとして保持）
  private markedLib = marked
  
  /**
   * Markdownチャンクを処理し、HTMLレンダリング結果を返す
   * @param chunk 新しいチャンク
   * @param isFinal 最終チャンクかどうか
   * @returns レンダリング結果
   */
  processChunk(chunk: string, isFinal: boolean): MarkdownRenderResult {
    // 最終チャンクの場合は、前のチャンクを無視して新しいチャンクだけを使用
    if (isFinal) {
      this.accumulatedText = chunk
      return {
        text: this.accumulatedText,
        html: this.renderMarkdown(this.accumulatedText)
      }
    }
    
    // 通常のチャンクの場合はテキストを蓄積
    this.accumulatedText += chunk
    
    // ストリーミング中は構造を解析して適切に処理
    const processedText = this.preprocessMarkdown(this.accumulatedText)
    
    try {
      return {
        text: this.accumulatedText,
        html: this.renderMarkdown(processedText)
      }
    } catch (e) {
      // エラーが発生した場合はプレーンテキストとして表示
      return {
        text: this.accumulatedText,
        html: `<pre class="streaming-preview">${this.escapeHtml(this.accumulatedText)}</pre>`
      }
    }
  }
  
  /**
   * Markdownテキストを前処理して不完全な構造を一時的に修正
   * @param text Markdownテキスト
   * @returns 処理済みテキスト
   */
  private preprocessMarkdown(text: string): string {
    // 構造を解析
    this.analyzeStructure(text)
    
    // 不完全な構造を一時的に修正
    let processed = text
    
    // Markdown構文要素（見出し）の前に改行を挿入
    processed = processed.replace(/([^\n])(\s*)(#{1,6}\s)/g, '$1\n\n$2$3')
    
    // リスト項目の前に改行を挿入
    processed = processed.replace(/([^\n])(\s*)([-*+]\s|\d+\.\s)/g, '$1\n\n$2$3')
    
    // 絵文字の後にMarkdown構文要素が続く場合も改行を挿入
    processed = processed.replace(/([\u{1F300}-\u{1F6FF}])(\s*)(#{1,6}\s|[-*+]\s|\d+\.\s)/gu, '$1\n\n$2$3')
    
    // 開いたままのコードブロックを一時的に閉じる
    if (this.openCodeBlock) {
      processed += '\n```'
    }
    
    // 開いたままのブロッククォートを一時的に閉じる
    if (this.openBlockquote) {
      processed += '\n'
    }
    
    // 処理済みテキストにストリーミング中であることを示すクラスを追加できるよう
    // 特殊なマーカーを追加（markedのレンダリング後に置換）
    processed += '\n\n<!-- streaming-marker -->'
    
    console.log('🔍 [MarkdownStreamRenderer] 前処理後のテキスト:', processed)
    
    return processed
  }
  
  /**
   * Markdownの構造を解析
   * @param text Markdownテキスト
   */
  private analyzeStructure(text: string): void {
    const lines = text.split('\n')
    
    this.openCodeBlock = false
    this.openBlockquote = false
    this.listItemCount = 0
    
    let inCodeBlock = false
    
    for (const line of lines) {
      // コードブロックの開始/終了をチェック
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock
      }
      
      // コードブロック内の場合は構造チェックをスキップ
      if (inCodeBlock) continue
      
      // ブロッククォートをチェック
      if (line.trim().startsWith('>')) {
        this.openBlockquote = true
      } else if (this.openBlockquote && line.trim() === '') {
        this.openBlockquote = false
      }
      
      // リスト項目をチェック
      if (line.trim().match(/^[-*+]\s/) || line.trim().match(/^\d+\.\s/)) {
        this.listItemCount++
      }
    }
    
    this.openCodeBlock = inCodeBlock
  }
  
  /**
   * Markdownをレンダリング
   * @param text Markdownテキスト
   * @returns レンダリングされたHTML
   */
  private renderMarkdown(text: string): string {
    return this.markedLib.parse(text) as string
  }
  
  /**
   * HTMLをエスケープ
   * @param html エスケープするテキスト
   * @returns エスケープされたテキスト
   */
  private escapeHtml(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  
  /**
   * 状態をリセット
   */
  reset(): void {
    this.accumulatedText = ''
    this.openCodeBlock = false
    this.openBlockquote = false
    this.listItemCount = 0
  }
}

/**
 * MarkdownStreamRendererのインスタンスを作成
 * @returns 新しいインスタンス
 */
export function createMarkdownStreamRenderer(): MarkdownStreamRenderer {
  return new MarkdownStreamRenderer()
}
