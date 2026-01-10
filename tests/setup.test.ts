import { describe, it, expect, beforeEach } from 'vitest';
import { resetMockStorage } from './setup';

describe('Test Setup', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('should have chrome.storage.local mock available', () => {
    expect(chrome.storage.local).toBeDefined();
    expect(chrome.storage.local.get).toBeDefined();
    expect(chrome.storage.local.set).toBeDefined();
  });

  it('should be able to set and get from mock storage', async () => {
    await chrome.storage.local.set({ testKey: 'testValue' });
    const result = await chrome.storage.local.get('testKey');
    expect(result.testKey).toBe('testValue');
  });
});
