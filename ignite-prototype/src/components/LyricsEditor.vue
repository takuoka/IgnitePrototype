<script setup lang="ts">
import { ref } from 'vue'

const lyrics = ref('')

defineExpose({ lyrics })
</script>

<template>
  <div class="lyrics-editor">
    <textarea
      v-model="lyrics"
      placeholder="ここに歌詞を書いてください..."
      class="editor-textarea"
    ></textarea>
  </div>
</template>

<style scoped>
.lyrics-editor {
  height: 100%;
  padding: 1rem;
}

.editor-textarea {
  width: 100%;
  height: 100%;
  min-height: 500px;
  padding: 1rem;
  font-size: 1.1rem;
  line-height: 1.6;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.editor-textarea:focus {
  outline: none;
  border-color: #4a9eff;
  box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
}
</style>
