/**
 * Utility functions for error handling
 */

/**
 * Formats an error message for display
 * @param error - The error object
 * @returns A formatted error message
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return `エラー: ${error.message}`
  }
  
  if (typeof error === 'string') {
    return `エラー: ${error}`
  }
  
  return 'エラー: 不明なエラーが発生しました'
}

/**
 * Logs an error to the console with additional context
 * @param context - The context where the error occurred
 * @param error - The error object
 */
export const logError = (context: string, error: unknown): void => {
  console.error(`[${context}] Error:`, error)
  
  if (error instanceof Error && error.stack) {
    console.debug(`[${context}] Stack trace:`, error.stack)
  }
}

/**
 * JSONパースエラーの詳細情報を取得する
 * @param error - エラーオブジェクト
 * @param jsonStr - パースに失敗したJSON文字列
 * @returns エラーの詳細情報
 */
export const getJsonParseErrorDetails = (error: unknown, jsonStr: string): string => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  let details = `JSONパースエラー: ${errorMessage}\n`;
  
  // 位置情報を抽出（例: "position 7990"）
  const positionMatch = errorMessage.match(/position (\d+)/);
  if (positionMatch && jsonStr) {
    const position = parseInt(positionMatch[1], 10);
    const contextStart = Math.max(0, position - 30);
    const contextEnd = Math.min(jsonStr.length, position + 30);
    
    // 問題のある部分を抽出
    const beforeContext = jsonStr.substring(contextStart, position);
    const afterContext = jsonStr.substring(position, contextEnd);
    
    details += `\n位置: ${position}`;
    details += `\n問題の箇所: "${beforeContext}👉${afterContext}"`;
    
    // Unicodeエスケープシーケンスを検出
    const unicodeEscapePattern = /\\u[0-9A-Fa-f]{0,4}/g;
    const nearbyText = jsonStr.substring(Math.max(0, position - 15), Math.min(jsonStr.length, position + 15));
    const matches = [...nearbyText.matchAll(unicodeEscapePattern)];
    
    if (matches.length > 0) {
      details += `\n\n検出されたUnicodeエスケープシーケンス:`;
      matches.forEach(match => {
        const matchPosition = match.index !== undefined ? 
          position - 15 + match.index : '不明';
        details += `\n- "${match[0]}" (位置: ${matchPosition})`;
      });
      
      // 修正のヒント
      details += `\n\n考えられる問題:`;
      details += `\n- 不完全なUnicodeエスケープシーケンス (\\uの後に4桁の16進数が必要)`;
      details += `\n- 無効な文字コード`;
      details += `\n- エスケープされていない特殊文字`;
    }
  }
  
  return details;
}

/**
 * Creates a standard error response for API errors
 * @param error - The error object
 * @returns A markdown formatted error message
 */
export const createApiErrorMessage = (error: unknown): string => {
  const baseMessage = '## エラー\n\n'
  
  if (error instanceof Error) {
    if (error.message.includes('API error')) {
      return `${baseMessage}API呼び出しに失敗しました。サーバーエラーが発生しました。\n\n詳細: ${error.message}`
    }
    
    if (error.message.includes('Invalid response format')) {
      return `${baseMessage}APIからの応答が正しい形式ではありません。`
    }
    
    if (error.message.includes('API configuration missing')) {
      return `${baseMessage}API設定が不足しています。環境変数を確認してください。`
    }
    
    return `${baseMessage}インスピレーションの取得に失敗しました。\n\n詳細: ${error.message}`
  }
  
  return `${baseMessage}インスピレーションの取得に失敗しました。`
}
