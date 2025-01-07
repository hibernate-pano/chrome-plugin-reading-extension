interface AIFormatResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export async function formatWithAI(content: string): Promise<AIFormatResponse> {
  try {
    const apiKey = import.meta.env.VITE_SILICONFLOW_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key');
    }

    const response = await fetch('https://api.siliconflow.com/v1/format', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        content,
        format: 'markdown',
        options: {
          preserveImages: true,
          preserveLinks: true,
          preserveCode: true,
          preserveTables: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.formatted,
    };
  } catch (error) {
    console.error('AI formatting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
} 