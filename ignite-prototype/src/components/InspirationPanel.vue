<script setup lang="ts">
import { onMounted } from 'vue'
import { useInspirationSession } from '@/composables/useInspirationSession'

// Props and emits
const props = defineProps<{
  lyrics?: string
  favoriteLyrics?: string
  globalInstruction?: string
}>()

const emit = defineEmits(['update'])

// インスピレーションセッション管理
const {
  renderedHtml,
  isLoading,
  isGenerating,
  updateInspiration,
  updateHtml
} = useInspirationSession()

// 更新時のコールバック
const handleUpdate = () => {
  emit('update')
}

// 初期化時にレンダリング
onMounted(() => {
  updateHtml()
})

/**
 * インスピレーションを更新
 */
const handleUpdateInspiration = async () => {
  await updateInspiration(
    props.lyrics || '', 
    props.favoriteLyrics || '', 
    handleUpdate,
    props.globalInstruction || ''
  )
}
</script>

<template>
  <div class="inspiration-panel">
    <div 
      class="markdown-content card custom-scrollbar"
      v-html="renderedHtml"
    ></div>
    
    <!-- 生成中インジケーター（テキストの下に表示） -->
    <div v-if="isLoading || isGenerating" class="inline-indicator">
      <div class="spinner-inline"></div>
    </div>
    
    <div class="button-container">
      <button 
        class="primary-button"
        @click="handleUpdateInspiration"
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
  position: relative; /* ローディングインジケーターの配置のため */
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

/* インラインインジケーター（テキストの下に表示） */
.inline-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  pointer-events: none; /* ユーザーの操作を妨げない */
}

.spinner-inline {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
