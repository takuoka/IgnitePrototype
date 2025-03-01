import { describe, it, expect, vi } from 'vitest'
import { TextChunkEventHandler } from '../eventHandlers/textChunkEventHandler'
import type { TextChunkEvent } from '../../../types'

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
    
    const result = handler.handle(event, onChunkMock, '', '')
    
    expect(onChunkMock).toHaveBeenCalledWith('テストテキスト', false)
    expect(result.accumulatedText).toBe('テストテキスト')
    expect(result.lastContent).toBe('テストテキスト')
    expect(result.handled).toBe(true)
  })
  
  it('見出し記号で終わるチャンクの後に、次のチャンクの先頭にスペースを挿入すること', () => {
    const handler = new TextChunkEventHandler({ debug: true })
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
    handler.handle(event1, onChunkMock, '', '')
    
    // 次のチャンクを処理
    const result = handler.handle(event2, onChunkMock, '##', '##')
    
    // 次のチャンクの先頭にスペースが挿入されていること
    expect(onChunkMock).toHaveBeenCalledWith(' 見出し', false)
    expect(result.lastContent).toBe(' 見出し')
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
    handler.handle(event1, onChunkMock, '', '')
    
    // 次のチャンクを処理
    const result = handler.handle(event2, onChunkMock, 'テキスト', 'テキスト')
    
    // 次のチャンクの先頭にスペースが挿入されていないこと
    expect(onChunkMock).toHaveBeenCalledWith('続き', false)
    expect(result.lastContent).toBe('続き')
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
    handler.handle(event1, onChunkMock, '', '')
    
    // 次のチャンクを処理
    const result = handler.handle(event2, onChunkMock, '##', '##')
    
    // 次のチャンクの先頭に追加のスペースが挿入されていないこと
    expect(onChunkMock).toHaveBeenCalledWith(' 見出し', false)
    expect(result.lastContent).toBe(' 見出し')
  })
})
