import React, { useEffect, useState } from 'react';

export default function Options() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // 加载已保存的 API Key
    chrome.storage.local.get(['SILICONFLOW_API_KEY'], (result) => {
      if (result.SILICONFLOW_API_KEY) {
        setApiKey(result.SILICONFLOW_API_KEY);
      }
    });
  }, []);

  const handleSave = async () => {
    try {
      await chrome.storage.local.set({ SILICONFLOW_API_KEY: apiKey });
      setStatus('API Key 已保存');
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      setStatus('保存失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">扩展设置</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SiliconFlow API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="请输入你的 API Key"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        保存
      </button>

      {status && (
        <p className="mt-2 text-sm text-center text-gray-600">{status}</p>
      )}
    </div>
  );
} 