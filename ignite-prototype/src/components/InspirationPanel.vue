<script setup lang="ts">
import { onMounted, ref, watch, onUnmounted } from 'vue'
import { useInspirationSession } from '@/composables/useInspirationSession'
import { apiRegistry } from '@/services/api'

// Props and emits
const props = defineProps<{
  lyrics?: string
  favoriteLyrics?: string
  globalInstruction?: string
  apiName?: string
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

// マークダウンコンテンツへの参照
const markdownContentRef = ref<HTMLElement | null>(null)

// 選択されたAPI名
const selectedApiName = ref(props.apiName || 'default')

// 利用可能なAPI定義のリスト
const availableApis = apiRegistry.getAllApiDefinitions()

// 自動スクロールの制御
const autoScrollEnabled = ref(true)
let autoScrollTimer: number | null = null

// ユーザーがスクロールしたときのハンドラー
const handleUserScroll = () => {
  // 自動スクロールを一時的に無効化
  autoScrollEnabled.value = false
  
  // 既存のタイマーをクリア
  if (autoScrollTimer !== null) {
    clearTimeout(autoScrollTimer)
  }
  
  // 一定時間後に自動スクロールを再度有効化
  autoScrollTimer = window.setTimeout(() => {
    autoScrollEnabled.value = true
  }, 3000) // 3秒後に再度有効化
}

// スクロールを一番下に移動する関数
const scrollToBottom = () => {
  if (markdownContentRef.value && autoScrollEnabled.value) {
    markdownContentRef.value.scrollTo({
      top: markdownContentRef.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

// HTMLが更新されたときにスクロール位置を調整
watch(renderedHtml, () => {
  // 次のティックでDOMが更新された後にスクロール
  setTimeout(scrollToBottom, 0)
})

// 更新時のコールバック
const handleUpdate = () => {
  emit('update')
}

// 初期化時にレンダリングとイベントリスナーの設定
onMounted(() => {
  updateHtml()
  
  // スクロールイベントリスナーを追加
  if (markdownContentRef.value) {
    markdownContentRef.value.addEventListener('scroll', handleUserScroll)
  }
})

// コンポーネントのアンマウント時にイベントリスナーとタイマーをクリーンアップ
onUnmounted(() => {
  if (markdownContentRef.value) {
    markdownContentRef.value.removeEventListener('scroll', handleUserScroll)
  }
  
  if (autoScrollTimer !== null) {
    clearTimeout(autoScrollTimer)
  }
})

/**
 * インスピレーションを更新
 */
const handleUpdateInspiration = async () => {
  // 更新ボタンが押されたら自動スクロールを有効化
  autoScrollEnabled.value = true
  
  await updateInspiration(
    props.lyrics || '', 
    props.favoriteLyrics || '', 
    handleUpdate,
    props.globalInstruction || '',
    selectedApiName.value
  )
}
</script>

<template>
  <div class="inspiration-panel">
    <div 
      ref="markdownContentRef"
      class="markdown-content card custom-scrollbar"
      v-html="renderedHtml"
    ></div>
    
    <div class="button-container">
      <select 
        v-model="selectedApiName" 
        class="api-selector"
        title="API選択"
      >
        <option 
          v-for="api in availableApis" 
          :key="api.name" 
          :value="api.name"
        >
          {{ api.name }}
        </option>
      </select>
      
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

.api-selector {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  margin-right: 1rem;
  font-size: 0.9rem;
  min-width: 120px;
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
