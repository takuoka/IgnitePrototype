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
