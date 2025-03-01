<script setup lang="ts">
import { ref, computed } from 'vue'
import LyricsEditor from './components/LyricsEditor.vue'
import InspirationPanel from './components/InspirationPanel.vue'
import type { LyricsEditorInterface } from './types'

const lyricsEditorRef = ref<LyricsEditorInterface | null>(null)

const currentLyrics = computed(() => lyricsEditorRef.value?.lyrics.get() || '')

const handleUpdateInspiration = () => {
  // イベントを受け取るだけ
}
</script>

<template>
  <div class="app-container">
    <div class="lyrics-container">
      <LyricsEditor ref="lyricsEditorRef" />
    </div>
    <div class="inspiration-container">
      <InspirationPanel 
        :lyrics="currentLyrics"
        @update="handleUpdateInspiration"
      />
    </div>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: #1a1a1a;
  color: #ffffff;
}

#app {
  height: 100%;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex;
  background-color: #1a1a1a;
}

.app-container {
  display: flex;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom right, #1a1a1a, #2d2d2d);
}

.lyrics-container {
  flex: 7;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}

.inspiration-container {
  flex: 3;
  height: 100%;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
}

@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }

  .lyrics-container {
    flex: 1;
    border-right: none;
    border-bottom: 1px solid #ddd;
  }

  .inspiration-container {
    flex: 1;
  }
}
</style>
