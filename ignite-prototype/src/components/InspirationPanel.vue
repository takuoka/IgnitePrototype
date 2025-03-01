<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import { fetchDifyInspirationStream } from '@/services/api/difyService'
import { createApiErrorMessage, logError } from '@/utils/errorHandler'
import { createMarkdownStreamRenderer } from '@/services/api/markdownStreamRenderer'

// レンダラーのインスタンスを作成
const markdownRenderer = createMarkdownStreamRenderer()

// 各セクションの状態を個別に管理
const adviceText = ref('')
const phrasesText = ref('')
const wordsText = ref('')
const legacyText = ref('') // 後方互換性のため

// 初期表示用
const initialText = 'AIのインスピレーションがここに表示されます'
const isInitialState = ref(true)

// その他の状態
const renderedHtml = ref('')
const isLoading = ref(false)
const hasError = ref(false)

// 表示用のテキストを生成
const inspirationText = computed(() => {
  if (isInitialState.value) {
    return initialText
  }
  
  // 新しいフィールドがある場合は、それらを優先して表示
  if (adviceText.value || phrasesText.value || wordsText.value) {
    const sections = []
    
    if (adviceText.value) {
      sections.push(`## アドバイス\n\n${adviceText.value}`)
    }
    
    if (phrasesText.value) {
      sections.push(`## フレーズ\n\n${phrasesText.value}`)
    }
    
    if (wordsText.value) {
      sections.push(`## キーワード\n\n${wordsText.value}`)
    }
    
    return sections.join('\n\n')
  }
  
  // 新しいフィールドがない場合は、レガシーテキストを表示
  return legacyText.value
})

// 初期化時にレンダリング
onMounted(() => {
  renderedHtml.value = marked.parse(initialText) as string
})

// Props and emits
const props = defineProps<{
  lyrics?: string
}>()

const emit = defineEmits(['update'])

/**
 * チャンクデータを解析する
 * @param chunk チャンクデータ
 * @returns 解析結果
 */
const parseChunk = (chunk: string): { type: string, content: string } | null => {
  try {
    // JSONとして解析を試みる
    const data = JSON.parse(chunk)
    if (data && typeof data === 'object' && 'type' in data && 'content' in data) {
      return {
        type: data.type,
        content: data.content
      }
    }
  } catch (e) {
    // JSONではない場合は従来のテキストとして扱う
    return {
      type: 'legacy',
      content: chunk
    }
  }
  
  return null
}

/**
 * Updates the inspiration text by calling the Dify API
 */
const updateInspiration = async () => {
  try {
    console.log('🔄 [InspirationPanel] インスピレーション更新開始')
    console.log('📝 [InspirationPanel] 歌詞:', props.lyrics?.substring(0, 100) + (props.lyrics && props.lyrics.length > 100 ? '...' : ''))
    
    isLoading.value = true
    hasError.value = false
    
    // 既存のテキストを保持するかリセットする
    if (isInitialState.value) {
      // 初回の場合はリセット
      isInitialState.value = false
      adviceText.value = ''
      phrasesText.value = ''
      wordsText.value = ''
      legacyText.value = '## 生成中...\n\n'
    } else {
      // 2回目以降は既存のテキストを保持し、生成中の表示を追加
      legacyText.value = inspirationText.value + '\n\n---\n\n## 生成中...\n\n'
    }
    
    // HTMLを更新
    renderedHtml.value = marked.parse(inspirationText.value) as string
    emit('update')
    console.log('🔄 [InspirationPanel] 初期状態更新')
    
    // ストリーミングモードでAPI呼び出し
    console.log('🚀 [InspirationPanel] ストリーミングAPI呼び出し開始')
    let chunkCount = 0
    
    // レンダラーをリセット
    markdownRenderer.reset()
    
    await fetchDifyInspirationStream(props.lyrics || '', (chunk: string, isFinal?: boolean) => {
      chunkCount++
      console.log(`📦 [InspirationPanel] チャンク #${chunkCount} 受信: ${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''} ${isFinal ? '(最終結果)' : ''}`)
      
      // チャンクを解析
      const parsedChunk = parseChunk(chunk)
      
      if (parsedChunk) {
        // チャンクのタイプに応じて適切な状態を更新
        switch (parsedChunk.type) {
          case 'advice':
            adviceText.value = parsedChunk.content
            break
          case 'phrases':
            phrasesText.value = parsedChunk.content
            break
          case 'words':
            wordsText.value = parsedChunk.content
            break
          case 'legacy':
            // レガシーテキストの場合はマークダウンレンダラーで処理
            const result = markdownRenderer.processChunk(parsedChunk.content, !!isFinal)
            legacyText.value = result.text
            break
        }
      } else {
        // 解析できない場合はレガシーテキストとして扱う
        const result = markdownRenderer.processChunk(chunk, !!isFinal)
        legacyText.value = result.text
      }
      
      // 生成中の表示を削除
      if (isFinal) {
        legacyText.value = legacyText.value.replace(/## 生成中...\n\n/g, '')
      }
      
      // HTMLを更新
      renderedHtml.value = marked.parse(inspirationText.value) as string
      
      console.log(`📊 [InspirationPanel] テキスト合計長: ${inspirationText.value.length} 文字`)
      emit('update')
      console.log('🔄 [InspirationPanel] UI更新イベント発行')
    })
    
    console.log(`✅ [InspirationPanel] ストリーミング完了 (${chunkCount} チャンク受信)`)
    
    console.log('✅ [InspirationPanel] インスピレーション更新完了')
  } catch (error) {
    console.error('❌ [InspirationPanel] エラー発生:', error)
    logError('InspirationPanel', error)
    hasError.value = true
    legacyText.value = createApiErrorMessage(error)
    renderedHtml.value = marked.parse(inspirationText.value) as string
    console.log('⚠️ [InspirationPanel] エラーメッセージ表示')
  } finally {
    isLoading.value = false
    console.log('🏁 [InspirationPanel] ローディング状態解除')
  }
}

</script>

<template>
  <div class="inspiration-panel">
    <div 
      class="markdown-content card custom-scrollbar"
      v-html="renderedHtml"
    ></div>
    <div class="button-container">
      <button 
        class="primary-button"
        @click="updateInspiration"
        :disabled="isLoading"
      >
        {{ isLoading ? '生成中...' : '更新' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.inspiration-panel {
  height: 100%;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.markdown-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.button-container {
  display: flex;
  align-items: center;
  margin-top: 1.2rem;
}

.primary-button {
  margin-right: 1rem;
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
