<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'

const inspirationText = ref('AIのインスピレーションがここに表示されます')

// モックAPI関数
const fetchDefyMock = async (currentLyrics: string) => {
  // 実際のAPIに置き換え可能なモック
  return {
    markdownText: `## AIインスピレーション

- ${currentLyrics ? '入力された歌詞をベースにしたアイデア' : 'まずは歌詞を入力してみましょう'}
- 心に響く言葉を見つけましょう
- 新しい表現を探してみましょう
- 自由に創造性を広げてください`
  }
}

const emit = defineEmits(['update'])

const updateInspiration = async () => {
  const lyrics = emit('update')
  try {
    const response = await fetchDefyMock(lyrics)
    inspirationText.value = response.markdownText
  } catch (error) {
    console.error('Error fetching inspiration:', error)
    inspirationText.value = '## エラー\n\nインスピレーションの取得に失敗しました。'
  }
}

// Markdownをレンダリングする計算プロパティ
const renderedMarkdown = computed(() => {
  return marked(inspirationText.value)
})
</script>

<template>
  <div class="inspiration-panel">
    <div 
      class="markdown-content"
      v-html="renderedMarkdown"
    ></div>
    <button 
      class="update-button"
      @click="updateInspiration"
    >
      更新
    </button>
  </div>
</template>

<style scoped>
.inspiration-panel {
  height: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.markdown-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.markdown-content :deep(h2) {
  margin-top: 0;
  color: #2c3e50;
}

.markdown-content :deep(ul) {
  padding-left: 1.5rem;
}

.markdown-content :deep(li) {
  margin: 0.5rem 0;
  color: #34495e;
}

.update-button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  color: white;
  background-color: #4a9eff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.update-button:hover {
  background-color: #357abd;
}

.update-button:active {
  background-color: #2868a9;
}
</style>
