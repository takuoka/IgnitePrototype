<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { fetchDifyInspiration } from '@/services/api/difyService'
import { createApiErrorMessage, logError } from '@/utils/errorHandler'

// State
const inspirationText = ref('AIのインスピレーションがここに表示されます')
const isLoading = ref(false)
const hasError = ref(false)

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
    isLoading.value = true
    hasError.value = false
    inspirationText.value = '## 生成中...\n\nAIがインスピレーションを考えています...'
    emit('update')
    
    const output = await fetchDifyInspiration(props.lyrics || '')
    inspirationText.value = output
  } catch (error) {
    logError('InspirationPanel', error)
    hasError.value = true
    inspirationText.value = createApiErrorMessage(error)
  } finally {
    isLoading.value = false
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
    <button 
      class="primary-button"
      @click="updateInspiration"
      :disabled="isLoading"
    >
      {{ isLoading ? '生成中...' : '更新' }}
    </button>
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

.primary-button {
  margin-top: 1.2rem;
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
