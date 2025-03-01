<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { fetchDifyInspiration, fetchDifyInspirationStream } from '@/services/api/difyService'
import { createApiErrorMessage, logError } from '@/utils/errorHandler'

// State
const inspirationText = ref('AIのインスピレーションがここに表示されます')
const isLoading = ref(false)
const hasError = ref(false)
const useStreaming = ref(true) // ストリーミングモードを使用するかどうか

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
    console.log(`🔍 [InspirationPanel] モード: ${useStreaming.value ? 'ストリーミング' : 'ブロッキング'}`)
    console.log('📝 [InspirationPanel] 歌詞:', props.lyrics?.substring(0, 100) + (props.lyrics && props.lyrics.length > 100 ? '...' : ''))
    
    isLoading.value = true
    hasError.value = false
    inspirationText.value = '## 生成中...\n\n'
    emit('update')
    console.log('🔄 [InspirationPanel] 初期状態更新')
    
    if (useStreaming.value) {
      // ストリーミングモードでAPI呼び出し
      console.log('🚀 [InspirationPanel] ストリーミングAPI呼び出し開始')
      let chunkCount = 0
      
      await fetchDifyInspirationStream(props.lyrics || '', (chunk: string) => {
        chunkCount++
        console.log(`📦 [InspirationPanel] チャンク #${chunkCount} 受信: ${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}`)
        inspirationText.value += chunk
        console.log(`📊 [InspirationPanel] テキスト合計長: ${inspirationText.value.length} 文字`)
        emit('update')
        console.log('🔄 [InspirationPanel] UI更新イベント発行')
      })
      
      console.log(`✅ [InspirationPanel] ストリーミング完了 (${chunkCount} チャンク受信)`)
    } else {
      // ブロッキングモードでAPI呼び出し
      console.log('🚀 [InspirationPanel] ブロッキングAPI呼び出し開始')
      const output = await fetchDifyInspiration(props.lyrics || '')
      console.log(`📦 [InspirationPanel] レスポンス受信: ${output.substring(0, 100)}${output.length > 100 ? '...' : ''}`)
      inspirationText.value = output
      console.log('🔄 [InspirationPanel] テキスト更新完了')
      emit('update')
    }
    
    console.log('✅ [InspirationPanel] インスピレーション更新完了')
  } catch (error) {
    console.error('❌ [InspirationPanel] エラー発生:', error)
    logError('InspirationPanel', error)
    hasError.value = true
    inspirationText.value = createApiErrorMessage(error)
    console.log('⚠️ [InspirationPanel] エラーメッセージ表示')
  } finally {
    isLoading.value = false
    console.log('🏁 [InspirationPanel] ローディング状態解除')
  }
}

// Computed properties
const renderedMarkdown = computed(() => {
  return marked(inspirationText.value)
})
</script>

<template>
  <div class="inspiration-panel">
    <div 
      class="markdown-content card custom-scrollbar"
      v-html="renderedMarkdown"
    ></div>
    <div class="button-container">
      <button 
        class="primary-button"
        @click="updateInspiration"
        :disabled="isLoading"
      >
        {{ isLoading ? '生成中...' : '更新' }}
      </button>
      <div class="mode-toggle">
        <label class="toggle-label">
          <input 
            type="checkbox" 
            v-model="useStreaming"
            :disabled="isLoading"
          />
          ストリーミングモード
        </label>
      </div>
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

.mode-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  font-size: 0.9rem;
}

.toggle-label input {
  margin-right: 0.5rem;
}
</style>
