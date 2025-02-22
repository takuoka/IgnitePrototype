<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'

const inspirationText = ref('AIのインスピレーションがここに表示されます')

// Dify API関数
const fetchDifyAPI = async (lyrics: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_DIFY_API_BASE_URL}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          currentLyric: lyrics || '歌詞を入力してください'
        },
        response_mode: 'blocking',
        user: 'user-' + Date.now()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (data.data?.outputs?.result) {
      return data.data.outputs.result;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error calling Dify API:', error);
    throw error;
  }
}

const props = defineProps<{
  lyrics?: string
}>()

const emit = defineEmits(['update'])

const updateInspiration = async () => {
  try {
    inspirationText.value = '## 生成中...\n\nAIがインスピレーションを考えています...'
    emit('update')
    const output = await fetchDifyAPI(props.lyrics || '')
    inspirationText.value = output || '## エラー\n\n応答が正しい形式ではありません。'
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
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.markdown-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.markdown-content::-webkit-scrollbar {
  width: 8px;
}

.markdown-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.markdown-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.markdown-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.markdown-content :deep(h2) {
  margin-top: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.markdown-content :deep(ul) {
  padding-left: 1.5rem;
  list-style-type: none;
}

.markdown-content :deep(li) {
  margin: 0.8rem 0;
  color: rgba(255, 255, 255, 0.7);
  position: relative;
}

.markdown-content :deep(li)::before {
  content: "•";
  position: absolute;
  left: -1.2rem;
  color: #4a9eff;
}

.update-button {
  margin-top: 1.2rem;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  color: white;
  background: linear-gradient(135deg, #4a9eff 0%, #357abd 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 10px rgba(74, 158, 255, 0.2);
}

.update-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(74, 158, 255, 0.3);
  background: linear-gradient(135deg, #5ba8ff 0%, #4089d6 100%);
}

.update-button:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(74, 158, 255, 0.2);
  background: linear-gradient(135deg, #3d8be6 0%, #2d74b3 100%);
}
</style>
