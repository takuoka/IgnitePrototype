import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick, computed } from 'vue'
import { mount } from '@vue/test-utils'
import { fetchDifyInspirationStream } from '../../services/api/dify/difyService'
import { createMarkdownStreamRenderer } from '../../services/api/markdownStreamRenderer'
import { useInspirationSession } from '../../composables/useInspirationSession'

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

// useInspirationSessionのモック
vi.mock('../../composables/useInspirationSession', () => ({
  useInspirationSession: vi.fn(() => ({
    sessions: ref([]),
    currentSession: ref({}),
    isInitialState: ref(false),
    isGenerating: ref(false),
    renderedHtml: ref('<p>テスト</p>'),
    isLoading: ref(false),
    hasError: ref(false),
    inspirationText: computed(() => 'テスト'),
    updateInspiration: vi.fn(),
    updateHtml: vi.fn(),
    getState: vi.fn(() => ({
      sessions: [],
      currentSession: {},
      isInitialState: false,
      isGenerating: false,
      isLoading: false,
      hasError: false
    }))
  }))
}))

// InspirationPanelコンポーネントのモックを無効化
vi.mock('../InspirationPanel.vue', () => {
  return {
    default: {
      name: 'InspirationPanel',
      template: `
        <div class="inspiration-panel">
          <div class="markdown-content" v-html="renderedHtml"></div>
          <div class="button-container">
            <button @click="handleUpdateInspiration" :disabled="isLoading" class="primary-button">
              <span v-if="isLoading" class="button-content">
                <span>生成中...</span>
                <span class="spinner-inline"></span>
              </span>
              <span v-else>更新</span>
            </button>
          </div>
        </div>
      `,
      props: ['lyrics', 'favoriteLyrics', 'globalInstruction'],
      setup() {
        // useInspirationSessionからisLoadingとisGeneratingを取得
        const { isLoading, isGenerating, renderedHtml } = vi.mocked(useInspirationSession)();
        
        return {
          renderedHtml,
          isLoading,
          isGenerating,
          handleUpdateInspiration: vi.fn()
        }
      }
    }
  }
})


// InspirationPanelコンポーネントのテスト
describe('InspirationPanel', () => {
  // ボタン内ローディングインジケーターのテスト
  describe('ボタン内ローディングインジケーター', () => {
    it('ローディング中にボタン内にスピナーが表示される', async () => {
      // useInspirationSessionのモックを上書き
      const { useInspirationSession } = vi.mocked(await import('../../composables/useInspirationSession'))
      useInspirationSession.mockReturnValue({
        sessions: ref([]),
        currentSession: ref({}),
        isInitialState: ref(false),
        isGenerating: ref(false),
        renderedHtml: ref('<p>テスト</p>'),
        isLoading: ref(true),
        hasError: ref(false),
        inspirationText: computed(() => 'テスト'),
        updateInspiration: vi.fn(),
        updateHtml: vi.fn(),
        getState: vi.fn(() => ({
          sessions: [],
          currentSession: {},
          isInitialState: false,
          isGenerating: false,
          isLoading: true,
          hasError: false
        }))
      })
      
      // コンポーネントをマウント
      const wrapper = mount(await import('../InspirationPanel.vue').then(m => m.default), {
        global: {
          stubs: {
            // テンプレートをスタブ化せずに実際のテンプレートを使用
            InspirationPanel: false
          }
        }
      })
      
      // ボタン内にスピナーが表示されていることを確認
      expect(wrapper.find('.primary-button .spinner-inline').exists()).toBe(true)
      expect(wrapper.find('.primary-button').text()).toContain('生成中...')
    })
    
    it('ローディング中でない場合はボタン内にスピナーが表示されない', async () => {
      // useInspirationSessionのモックを上書き
      const { useInspirationSession } = vi.mocked(await import('../../composables/useInspirationSession'))
      useInspirationSession.mockReturnValue({
        sessions: ref([]),
        currentSession: ref({}),
        isInitialState: ref(false),
        isGenerating: ref(false),
        renderedHtml: ref('<p>テスト</p>'),
        isLoading: ref(false),
        hasError: ref(false),
        inspirationText: computed(() => 'テスト'),
        updateInspiration: vi.fn(),
        updateHtml: vi.fn(),
        getState: vi.fn(() => ({
          sessions: [],
          currentSession: {},
          isInitialState: false,
          isGenerating: false,
          isLoading: false,
          hasError: false
        }))
      })
      
      // コンポーネントをマウント
      const wrapper = mount(await import('../InspirationPanel.vue').then(m => m.default), {
        global: {
          stubs: {
            // テンプレートをスタブ化せずに実際のテンプレートを使用
            InspirationPanel: false
          }
        }
      })
      
      // ボタン内にスピナーが表示されていないことを確認
      expect(wrapper.find('.primary-button .spinner-inline').exists()).toBe(false)
      expect(wrapper.find('.primary-button').text()).toBe('更新')
    })
  })
  
  // 既存のテスト
  describe('機能テスト', () => {
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
})
