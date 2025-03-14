<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { LyricsEditorInterface } from '@/types'

// localStorageから初期値を読み込む
const lyrics = ref(localStorage.getItem('lyrics') || '')
const favoriteLyrics = ref(localStorage.getItem('favoriteLyrics') || '')
const globalInstruction = ref(localStorage.getItem('globalInstruction') || '')
const activeTab = ref('current') // 'current', 'favorite', or 'instruction'

// 歌詞が変更されたらlocalStorageに保存
watch(lyrics, (newValue) => {
  localStorage.setItem('lyrics', newValue)
})

// お気に入り歌詞が変更されたらlocalStorageに保存
watch(favoriteLyrics, (newValue) => {
  localStorage.setItem('favoriteLyrics', newValue)
})

// ユーザー指示が変更されたらlocalStorageに保存
watch(globalInstruction, (newValue) => {
  localStorage.setItem('globalInstruction', newValue)
})

// Expose the interface for parent components
defineExpose<LyricsEditorInterface>({
  lyrics: {
    get: () => lyrics.value
  },
  favoriteLyrics: {
    get: () => favoriteLyrics.value
  },
  globalInstruction: {
    get: () => globalInstruction.value
  }
})
</script>

<template>
  <div class="lyrics-editor">
    <div class="tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'current' }"
        @click="activeTab = 'current'"
      >
        現在の歌詞
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'favorite' }"
        @click="activeTab = 'favorite'"
      >
        好きな歌詞
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'instruction' }"
        @click="activeTab = 'instruction'"
      >
        ユーザー指示
      </button>
    </div>
    
    <div class="tab-content">
      <textarea
        v-if="activeTab === 'current'"
        v-model="lyrics"
        placeholder="ここに歌詞を書いてください..."
        class="editor-textarea card custom-scrollbar"
        spellcheck="false"
      ></textarea>
      
      <textarea
        v-if="activeTab === 'favorite'"
        v-model="favoriteLyrics"
        placeholder="ここに好きな歌詞を書いてください..."
        class="editor-textarea card custom-scrollbar"
        spellcheck="false"
      ></textarea>
      
      <textarea
        v-if="activeTab === 'instruction'"
        v-model="globalInstruction"
        placeholder="ここにAIへの指示を書いてください..."
        class="editor-textarea card custom-scrollbar"
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.lyrics-editor {
  height: 100%;
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  margin-bottom: 1rem;
}

.tab-button {
  padding: 0.5rem 1rem;
  background-color: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: 4px;
  margin-right: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.tab-button.active {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-textarea {
  width: 100%;
  height: 100%;
  padding: 1.5rem;
  font-size: 1.2rem;
  line-height: 1.8;
  color: #ffffff;
  background-color: transparent;
  border: none;
  border-radius: 8px;
  resize: none;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.editor-textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.editor-textarea:focus {
  outline: none;
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
