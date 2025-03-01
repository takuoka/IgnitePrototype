/**
 * Dify API Service - Main entry point
 * 
 * This module exports the main API function for interacting with Dify API
 */

import { fetchDifyInspirationStream } from '../dify/streamService';
import { CompletionClient, ChatClient, DifyClient } from 'dify-client';

// Export the stream function
export { fetchDifyInspirationStream };

// Export the official Dify client classes for direct use
export { CompletionClient, ChatClient, DifyClient };
