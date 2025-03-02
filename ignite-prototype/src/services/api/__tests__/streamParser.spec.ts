import { describe, it, expect, vi } from 'vitest'
import { BaseStreamParser, createStreamParser } from '../stream/streamParser'
import type { StreamingEventData, TextChunkEvent } from '../../../types'

describe('StreamParser', () => {
  // テスト用のモックデータ
  const mockTextChunkEvent: TextChunkEvent = {
    event: 'text_chunk',
    data: {
      text: 'テストテキスト',
      from_variable_selector: []
    }
  }

  // テスト1: インスタンス化のテスト
  describe('インスタンス化', () => {
    it('デフォルトオプションでインスタンス化できること', () => {
      const parser = new BaseStreamParser()
      expect(parser).toBeInstanceOf(BaseStreamParser)
    })

    it('デバッグオプションを有効にしてインスタンス化できること', () => {
      const parser = new BaseStreamParser({ debug: true })
      expect(parser).toBeInstanceOf(BaseStreamParser)
    })

    it('createStreamParser関数でインスタンスを作成できること', () => {
      const parser = createStreamParser()
      expect(parser).toBeInstanceOf(BaseStreamParser)
    })
  })

  // テスト2: parseChunkメソッドのテスト
  describe('parseChunk', () => {
    it('空のチャンクを解析できること', () => {
      const parser = new BaseStreamParser()
      const encoder = new TextEncoder()
      const chunk = encoder.encode('')
      
      const events = parser.parseChunk(chunk)
      expect(events).toEqual([])
    })

    it('単一のイベントを含むチャンクを解析できること', () => {
      const parser = new BaseStreamParser()
      const encoder = new TextEncoder()
      const eventData = `data: ${JSON.stringify(mockTextChunkEvent)}\n\n`
      const chunk = encoder.encode(eventData)
      
      const events = parser.parseChunk(chunk)
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(mockTextChunkEvent)
    })

    it('複数のイベントを含むチャンクを解析できること', () => {
      const parser = new BaseStreamParser()
      const encoder = new TextEncoder()
      const eventData1 = `data: ${JSON.stringify(mockTextChunkEvent)}\n\n`
      const eventData2 = `data: ${JSON.stringify({ ...mockTextChunkEvent, data: { text: '別のテキスト', from_variable_selector: [] } })}\n\n`
      const chunk = encoder.encode(eventData1 + eventData2)
      
      const events = parser.parseChunk(chunk)
      expect(events).toHaveLength(2)
      expect(events[0]).toEqual(mockTextChunkEvent)
      expect(events[1].data?.text).toBe('別のテキスト')
    })

    it('不完全なイベントをバッファに保存すること', () => {
      const parser = new BaseStreamParser()
      const encoder = new TextEncoder()
      const partialEventData = `data: ${JSON.stringify(mockTextChunkEvent)}`  // 終端の \n\n がない
      const chunk = encoder.encode(partialEventData)
      
      const events = parser.parseChunk(chunk)
      expect(events).toHaveLength(0)
      expect(parser.getBuffer()).toBe(partialEventData)
    })

    it('複数のチャンクにまたがるイベントを正しく解析できること', () => {
      const parser = new BaseStreamParser()
      const encoder = new TextEncoder()
      
      // 1つ目のチャンク（不完全なイベント）
      const partialEventData = `data: ${JSON.stringify(mockTextChunkEvent)}`  // 終端の \n\n がない
      const chunk1 = encoder.encode(partialEventData)
      
      // 2つ目のチャンク（残りの部分）
      const remainingPart = `\n\n`
      const chunk2 = encoder.encode(remainingPart)
      
      // 1つ目のチャンクを解析
      const events1 = parser.parseChunk(chunk1)
      expect(events1).toHaveLength(0)
      
      // 2つ目のチャンクを解析
      const events2 = parser.parseChunk(chunk2)
      expect(events2).toHaveLength(1)
      expect(events2[0]).toEqual(mockTextChunkEvent)
    })

    it('無効なJSONを含むイベントをスキップすること', () => {
      const parser = new BaseStreamParser()
      const encoder = new TextEncoder()
      const invalidEventData = `data: {invalid json}\n\n`
      const validEventData = `data: ${JSON.stringify(mockTextChunkEvent)}\n\n`
      const chunk = encoder.encode(invalidEventData + validEventData)
      
      // コンソールエラーをモック
      const originalConsoleError = console.error
      console.error = vi.fn()
      
      const events = parser.parseChunk(chunk)
      
      // 有効なイベントのみが解析されること
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(mockTextChunkEvent)
      
      // エラーがログに記録されること
      expect(console.error).toHaveBeenCalled()
      
      // モックを元に戻す
      console.error = originalConsoleError
    })
  })

  // テスト3: clearBufferメソッドのテスト
  describe('clearBuffer', () => {
    it('バッファをクリアすること', () => {
      const parser = new BaseStreamParser()
      const encoder = new TextEncoder()
      const partialEventData = `data: ${JSON.stringify(mockTextChunkEvent)}`  // 終端の \n\n がない
      const chunk = encoder.encode(partialEventData)
      
      // バッファにデータを追加
      parser.parseChunk(chunk)
      expect(parser.getBuffer()).toBe(partialEventData)
      
      // バッファをクリア
      parser.clearBuffer()
      expect(parser.getBuffer()).toBe('')
    })
  })
})
