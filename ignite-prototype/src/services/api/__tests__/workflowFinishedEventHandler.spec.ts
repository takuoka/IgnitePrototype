import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowFinishedEventHandler } from '../eventHandlers/workflowFinishedEventHandler'
import type { WorkflowFinishedEvent } from '../../../types'
import { DifyContentFilter } from '../eventHandlers/contentFilter'
import type { EventHandlerState, EventHandlerResult } from '../eventHandlers/baseEventHandler'

describe('WorkflowFinishedEventHandler', () => {
  // テスト用のモックデータ
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

  let handler: WorkflowFinishedEventHandler
  let onChunkMock: any
  let contentFilterMock: any
  let initialState: EventHandlerState

  beforeEach(() => {
    onChunkMock = vi.fn()
    contentFilterMock = {
      shouldIgnoreData: vi.fn().mockReturnValue(false)
    }
    handler = new WorkflowFinishedEventHandler({ debug: true }, contentFilterMock)
    initialState = { accumulatedText: '', lastContent: '' }
  })

  describe('canHandle', () => {
    it('workflow_finishedイベントで出力がある場合はtrueを返すこと', () => {
      const result = handler.canHandle(mockWorkflowFinishedEvent)
      expect(result).toBe(true)
    })

    it('workflow_finishedイベントで出力がない場合はfalseを返すこと', () => {
      const eventWithoutOutputs = {
        ...mockWorkflowFinishedEvent,
        data: {
          ...mockWorkflowFinishedEvent.data,
          outputs: undefined
        }
      }
      const result = handler.canHandle(eventWithoutOutputs)
      expect(result).toBe(false)
    })

    it('workflow_finished以外のイベントの場合はfalseを返すこと', () => {
      const otherEvent = {
        ...mockWorkflowFinishedEvent,
        event: 'other_event'
      }
      const result = handler.canHandle(otherEvent)
      expect(result).toBe(false)
    })
  })

  describe('handle', () => {
    it('通常の出力を処理すること', () => {
      const result = handler.handle(
        mockWorkflowFinishedEvent,
        onChunkMock,
        initialState
      )

      expect(onChunkMock).toHaveBeenCalledWith(
        expect.stringContaining('ワークフロー完了結果'),
        true
      )
      expect(result.state.accumulatedText).toBe('')
      expect(result.state.lastContent).not.toBe('')
      expect(result.handled).toBe(true)
    })

    it('複数の出力フィールドを処理すること', () => {
      const result = handler.handle(
        mockMultiOutputWorkflowFinishedEvent,
        onChunkMock,
        initialState
      )

      expect(onChunkMock).toHaveBeenCalledWith(
        expect.any(String),
        true
      )
      expect(result.state.accumulatedText).toBe('')
      expect(result.state.lastContent).not.toBe('')
      expect(result.handled).toBe(true)
    })

    it('前回と同じ内容のチャンクは送信しないこと', () => {
      // 最初の呼び出し
      const firstResult = handler.handle(
        mockWorkflowFinishedEvent,
        onChunkMock,
        initialState
      )
      
      // 同じ内容で2回目の呼び出し
      onChunkMock.mockClear()
      const secondResult = handler.handle(
        mockWorkflowFinishedEvent,
        onChunkMock,
        {
          accumulatedText: '',
          lastContent: firstResult.state.lastContent
        }
      )
      
      expect(onChunkMock).not.toHaveBeenCalled()
      expect(secondResult.state.lastContent).toBe(firstResult.state.lastContent)
      expect(secondResult.handled).toBe(true)
    })

    it('重複するworkflow_finishedイベントを処理しないこと', () => {
      // 最初の呼び出し
      handler.handle(
        mockWorkflowFinishedEvent,
        onChunkMock,
        initialState
      )
      
      // 同じイベントで2回目の呼び出し
      onChunkMock.mockClear()
      
      // 同じイベントIDを持つ別のインスタンス
      const duplicateEvent = {
        ...mockWorkflowFinishedEvent,
        data: {
          ...mockWorkflowFinishedEvent.data,
          id: mockWorkflowFinishedEvent.data.id // 同じID
        }
      }
      
      const result = handler.handle(
        duplicateEvent,
        onChunkMock,
        initialState
      )
      
      // 2回目は処理されるが、onChunkは呼ばれないことを期待
      expect(onChunkMock).not.toHaveBeenCalled()
      expect(result.handled).toBe(true)
    })
  })
})
