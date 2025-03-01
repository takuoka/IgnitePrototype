import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DifyStreamProcessor, createStreamProcessor, type StreamProcessor } from '../difyStreamProcessor'
import * as difyStreamParser from '../difyStreamParser'
import * as difyEventHandler from '../difyEventHandler'
import type { StreamingEventData, TextChunkEvent, NodeFinishedEvent, WorkflowFinishedEvent } from '../../../types'

// モジュールのモック
vi.mock('../difyStreamParser', () => ({
  createStreamParser: vi.fn()
}))

vi.mock('../difyEventHandler', () => ({
  createEventHandler: vi.fn()
}))

describe('DifyStreamProcessor', () => {
  // テスト用のモックデータ
  const mockTextChunkEvent: TextChunkEvent = {
    event: 'text_chunk',
    data: {
      text: 'テストテキスト',
      from_variable_selector: []
    }
  }

  const mockNodeFinishedEvent: NodeFinishedEvent = {
    event: 'node_finished',
    workflow_run_id: 'test-workflow-id',
    task_id: 'test-task-id',
    data: {
      id: 'test-id',
      node_id: 'test-node-id',
      node_type: 'llm',
      title: 'テストノード',
      index: 0,
      predecessor_node_id: null,
      inputs: {},
      process_data: {},
      outputs: {
        text: 'ノード完了テキスト'
      },
      status: 'success',
      error: null,
      elapsed_time: 100,
      execution_metadata: {},
      created_at: Date.now(),
      finished_at: Date.now(),
      files: [],
      parallel_id: null,
      parallel_start_node_id: null,
      parent_parallel_id: null,
      parent_parallel_start_node_id: null,
      iteration_id: null
    }
  }

  // モックオブジェクト
  const mockStreamParser = {
    parseChunk: vi.fn(),
    clearBuffer: vi.fn(),
    getBuffer: vi.fn()
  }
  
  const mockEventHandler = {
    handleEvent: vi.fn()
  }

  // テスト前の準備
  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks()
    
    // モックの設定
    vi.mocked(difyStreamParser.createStreamParser).mockReturnValue(mockStreamParser)
    vi.mocked(difyEventHandler.createEventHandler).mockReturnValue(mockEventHandler)
  })

  // テスト1: インスタンス化のテスト
  describe('インスタンス化', () => {
    it('デフォルトオプションでインスタンス化できること', () => {
      const processor = new DifyStreamProcessor()
      expect(processor).toBeInstanceOf(DifyStreamProcessor)
    })

    it('デバッグオプションを有効にしてインスタンス化できること', () => {
      const processor = new DifyStreamProcessor({ debug: true })
      expect(processor).toBeInstanceOf(DifyStreamProcessor)
    })

    it('カスタムパーサーとハンドラーでインスタンス化できること', () => {
      const processor = new DifyStreamProcessor({}, mockStreamParser, mockEventHandler)
      expect(processor).toBeInstanceOf(DifyStreamProcessor)
    })

    it('createStreamProcessor関数でインスタンスを作成できること', () => {
      const processor = createStreamProcessor()
      expect(processor).toBeInstanceOf(DifyStreamProcessor)
    })
  })

  // テスト2: processStreamメソッドのテスト
  describe('processStream', () => {
    let processor: DifyStreamProcessor
    let onChunkMock: any
    let mockReader: any

    beforeEach(() => {
      processor = new DifyStreamProcessor({}, mockStreamParser, mockEventHandler)
      onChunkMock = vi.fn()
      
      // ReadableStreamDefaultReaderのモック
      mockReader = {
        read: vi.fn()
      }
      
      // イベントハンドラーのモック設定
      mockEventHandler.handleEvent.mockImplementation((eventData, onChunk, accumulatedText, lastContent) => {
        if (eventData.event === 'text_chunk') {
          onChunk((eventData as TextChunkEvent).data.text, false)
          return {
            accumulatedText: accumulatedText + (eventData as TextChunkEvent).data.text,
            lastContent: (eventData as TextChunkEvent).data.text
          }
        } else if (eventData.event === 'node_finished') {
          onChunk((eventData as NodeFinishedEvent).data.outputs.text, true)
          return {
            accumulatedText: '',
            lastContent: (eventData as NodeFinishedEvent).data.outputs.text
          }
        }
        return { accumulatedText, lastContent }
      })
    })

    it('空のストリームを処理すること', async () => {
      // 読み取り完了を示すモック
      mockReader.read.mockResolvedValueOnce({ done: true, value: undefined })
      
      await processor.processStream(mockReader, onChunkMock)
      expect(mockReader.read).toHaveBeenCalledTimes(1)
      expect(onChunkMock).not.toHaveBeenCalled()
    })

    it('テキストチャンクを含むストリームを処理すること', async () => {
      // ストリームパーサーのモック設定
      mockStreamParser.parseChunk.mockReturnValueOnce([mockTextChunkEvent])
      
      // 1回目の読み取りでチャンクを返し、2回目で完了を示す
      mockReader.read
        .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
        .mockResolvedValueOnce({ done: true, value: undefined })
      
      await processor.processStream(mockReader, onChunkMock)
      
      expect(mockReader.read).toHaveBeenCalledTimes(2)
      expect(mockStreamParser.parseChunk).toHaveBeenCalledTimes(1)
      expect(mockEventHandler.handleEvent).toHaveBeenCalledWith(
        mockTextChunkEvent,
        onChunkMock,
        '',
        ''
      )
      expect(onChunkMock).toHaveBeenCalledWith('テストテキスト', false)
    })

    it('複数のイベントを含むストリームを処理すること', async () => {
      // ストリームパーサーのモック設定
      mockStreamParser.parseChunk.mockReturnValueOnce([mockTextChunkEvent, mockNodeFinishedEvent])
      
      // 1回目の読み取りでチャンクを返し、2回目で完了を示す
      mockReader.read
        .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
        .mockResolvedValueOnce({ done: true, value: undefined })
      
      await processor.processStream(mockReader, onChunkMock)
      
      expect(mockReader.read).toHaveBeenCalledTimes(2)
      expect(mockStreamParser.parseChunk).toHaveBeenCalledTimes(1)
      expect(mockEventHandler.handleEvent).toHaveBeenCalledTimes(2)
      expect(onChunkMock).toHaveBeenCalledTimes(2)
    })

    it('ストリーム終了時に累積テキストがあれば送信すること', async () => {
      // ストリームパーサーのモック設定
      mockStreamParser.parseChunk.mockReturnValueOnce([mockTextChunkEvent])
      
      // イベントハンドラーのモック設定を上書き
      mockEventHandler.handleEvent.mockReturnValueOnce({
        accumulatedText: 'テスト累積テキスト',
        lastContent: 'テストテキスト'
      })
      
      // 1回目の読み取りでチャンクを返し、2回目で完了を示す
      mockReader.read
        .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
        .mockResolvedValueOnce({ done: true, value: undefined })
      
      await processor.processStream(mockReader, onChunkMock)
      
      // 最後に累積テキストが送信されること
      expect(onChunkMock).toHaveBeenLastCalledWith('テスト累積テキスト', true)
    })

    it('ストリーム処理中にエラーが発生した場合、エラーをスローすること', async () => {
      // エラーをスローするモック
      mockReader.read.mockRejectedValueOnce(new Error('ストリーム読み取りエラー'))
      
      await expect(processor.processStream(mockReader, onChunkMock)).rejects.toThrow('ストリーム読み取りエラー')
    })
  })
})
