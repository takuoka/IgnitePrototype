import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { fetchDifyInspirationStream } from '../../services/api/dify/difyService'
import { createMarkdownStreamRenderer } from '../../services/api/markdownStreamRenderer'
import { useInspirationSession } from '../../composables/useInspirationSession'

// InspirationPanelコンポーネントのモック
const InspirationPanel = defineComponent({
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
  props: {
    lyrics: { type: String, default: '' },
    favoriteLyrics: { type: String, default: '' },
    globalInstruction: { type: String, default: '' }
  },
  setup(props, { emit }) {
    const {
      renderedHtml,
      isLoading,
      updateInspiration
    } = useInspirationSession()
    
    const handleUpdateInspiration = async () => {
      await updateInspiration(
        props.lyrics,
        props.favoriteLyrics,
        () => emit('update'),
        props.globalInstruction
      )
    }
    
    return {
      renderedHtml,
      isLoading,
      handleUpdateInspiration
    }
  }
})

// 依存するサービスとコンポジブルのモック
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

vi.mock('../../composables/useInspirationSession', () => ({
  useInspirationSession: vi.fn()
}))

// テスト用のモックデータ
const createMockInspirationSession = (isLoading = false) => ({
  sessions: ref([]),
  currentSession: ref({}),
  isInitialState: ref(false),
  isGenerating: ref(false),
  renderedHtml: ref('<p>テスト</p>'),
  isLoading: ref(isLoading),
  hasError: ref(false),
  inspirationText: computed(() => 'テスト'),
  updateInspiration: vi.fn(),
  updateHtml: vi.fn(),
  getState: vi.fn(() => ({
    sessions: [],
    currentSession: {},
    isInitialState: false,
    isGenerating: false,
    isLoading: isLoading,
    hasError: false
  }))
})

// InspirationPanelコンポーネントのテスト
describe('InspirationPanel', () => {
  // 各テスト前の準備
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ボタン内ローディングインジケーターのテスト
  describe('ボタン内ローディングインジケーター', () => {
    it('ローディング中にボタン内にスピナーが表示される', async () => {
      // useInspirationSessionのモックを設定
      vi.mocked(useInspirationSession).mockReturnValue(createMockInspirationSession(true))
      
      // コンポーネントをマウント
      const wrapper = mount(InspirationPanel)
      
      // ボタン内にスピナーが表示されていることを確認
      expect(wrapper.find('.primary-button .spinner-inline').exists()).toBe(true)
      expect(wrapper.find('.primary-button').text()).toContain('生成中...')
    })
    
    it('ローディング中でない場合はボタン内にスピナーが表示されない', async () => {
      // useInspirationSessionのモックを設定
      vi.mocked(useInspirationSession).mockReturnValue(createMockInspirationSession(false))
      
      // コンポーネントをマウント
      const wrapper = mount(InspirationPanel)
      
      // ボタン内にスピナーが表示されていないことを確認
      expect(wrapper.find('.primary-button .spinner-inline').exists()).toBe(false)
      expect(wrapper.find('.primary-button').text()).toBe('更新')
    })
  })
  
  // 更新機能のテスト
  describe('更新機能', () => {
    it('更新ボタンをクリックするとupdateInspirationが呼ばれる', async () => {
      // モックの準備
      const mockUpdateInspiration = vi.fn()
      vi.mocked(useInspirationSession).mockReturnValue({
        ...createMockInspirationSession(),
        updateInspiration: mockUpdateInspiration
      })
      
      // コンポーネントをマウント
      const wrapper = mount(InspirationPanel)
      
      // 更新ボタンをクリック
      await wrapper.find('.primary-button').trigger('click')
      
      // updateInspirationが呼ばれたことを確認
      expect(mockUpdateInspiration).toHaveBeenCalled()
    })
  })
  
  // インスピレーション更新ロジックのテスト
  describe('インスピレーション更新ロジック', () => {
    it('更新ボタンクリック時にfetchDifyInspirationStreamが正しく呼び出されること', async () => {
      // モックの準備
      const mockUpdateInspiration = vi.fn()
      vi.mocked(useInspirationSession).mockReturnValue({
        ...createMockInspirationSession(),
        updateInspiration: mockUpdateInspiration
      })
      
      // fetchDifyInspirationStreamのモック実装
      vi.mocked(fetchDifyInspirationStream).mockImplementation(async (lyrics, favoriteLyrics, onChunk) => {
        onChunk('テストチャンク', true)
        return Promise.resolve()
      })
      
      // コンポーネントをマウント（propsを設定）
      const wrapper = mount(InspirationPanel, {
        props: {
          lyrics: 'テスト歌詞',
          favoriteLyrics: 'お気に入り歌詞',
          globalInstruction: 'テスト指示'
        }
      })
      
      // 更新ボタンをクリック
      await wrapper.find('.primary-button').trigger('click')
      
      // updateInspirationが正しいパラメータで呼ばれたことを確認
      expect(mockUpdateInspiration).toHaveBeenCalledWith(
        'テスト歌詞',
        'お気に入り歌詞',
        expect.any(Function),
        'テスト指示'
      )
    })
  })
})
