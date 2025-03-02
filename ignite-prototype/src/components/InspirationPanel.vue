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
    
    <div class="button-container">
      <button 
        class="primary-button"
        @click="handleUpdateInspiration"
        :disabled="isLoading"
      >
        <span v-if="isLoading" class="button-content">
          <span>生成中...</span>
          <span class="spinner-inline"></span>
        </span>
        <span v-else>更新</span>
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

/* ボタン内のコンテンツのスタイル */
.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner-inline {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
