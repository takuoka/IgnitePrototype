<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'
import { fetchDifyInspirationStream } from '@/services/api/difyService'
import { createApiErrorMessage, logError } from '@/utils/errorHandler'
import { createMarkdownStreamRenderer } from '@/services/api/markdownStreamRenderer'

// レンダラーのインスタンスを作成
const markdownRenderer = createMarkdownStreamRenderer()

// State
const inspirationText = ref('AIのインスピレーションがここに表示されます')
const renderedHtml = ref('')
const isLoading = ref(false)
const hasError = ref(false)

// 初期化時にレンダリング
onMounted(() => {
  renderedHtml.value = marked.parse(inspirationText.value) as string
})

// Props and emits
const props = defineProps<{
  lyrics?: string
}>()

const emit = defineEmits(['update'])

/**
 * Updates the inspiration text by calling the Dify API
 */
const updateInspiration = async () => {
  try {
    console.log('🔄 [InspirationPanel] インスピレーション更新開始')
    console.log('📝 [InspirationPanel] 歌詞:', props.lyrics?.substring(0, 100) + (props.lyrics && props.lyrics.length > 100 ? '...' : ''))
    
    isLoading.value = true
    hasError.value = false
    
    // 既存のテキストを保持
    const currentText = inspirationText.value
    
    // 生成中の表示を追加
    inspirationText.value = currentText === 'AIのインスピレーションがここに表示されます'
      ? '## 生成中...\n\n'
      : currentText + '\n\n---\n\n## 生成中...\n\n'
    
    renderedHtml.value = marked.parse(inspirationText.value) as string
    emit('update')
    console.log('🔄 [InspirationPanel] 初期状態更新')
    
    // レンダラーをリセット
    markdownRenderer.reset()
    
    // ストリーミングモードでAPI呼び出し
    console.log('🚀 [InspirationPanel] ストリーミングAPI呼び出し開始')
    let chunkCount = 0
    
    await fetchDifyInspirationStream(props.lyrics || '', (chunk: string, isFinal?: boolean) => {
      chunkCount++
      console.log(`📦 [InspirationPanel] チャンク #${chunkCount} 受信: ${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''} ${isFinal ? '(最終結果)' : ''}`)
      
      // レンダラーでチャンクを処理
      const result = markdownRenderer.processChunk(chunk, !!isFinal)
      
      // テキストと描画結果を更新
      if (currentText === 'AIのインスピレーションがここに表示されます') {
        // 初回の場合は置き換え
        inspirationText.value = result.text
      } else {
        // 2回目以降は追加
        inspirationText.value = currentText + '\n\n---\n\n' + result.text
      }
      
      // ストリーミングマーカーを置換してクラスを追加
      let html = result.html
      if (!isFinal) {
        html = html.replace(
          /<p><!-- streaming-marker --><\/p>/,
          '<div class="streaming-indicator"></div>'
        )
      }
      
      // renderedHtmlも初回と2回目以降で処理を分ける
      if (currentText === 'AIのインスピレーションがここに表示されます') {
        // 初回の場合は置き換え
        renderedHtml.value = html
      } else {
        // 2回目以降は、マークダウンを再レンダリングして全体を表示
        renderedHtml.value = marked.parse(inspirationText.value) as string
      }
      
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
    inspirationText.value = createApiErrorMessage(error)
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
