import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { fetchDifyInspirationStream } from '../../services/api/dify/difyService'
import { createMarkdownStreamRenderer } from '../../services/api/markdownStreamRenderer'

// モジュールのモック
vi.mock('../../services/api/dify/difyService', () => ({
  fetchDifyInspirationStream: vi.fn()
}))

vi.mock('../../services/api/markdownStreamRenderer', () => ({
  createMarkdownStreamRenderer: vi.fn(() => ({
    reset: vi.fn(),
    processChunk: vi.fn((chunk, isFinal) => ({
      text: chunk,
      html: `<p>${chunk}</p>`
    }))
  }))
}))

vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((text) => `<p>${text}</p>`)
  }
}))

// InspirationPanelコンポーネントの実装から必要な部分を抽出してテスト
describe('InspirationPanel機能テスト', () => {
  it('更新時に既存のテキストがリセットされる（現在の動作）', async () => {
    // 準備
    const inspirationText = ref('既存のインスピレーション')
    const mockRenderer = createMarkdownStreamRenderer()
    
    // fetchDifyInspirationStreamのモック実装
    vi.mocked(fetchDifyInspirationStream).mockImplementation(async (lyrics, favoriteLyrics, onChunk) => {
      // 最初のチャンク
      onChunk('新しいインスピレーション', false)
      
      // 最終チャンク（最終チャンクは前のチャンクを含む完全なテキスト）
      onChunk('新しいインスピレーションの続き', true)
    })
    
    // 更新関数の実装（InspirationPanelの実装を簡略化）
    const updateInspiration = async () => {
      // 現在の実装: テキストをリセット
      inspirationText.value = '## 生成中...\n\n'
      
      // レンダラーをリセット
      mockRenderer.reset()
      
      // API呼び出し
      await fetchDifyInspirationStream('', '', (chunk, isFinal) => {
        const result = mockRenderer.processChunk(chunk, !!isFinal)
        inspirationText.value = result.text
      })
    }
    
    // 実行
    await updateInspiration()
    
    // 検証: 既存のテキストがリセットされていることを確認
    expect(inspirationText.value).toBe('新しいインスピレーションの続き')
    expect(mockRenderer.reset).toHaveBeenCalled()
  })
  
  it('更新時に既存のテキストが保持され新しいテキストが追加される（期待される新しい動作）', async () => {
    // 準備
    const inspirationText = ref('既存のインスピレーション')
    const mockRenderer = createMarkdownStreamRenderer()
    
    // fetchDifyInspirationStreamのモック実装
    vi.mocked(fetchDifyInspirationStream).mockImplementation(async (lyrics, favoriteLyrics, onChunk) => {
      // 最初のチャンク
      onChunk('新しいインスピレーション', false)
      
      // 最終チャンク（最終チャンクは前のチャンクを含む完全なテキスト）
      onChunk('新しいインスピレーションの続き', true)
    })
    
    // 更新関数の実装（期待される新しい実装）
    const updateInspirationNew = async () => {
      // 新しい実装: 既存のテキストを保持
      const currentText = inspirationText.value
      inspirationText.value = currentText + '\n\n## 生成中...\n\n'
      
      // レンダラーをリセット
      mockRenderer.reset()
      
      // API呼び出し
      await fetchDifyInspirationStream('', '', (chunk, isFinal) => {
        const result = mockRenderer.processChunk(chunk, !!isFinal)
        
        // 既存のテキストに新しいテキストを追加
        inspirationText.value = currentText + '\n\n---\n\n' + result.text
      })
    }
    
    // 実行
    await updateInspirationNew()
    
    // 検証: 既存のテキストが保持され、新しいテキストが追加されていることを確認
    expect(inspirationText.value).toContain('既存のインスピレーション')
    expect(inspirationText.value).toContain('新しいインスピレーション')
    expect(inspirationText.value).toContain('---') // 区切り線
  })
})
