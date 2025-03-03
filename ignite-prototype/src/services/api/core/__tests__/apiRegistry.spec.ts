import { describe, it, expect, beforeEach } from 'vitest';
import { ApiRegistry } from '../apiRegistry';
import type { DifyApiDefinition } from '@/types/api';

describe('ApiRegistry', () => {
  let registry: ApiRegistry;
  
  beforeEach(() => {
    registry = new ApiRegistry();
  });
  
  it('should register and retrieve API definitions', () => {
    const testApi: DifyApiDefinition = {
      name: 'test',
      apiKeyEnvName: 'VITE_TEST_API_KEY',
      validInputVariables: ['input1', 'input2'],
      outputVariables: ['output1', 'output2']
    };
    
    registry.registerApi(testApi);
    
    const retrieved = registry.getApiDefinition('test');
    expect(retrieved).toEqual(testApi);
  });
  
  it('should return undefined for non-existent API', () => {
    const retrieved = registry.getApiDefinition('non-existent');
    expect(retrieved).toBeUndefined();
  });
  
  it('should get all registered API definitions', () => {
    const api1: DifyApiDefinition = {
      name: 'api1',
      apiKeyEnvName: 'VITE_API1_KEY',
      validInputVariables: ['input1'],
      outputVariables: ['output1']
    };
    
    const api2: DifyApiDefinition = {
      name: 'api2',
      apiKeyEnvName: 'VITE_API2_KEY',
      validInputVariables: ['input2'],
      outputVariables: ['output2']
    };
    
    registry.registerApi(api1);
    registry.registerApi(api2);
    
    const allApis = registry.getAllApiDefinitions();
    expect(allApis).toHaveLength(2);
    expect(allApis).toContainEqual(api1);
    expect(allApis).toContainEqual(api2);
  });
  
  it('should get default API definition', () => {
    // 'default'という名前のAPIがデフォルトになる
    const defaultApi: DifyApiDefinition = {
      name: 'default',
      apiKeyEnvName: 'VITE_DEFAULT_API_KEY',
      validInputVariables: ['input1'],
      outputVariables: ['output1']
    };
    
    const otherApi: DifyApiDefinition = {
      name: 'other',
      apiKeyEnvName: 'VITE_OTHER_API_KEY',
      validInputVariables: ['input2'],
      outputVariables: ['output2']
    };
    
    registry.registerApi(otherApi);
    registry.registerApi(defaultApi);
    
    const result = registry.getDefaultApiDefinition();
    expect(result).toEqual(defaultApi);
  });
  
  it('should return undefined as default when no APIs are registered', () => {
    const defaultApi = registry.getDefaultApiDefinition();
    expect(defaultApi).toBeUndefined();
  });
});
