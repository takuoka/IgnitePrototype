import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DifyEventHandler, createEventHandler } from '../difyEventHandler'
import { DifyContentFilter } from '../eventHandlers'
import type { StreamingEventData, TextChunkEvent, NodeFinishedEvent, WorkflowFinishedEvent } from '../../../types'

describe('DifyEventHandler', () => {
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

  // 新しいフィールドを含むワークフローイベント
  const mockMultiOutputWorkflowFinishedEvent: WorkflowFinishedEvent = {
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
        advice: 'アドバイス内容',
        phrases: 'フレーズ内容',
        words: 'キーワード内容'
      },
      created_at: Date.now(),
      finished_at: Date.now()
    }
  }

  // テスト1: インスタンス化のテスト
  describe('インスタンス化', () => {
    it('デフォルトオプションでインスタンス化できること', () => {
      const handler = new DifyEventHandler()
      expect(handler).toBeInstanceOf(DifyEventHandler)
    })

    it('デバッグオプションを有効にしてインスタンス化できること', () => {
      const handler = new DifyEventHandler({ debug: true })
      expect(handler).toBeInstanceOf(DifyEventHandler)
    })

    it('createEventHandler関数でインスタンスを作成できること', () => {
      const handler = createEventHandler()
      expect(handler).toBeInstanceOf(DifyEventHandler)
    })
  })

  // テスト2: DifyContentFilterのテスト
  describe('DifyContentFilter', () => {
    let filter: DifyContentFilter

    beforeEach(() => {
      filter = new DifyContentFilter()
    })

    it('resultキーを含むデータは無視しないこと', () => {
      const result = filter.shouldIgnoreData('result', 'テストデータ')
      expect(result).toBe(false)
    })

    it('textキーを含むデータは無視しないこと', () => {
      const result = filter.shouldIgnoreData('text', 'テストデータ')
      expect(result).toBe(false)
    })

    it('answerキーを含むデータは無視しないこと', () => {
      const result = filter.shouldIgnoreData('answer', 'テストデータ')
      expect(result).toBe(false)
    })

    it('contentキーを含むデータは無視しないこと', () => {
      const result = filter.shouldIgnoreData('content', 'テストデータ')
      expect(result).toBe(false)
    })

    it('adviceキーを含むデータは無視しないこと', () => {
      const result = filter.shouldIgnoreData('advice', 'テストデータ')
      expect(result).toBe(false)
    })

    it('phrasesキーを含むデータは無視しないこと', () => {
      const result = filter.shouldIgnoreData('phrases', 'テストデータ')
      expect(result).toBe(false)
    })

    it('wordsキーを含むデータは無視しないこと', () => {
      const result = filter.shouldIgnoreData('words', 'テストデータ')
      expect(result).toBe(false)
    })

    it('currentLyricを含むキーのデータは無視すること', () => {
      const result = filter.shouldIgnoreData('currentLyric', 'テストデータ')
      expect(result).toBe(true)
    })

    it('sys.を含むキーのデータは無視すること', () => {
      const result = filter.shouldIgnoreData('sys.test', 'テストデータ')
      expect(result).toBe(true)
    })

    it('inputsを含むキーでresultで終わらないデータは無視すること', () => {
      const result = filter.shouldIgnoreData('inputs.test', 'テストデータ')
      expect(result).toBe(true)
    })

    it('inputsを含むキーでresultで終わるデータは無視しないこと', () => {
      const result = filter.shouldIgnoreData('inputs.result', 'テストデータ')
      expect(result).toBe(false)
    })

    it('"stop"という値のデータは無視すること', () => {
      const result = filter.shouldIgnoreData('test', 'stop')
      expect(result).toBe(true)
    })
  })

  // テスト3: handleEventメソッドのテスト
  describe('handleEvent', () => {
    let handler: DifyEventHandler
    let onChunkMock: any

    beforeEach(() => {
      handler = new DifyEventHandler()
      onChunkMock = vi.fn()
    })

    it('text_chunkイベントを処理すること', () => {
      const result = handler.handleEvent(mockTextChunkEvent, onChunkMock, '', '')
      
      const expectedChunk = JSON.stringify({
        type: 'legacy',
        content: 'テストテキスト'
      })
      expect(onChunkMock).toHaveBeenCalledWith(expectedChunk, false)
      expect(result.accumulatedText).toBe('テストテキスト')
      expect(result.lastContent).toBe(expectedChunk)
    })

    it('node_finishedイベント（llmタイプ）を処理すること', () => {
      const result = handler.handleEvent(mockNodeFinishedEvent, onChunkMock, 'これまでのテキスト', '')
      
      expect(onChunkMock).toHaveBeenCalledWith(expect.stringContaining('node_llm'), false)
      expect(result.accumulatedText).toBe('これまでのテキスト')
      expect(result.lastContent).not.toBe('')
    })

    it('workflow_finishedイベントを処理すること', () => {
      const result = handler.handleEvent(mockWorkflowFinishedEvent, onChunkMock, 'これまでのテキスト', '')
      
      expect(onChunkMock).toHaveBeenCalledWith(expect.stringContaining('legacy'), true)
      expect(result.accumulatedText).toBe('')
      expect(result.lastContent).not.toBe('')
    })

    it('複数の出力フィールドを含むworkflow_finishedイベントを処理すること', () => {
      const result = handler.handleEvent(mockMultiOutputWorkflowFinishedEvent, onChunkMock, 'これまでのテキスト', '')
      
      // JSONとして処理されることを期待
      expect(onChunkMock).toHaveBeenCalledWith(expect.stringContaining('workflow_outputs'), true)
      expect(result.accumulatedText).toBe('')
      expect(result.lastContent).not.toBe('')
    })

    it('前回と同じ内容のチャンクは送信しないこと', () => {
      // 最初に正しいJSONフォーマットの文字列を作成
      const expectedChunk = JSON.stringify({
        type: 'legacy',
        content: 'テストテキスト'
      })
      
      // 前回と同じ内容のチャンクを送信
      handler.handleEvent(mockTextChunkEvent, onChunkMock, '', expectedChunk)
      
      expect(onChunkMock).not.toHaveBeenCalled()
    })

    it('空のチャンクは送信しないこと', () => {
      const emptyTextChunkEvent: TextChunkEvent = {
        ...mockTextChunkEvent,
        data: {
          text: '',
          from_variable_selector: []
        }
      }
      
      handler.handleEvent(emptyTextChunkEvent, onChunkMock, '', '')
      
      expect(onChunkMock).not.toHaveBeenCalled()
    })

    it('空白のみのチャンクは送信しないこと', () => {
      const whitespaceTextChunkEvent: TextChunkEvent = {
        ...mockTextChunkEvent,
        data: {
          text: '   ',
          from_variable_selector: []
        }
      }
      
      handler.handleEvent(whitespaceTextChunkEvent, onChunkMock, '', '')
      
      expect(onChunkMock).not.toHaveBeenCalled()
    })

    it('改行のみのチャンクは送信すること', () => {
      const newlineTextChunkEvent: TextChunkEvent = {
        ...mockTextChunkEvent,
        data: {
          text: '\n',
          from_variable_selector: []
        }
      }
      
      handler.handleEvent(newlineTextChunkEvent, onChunkMock, '', '')
      
      const expectedChunk = JSON.stringify({
        type: 'legacy',
        content: '\n'
      })
      expect(onChunkMock).toHaveBeenCalledWith(expectedChunk, false)
    })
  })
})
