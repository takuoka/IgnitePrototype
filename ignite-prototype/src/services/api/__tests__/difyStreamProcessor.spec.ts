import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DifyStreamProcessor, createStreamProcessor, type StreamProcessor } from '../difyStreamProcessor'
import type { StreamingEventData, TextChunkEvent, NodeFinishedEvent, WorkflowFinishedEvent } from '../../../types'

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

  const mockWorkflowFinishedEvent: WorkflowFinishedEvent = {
    event: 'workflow_finished',
    workflow_run_id: 'test-workflow-id',
    task_id: 'test-task-id',
    data: {
      id: 'test-id',
      workflow_id: 'test-workflow-id',
      status: 'success',
      error: null,
      elapsed_time: 200,
      outputs: {
        result: 'ワークフロー完了結果'
      },
      created_at: Date.now(),
      finished_at: Date.now()
    }
  }

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

    it('createStreamProcessor関数でインスタンスを作成できること', () => {
      const processor = createStreamProcessor()
      expect(processor).toBeInstanceOf(DifyStreamProcessor)
    })
  })

  // テスト2: shouldIgnoreDataメソッドのテスト
  describe('shouldIgnoreData', () => {
    let processor: DifyStreamProcessor

    beforeEach(() => {
      processor = new DifyStreamProcessor()
    })

    it('resultキーを含むデータは無視しないこと', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('result', 'テストデータ')
      expect(result).toBe(false)
    })

    it('textキーを含むデータは無視しないこと', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('text', 'テストデータ')
      expect(result).toBe(false)
    })

    it('answerキーを含むデータは無視しないこと', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('answer', 'テストデータ')
      expect(result).toBe(false)
    })

    it('contentキーを含むデータは無視しないこと', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('content', 'テストデータ')
      expect(result).toBe(false)
    })

    it('currentLyricを含むキーのデータは無視すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('currentLyric', 'テストデータ')
      expect(result).toBe(true)
    })

    it('sys.を含むキーのデータは無視すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('sys.test', 'テストデータ')
      expect(result).toBe(true)
    })

    it('inputsを含むキーでresultで終わらないデータは無視すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('inputs.test', 'テストデータ')
      expect(result).toBe(true)
    })

    it('inputsを含むキーでresultで終わるデータは無視しないこと', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('inputs.result', 'テストデータ')
      expect(result).toBe(false)
    })

    it('"stop"という値のデータは無視すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      const result = processor.shouldIgnoreData('test', 'stop')
      expect(result).toBe(true)
    })
  })

  // テスト3: sendChunkメソッドのテスト
  describe('sendChunk', () => {
    let processor: DifyStreamProcessor
    let onChunkMock: any

    beforeEach(() => {
      processor = new DifyStreamProcessor()
      onChunkMock = vi.fn()
    })

    it('有効なチャンクを送信すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      processor.sendChunk('新しいチャンク', false, onChunkMock, '')
      expect(onChunkMock).toHaveBeenCalledWith('新しいチャンク', false)
    })

    it('最終チャンクを送信すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      processor.sendChunk('最終チャンク', true, onChunkMock, '')
      expect(onChunkMock).toHaveBeenCalledWith('最終チャンク', true)
    })

    it('前回と同じ内容のチャンクは送信しないこと', () => {
      // @ts-ignore - privateメソッドへのアクセス
      processor.sendChunk('重複チャンク', false, onChunkMock, '重複チャンク')
      expect(onChunkMock).not.toHaveBeenCalled()
    })

    it('空のチャンクは送信しないこと', () => {
      // @ts-ignore - privateメソッドへのアクセス
      processor.sendChunk('', false, onChunkMock, '')
      expect(onChunkMock).not.toHaveBeenCalled()
    })

    it('空白のみのチャンクは送信しないこと', () => {
      // @ts-ignore - privateメソッドへのアクセス
      processor.sendChunk('   ', false, onChunkMock, '')
      expect(onChunkMock).not.toHaveBeenCalled()
    })
  })

  // テスト4: processEventDataメソッドのテスト
  describe('processEventData', () => {
    let processor: DifyStreamProcessor
    let onChunkMock: any

    beforeEach(() => {
      processor = new DifyStreamProcessor()
      onChunkMock = vi.fn()
    })

    it('text_chunkイベントを処理すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      processor.processEventData(mockTextChunkEvent, onChunkMock, '', '')
      expect(onChunkMock).toHaveBeenCalledWith('テストテキスト', false)
    })

    it('node_finishedイベント（llmタイプ）を処理すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      processor.processEventData(mockNodeFinishedEvent, onChunkMock, '', '')
      expect(onChunkMock).toHaveBeenCalledWith('ノード完了テキスト', true)
    })

    it('workflow_finishedイベントを処理すること', () => {
      // @ts-ignore - privateメソッドへのアクセス
      processor.processEventData(mockWorkflowFinishedEvent, onChunkMock, '', '')
      expect(onChunkMock).toHaveBeenCalledWith('ワークフロー完了結果', true)
    })
  })

  // テスト5: processStreamメソッドのテスト
  describe('processStream', () => {
    let processor: DifyStreamProcessor
    let onChunkMock: any
    let mockReader: any

    beforeEach(() => {
      processor = new DifyStreamProcessor()
      onChunkMock = vi.fn()
      
      // ReadableStreamDefaultReaderのモック
      mockReader = {
        read: vi.fn()
      }
    })

    it('空のストリームを処理すること', async () => {
      // 読み取り完了を示すモック
      mockReader.read.mockResolvedValueOnce({ done: true, value: undefined })
      
      await processor.processStream(mockReader, onChunkMock)
      expect(mockReader.read).toHaveBeenCalledTimes(1)
      expect(onChunkMock).not.toHaveBeenCalled()
    })

    it('テキストチャンクを含むストリームを処理すること', async () => {
      // テキストチャンクイベントのエンコード
      const encoder = new TextEncoder()
      const eventData = `data: ${JSON.stringify(mockTextChunkEvent)}\n\n`
      const chunk = encoder.encode(eventData)
      
      // 1回目の読み取りでチャンクを返し、2回目で完了を示す
      mockReader.read
        .mockResolvedValueOnce({ done: false, value: chunk })
        .mockResolvedValueOnce({ done: true, value: undefined })
      
      await processor.processStream(mockReader, onChunkMock)
      expect(mockReader.read).toHaveBeenCalledTimes(2)
      expect(onChunkMock).toHaveBeenCalledWith('テストテキスト', false)
    })

    it('複数のイベントを含むストリームを処理すること', async () => {
      // 複数のイベントをエンコード
      const encoder = new TextEncoder()
      const eventData1 = `data: ${JSON.stringify(mockTextChunkEvent)}\n\n`
      const eventData2 = `data: ${JSON.stringify(mockNodeFinishedEvent)}\n\n`
      const chunk = encoder.encode(eventData1 + eventData2)
      
      // 1回目の読み取りでチャンクを返し、2回目で完了を示す
      mockReader.read
        .mockResolvedValueOnce({ done: false, value: chunk })
        .mockResolvedValueOnce({ done: true, value: undefined })
      
      await processor.processStream(mockReader, onChunkMock)
      expect(mockReader.read).toHaveBeenCalledTimes(2)
      expect(onChunkMock).toHaveBeenCalledTimes(2)
      expect(onChunkMock).toHaveBeenNthCalledWith(1, 'テストテキスト', false)
      expect(onChunkMock).toHaveBeenNthCalledWith(2, 'ノード完了テキスト', true)
    })

    it('ストリーム処理中にエラーが発生した場合、エラーをスローすること', async () => {
      // エラーをスローするモック
      mockReader.read.mockRejectedValueOnce(new Error('ストリーム読み取りエラー'))
      
      await expect(processor.processStream(mockReader, onChunkMock)).rejects.toThrow('ストリーム読み取りエラー')
    })
  })
})
