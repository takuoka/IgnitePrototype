<script setup lang="ts">
import { ref } from 'vue'
import LyricsEditor from './components/LyricsEditor.vue'
import InspirationPanel from './components/InspirationPanel.vue'

const lyricsEditorRef = ref(null)

const handleUpdateInspiration = () => {
  if (lyricsEditorRef.value) {
    return lyricsEditorRef.value.lyrics
  }
  return ''
}
</script>

<template>
  <div class="app-container">
    <div class="lyrics-container">
      <LyricsEditor ref="lyricsEditorRef" />
    </div>
    <div class="inspiration-container">
      <InspirationPanel @update="handleUpdateInspiration" />
    </div>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

#app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex;
}

.app-container {
  display: flex;
  width: 100%;
  height: 100%;
}

.lyrics-container {
  flex: 7;
  border-right: 1px solid #ddd;
  height: 100%;
  overflow: hidden;
}

.inspiration-container {
  flex: 3;
  height: 100%;
  overflow: hidden;
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
