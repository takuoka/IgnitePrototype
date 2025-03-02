import { describe, it, expect, vi } from 'vitest'
import { TextChunkEventHandler } from '../eventHandlers/textChunkEventHandler'
import type { TextChunkEvent } from '../../../types'
import type { EventHandlerState, EventHandlerResult } from '../eventHandlers/baseEventHandler'

describe('TextChunkEventHandler', () => {
  it('インスタンス化できること', () => {
    const handler = new TextChunkEventHandler()
    expect(handler).toBeDefined()
  })
  
  it('text_chunkイベントを処理できること', () => {
    const handler = new TextChunkEventHandler()
    const onChunkMock = vi.fn()
    
    const event: TextChunkEvent = {
      event: 'text_chunk',
      data: {
        text: 'テストテキスト',
        from_variable_selector: []
      }
    }
    
    const initialState: EventHandlerState = { accumulatedText: '', lastContent: '' }
    const result = handler.handle(event, onChunkMock, initialState)
    
    // JSONオブジェクトとして送信されることを確認
    const expectedChunk = JSON.stringify({
      type: 'legacy',
      content: 'テストテキスト'
    })
    expect(onChunkMock).toHaveBeenCalledWith(expectedChunk, false)
    expect(result.state.accumulatedText).toBe('テストテキスト')
    expect(result.state.lastContent).toBe(expectedChunk)
    expect(result.handled).toBe(true)
  })
  
  it('見出し記号で終わるチャンクの後に、次のチャンクの先頭にスペースを挿入すること', () => {
    const handler = new TextChunkEventHandler()
    const onChunkMock = vi.fn()
    
    // 見出し記号で終わるチャンク
    const event1: TextChunkEvent = {
      event: 'text_chunk',
      data: {
        text: '##',
        from_variable_selector: []
      }
    }
    
    // 次のチャンク
    const event2: TextChunkEvent = {
      event: 'text_chunk',
      data: {
        text: '見出し',
        from_variable_selector: []
      }
    }
    
    // 最初のチャンクを処理
    const initialState: EventHandlerState = { accumulatedText: '', lastContent: '' }
    const firstResult = handler.handle(event1, onChunkMock, initialState)
    
    // 次のチャンクを処理
    const secondResult = handler.handle(event2, onChunkMock, {
      accumulatedText: '##',
      lastContent: firstResult.state.lastContent
    })
    
    // 次のチャンクの先頭にスペースが挿入されていること
    const expectedChunk = JSON.stringify({
      type: 'legacy',
      content: ' 見出し'
    })
    expect(onChunkMock).toHaveBeenCalledWith(expectedChunk, false)
    expect(secondResult.state.lastContent).toBe(expectedChunk)
  })
  
  it('見出し記号で終わらないチャンクの後は、次のチャンクの先頭にスペースを挿入しないこと', () => {
    const handler = new TextChunkEventHandler()
    const onChunkMock = vi.fn()
    
    // 見出し記号で終わらないチャンク
    const event1: TextChunkEvent = {
      event: 'text_chunk',
      data: {
        text: 'テキスト',
        from_variable_selector: []
      }
    }
    
    // 次のチャンク
    const event2: TextChunkEvent = {
      event: 'text_chunk',
      data: {
        text: '続き',
        from_variable_selector: []
      }
    }
    
    // 最初のチャンクを処理
    const initialState: EventHandlerState = { accumulatedText: '', lastContent: '' }
    const firstResult = handler.handle(event1, onChunkMock, initialState)
    
    // 次のチャンクを処理
    const secondResult = handler.handle(event2, onChunkMock, {
      accumulatedText: 'テキスト',
      lastContent: firstResult.state.lastContent
    })
    
    // 次のチャンクの先頭にスペースが挿入されていないこと
    const expectedChunk = JSON.stringify({
      type: 'legacy',
      content: '続き'
    })
    expect(onChunkMock).toHaveBeenCalledWith(expectedChunk, false)
    expect(secondResult.state.lastContent).toBe(expectedChunk)
  })
  
  it('既にスペースで始まるチャンクには、追加のスペースを挿入しないこと', () => {
    const handler = new TextChunkEventHandler()
    const onChunkMock = vi.fn()
    
    // 見出し記号で終わるチャンク
    const event1: TextChunkEvent = {
      event: 'text_chunk',
      data: {
        text: '##',
        from_variable_selector: []
      }
    }
    
    // スペースで始まる次のチャンク
    const event2: TextChunkEvent = {
      event: 'text_chunk',
      data: {
        text: ' 見出し',
        from_variable_selector: []
      }
    }
    
    // 最初のチャンクを処理
    const initialState: EventHandlerState = { accumulatedText: '', lastContent: '' }
    const firstResult = handler.handle(event1, onChunkMock, initialState)
    
    // 次のチャンクを処理
    const secondResult = handler.handle(event2, onChunkMock, {
      accumulatedText: '##',
      lastContent: firstResult.state.lastContent
    })
    
    // 次のチャンクの先頭に追加のスペースが挿入されていないこと
    const expectedChunk = JSON.stringify({
      type: 'legacy',
      content: ' 見出し'
    })
    expect(onChunkMock).toHaveBeenCalledWith(expectedChunk, false)
    expect(secondResult.state.lastContent).toBe(expectedChunk)
  })
})
