import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseEventHandlerRegistry, createEventHandlerRegistry } from '../stream/eventHandlerRegistry'
import type { StreamingEventData, TextChunkEvent, NodeFinishedEvent, WorkflowFinishedEvent } from '../../../types'

// モックイベントハンドラー
const createMockHandler = (eventType: string) => {
  return {
    canHandle: vi.fn((eventData: StreamingEventData) => eventData.event === eventType),
    handle: vi.fn((eventData, onChunk, state) => {
      if (eventData.event === eventType) {
        onChunk(JSON.stringify({ type: 'test', content: 'テスト' }), false)
        return {
          state: { ...state, processed: true },
          handled: true
        }
      }
      return { state, handled: false }
    }),
    resetSession: vi.fn()
  }
}

describe('EventHandlerRegistry', () => {
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
      const registry = new BaseEventHandlerRegistry()
      expect(registry).toBeInstanceOf(BaseEventHandlerRegistry)
    })

    it('デバッグオプションを有効にしてインスタンス化できること', () => {
      const registry = new BaseEventHandlerRegistry({ debug: true })
      expect(registry).toBeInstanceOf(BaseEventHandlerRegistry)
    })

    it('createEventHandlerRegistry関数でインスタンスを作成できること', () => {
      const registry = createEventHandlerRegistry()
      expect(registry).toBeInstanceOf(BaseEventHandlerRegistry)
    })
  })

  // テスト2: registerHandlerメソッドのテスト
  describe('registerHandler', () => {
    let registry: BaseEventHandlerRegistry

    beforeEach(() => {
      registry = new BaseEventHandlerRegistry()
    })

    it('ハンドラーを登録できること', () => {
      const handler = createMockHandler('text_chunk')
      registry.registerHandler(handler)
      
      // 内部実装に依存しないようにするため、handleEventメソッドで間接的に検証
      const onChunkMock = vi.fn()
      const result = registry.handleEvent(mockTextChunkEvent, onChunkMock, {})
      
      expect(result.handled).toBe(true)
      expect(onChunkMock).toHaveBeenCalled()
      expect(handler.canHandle).toHaveBeenCalledWith(mockTextChunkEvent)
      expect(handler.handle).toHaveBeenCalled()
    })

    it('複数のハンドラーを登録できること', () => {
      const textHandler = createMockHandler('text_chunk')
      const nodeHandler = createMockHandler('node_finished')
      
      registry.registerHandler(textHandler)
      registry.registerHandler(nodeHandler)
      
      // text_chunkイベントの処理
      const onChunkMock1 = vi.fn()
      const result1 = registry.handleEvent(mockTextChunkEvent, onChunkMock1, {})
      
      expect(result1.handled).toBe(true)
      expect(onChunkMock1).toHaveBeenCalled()
      expect(textHandler.canHandle).toHaveBeenCalledWith(mockTextChunkEvent)
      expect(textHandler.handle).toHaveBeenCalled()
      
      // node_finishedイベントの処理
      const onChunkMock2 = vi.fn()
      const result2 = registry.handleEvent(mockNodeFinishedEvent, onChunkMock2, {})
      
      expect(result2.handled).toBe(true)
      expect(onChunkMock2).toHaveBeenCalled()
      expect(nodeHandler.canHandle).toHaveBeenCalledWith(mockNodeFinishedEvent)
      expect(nodeHandler.handle).toHaveBeenCalled()
    })
  })

  // テスト3: handleEventメソッドのテスト
  describe('handleEvent', () => {
    let registry: BaseEventHandlerRegistry
    let onChunkMock: any

    beforeEach(() => {
      registry = new BaseEventHandlerRegistry()
      onChunkMock = vi.fn()
    })

    it('登録されていないイベントタイプは処理されないこと', () => {
      const result = registry.handleEvent(mockWorkflowFinishedEvent, onChunkMock, {})
      
      expect(result.handled).toBe(false)
      expect(onChunkMock).not.toHaveBeenCalled()
    })

    it('登録されたイベントタイプは処理されること', () => {
      const handler = createMockHandler('text_chunk')
      registry.registerHandler(handler)
      
      const result = registry.handleEvent(mockTextChunkEvent, onChunkMock, {})
      
      expect(result.handled).toBe(true)
      expect(onChunkMock).toHaveBeenCalled()
    })

    it('状態が正しく更新されること', () => {
      const handler = createMockHandler('text_chunk')
      registry.registerHandler(handler)
      
      const initialState = { count: 1 }
      const result = registry.handleEvent(mockTextChunkEvent, onChunkMock, initialState)
      
      expect(result.state).toEqual({ count: 1, processed: true })
    })

    it('最初に処理できるハンドラーが処理すること', () => {
      // 最初のハンドラー
      const firstHandler = createMockHandler('text_chunk')
      
      // 2番目のハンドラー（同じイベントタイプを処理）
      const secondHandler = {
        canHandle: vi.fn((eventData: StreamingEventData) => eventData.event === 'text_chunk'),
        handle: vi.fn((eventData, onChunk, state) => {
          if (eventData.event === 'text_chunk') {
            onChunk(JSON.stringify({ type: 'second', content: 'セカンド' }), false)
            return {
              state: { ...state, secondProcessed: true },
              handled: true
            }
          }
          return { state, handled: false }
        }),
        resetSession: vi.fn()
      }
      
      registry.registerHandler(firstHandler)
      registry.registerHandler(secondHandler)
      
      const initialState = {}
      const result = registry.handleEvent(mockTextChunkEvent, onChunkMock, initialState)
      
      expect(result.handled).toBe(true)
      expect(result.state).toEqual({ processed: true })
      expect(onChunkMock).toHaveBeenCalledTimes(1)
      expect(firstHandler.handle).toHaveBeenCalled()
      expect(secondHandler.handle).not.toHaveBeenCalled()
    })
  })

  // テスト4: resetSessionメソッドのテスト
  describe('resetSession', () => {
    it('セッションをリセットすること', () => {
      const registry = new BaseEventHandlerRegistry()
      
      // リセットメソッドを持つモックハンドラー
      const handler = createMockHandler('text_chunk')
      
      registry.registerHandler(handler)
      registry.resetSession()
      
      expect(handler.resetSession).toHaveBeenCalled()
    })
  })
})
