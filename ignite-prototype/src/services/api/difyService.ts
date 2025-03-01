import type { DifyAPIRequest, DifyAPIResponse } from '@/types'
import { logError } from '@/utils/errorHandler'

/**
 * Calls the Dify API to get inspiration based on lyrics
 * @param lyrics - The current lyrics to generate inspiration from
 * @returns The inspiration text from the API
 * @throws Error if the API call fails
 */
export const fetchDifyInspiration = async (lyrics: string): Promise<string> => {
  try {
    const apiUrl = `${import.meta.env.VITE_DIFY_API_BASE_URL}/workflows/run`
    const apiKey = import.meta.env.VITE_DIFY_API_KEY
    
    if (!apiUrl || !apiKey) {
      throw new Error('API configuration missing. Check environment variables.')
    }
    
    const requestBody: DifyAPIRequest = {
      inputs: {
        currentLyric: lyrics || '歌詞を入力してください'
      },
      response_mode: 'blocking',
      user: 'user-' + Date.now()
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json() as DifyAPIResponse
    
    if (data.data?.outputs?.result) {
      return data.data.outputs.result
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    logError('DifyAPI', error)
    throw error
  }
}
