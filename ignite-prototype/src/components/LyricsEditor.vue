<script setup lang="ts">
import { ref } from 'vue'
import type { LyricsEditorInterface } from '@/types'

const lyrics = ref('')

// Expose the interface for parent components
defineExpose<LyricsEditorInterface>({
  lyrics: {
    get: () => lyrics.value
  }
})
</script>

<template>
  <div class="lyrics-editor">
    <textarea
      v-model="lyrics"
      placeholder="ここに歌詞を書いてください..."
      class="editor-textarea card custom-scrollbar"
      spellcheck="false"
    ></textarea>
  </div>
</template>

<style scoped>
.lyrics-editor {
  height: 100%;
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.03);
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
