<script setup lang="ts">
import { onMounted } from 'vue'
import { useInspirationSession } from '@/composables/useInspirationSession'

// Props and emits
const props = defineProps<{
  lyrics?: string
  favoriteLyrics?: string
}>()

const emit = defineEmits(['update'])

// インスピレーションセッション管理
const {
  renderedHtml,
  isLoading,
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
  await updateInspiration(props.lyrics || '', props.favoriteLyrics || '', handleUpdate)
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
