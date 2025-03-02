import { ReadableStream } from 'stream/web'
import fs from 'fs'
import path from 'path'

/**
 * サンプルデータからReadableStreamを作成する関数
 * @param sampleFilePath サンプルデータファイルのパス（省略時はデフォルトのサンプルファイルを使用）
 * @returns ReadableStreamインスタンス
 */
export function createMockStreamFromSample(
  sampleFilePath: string = path.join(__dirname, 'sample_stream_data_short.txt')
): ReadableStream<Uint8Array> {
  // サンプルデータを読み込む
  const sampleData = fs.readFileSync(sampleFilePath, 'utf-8')
  
  // データを行ごとに分割
  const lines = sampleData.split('\n')
  
  // ReadableStreamを作成
  return new ReadableStream({
    async start(controller) {
      // 各行を順番に処理
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue // 空行はスキップ
        
        // 行をUint8Arrayに変換してコントローラーに送信
        const encoder = new TextEncoder()
        
        // イベントの終了を判断する
        // 次の行が空行または次の行が新しいイベントの開始または最後の行の場合、現在の行は完全なイベント
        const isCompleteEvent = 
          i === lines.length - 1 || 
          lines[i + 1].trim() === '' || 
          lines[i + 1].startsWith('data:') || 
          lines[i + 1].startsWith('event:');
        
        // イベントの終了には \n\n を追加
        const lineEnding = isCompleteEvent ? '\n\n' : '\n';
        const chunk = encoder.encode(line + lineEnding);
        controller.enqueue(chunk);
        
        // 実際のストリーミングをシミュレートするために少し待機
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      // ストリームの終了
      controller.close()
    }
  })
}

/**
 * サンプルデータからReadableStreamReaderを作成する関数
 * @param sampleFilePath サンプルデータファイルのパス（省略時はデフォルトのサンプルファイルを使用）
 * @returns ReadableStreamDefaultReaderインスタンス
 */
export function createMockStreamReaderFromSample(
  sampleFilePath?: string
): ReadableStreamDefaultReader<Uint8Array> {
  const stream = createMockStreamFromSample(sampleFilePath)
  return stream.getReader()
}

/**
 * 指定されたデータからReadableStreamを作成する関数
 * @param data ストリームに流すデータ（文字列の配列）
 * @param delayMs 各チャンク間の遅延（ミリ秒）
 * @returns ReadableStreamインスタンス
 */
export function createMockStreamFromData(
  data: string[],
  delayMs: number = 10
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      for (const item of data) {
        const chunk = encoder.encode(item)
        controller.enqueue(chunk)
        
        // 実際のストリーミングをシミュレートするために少し待機
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      }
      
      controller.close()
    }
  })
}

/**
 * 指定されたデータからReadableStreamReaderを作成する関数
 * @param data ストリームに流すデータ（文字列の配列）
 * @param delayMs 各チャンク間の遅延（ミリ秒）
 * @returns ReadableStreamDefaultReaderインスタンス
 */
export function createMockStreamReaderFromData(
  data: string[],
  delayMs: number = 10
): ReadableStreamDefaultReader<Uint8Array> {
  const stream = createMockStreamFromData(data, delayMs)
  return stream.getReader()
}
