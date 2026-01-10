import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome Storage API
const mockStorage: Record<string, unknown> = {};

const chromeStorageMock = {
  local: {
    get: vi.fn((keys: string | string[] | null) => {
      return new Promise((resolve) => {
        if (keys === null) {
          resolve(mockStorage);
        } else if (typeof keys === 'string') {
          resolve({ [keys]: mockStorage[keys] });
        } else if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          keys.forEach((key) => {
            if (key in mockStorage) {
              result[key] = mockStorage[key];
            }
          });
          resolve(result);
        }
      });
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      return new Promise<void>((resolve) => {
        Object.assign(mockStorage, items);
        resolve();
      });
    }),
    remove: vi.fn((keys: string | string[]) => {
      return new Promise<void>((resolve) => {
        if (typeof keys === 'string') {
          delete mockStorage[keys];
        } else {
          keys.forEach((key) => delete mockStorage[key]);
        }
        resolve();
      });
    }),
    clear: vi.fn(() => {
      return new Promise<void>((resolve) => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        resolve();
      });
    }),
  },
};

// Assign mock to global chrome object
vi.stubGlobal('chrome', {
  storage: chromeStorageMock,
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
});

// Helper to reset storage between tests
export function resetMockStorage(): void {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  vi.clearAllMocks();
}

// Helper to set mock storage data
export function setMockStorageData(data: Record<string, unknown>): void {
  Object.assign(mockStorage, data);
}
