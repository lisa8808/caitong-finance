export interface StockSelectionResponse {
  success: boolean;
  content: string;
  selectedStocks?: Array<Record<string, unknown>>;
  parsedRules?: Record<string, unknown>;
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

export async function loadStockSelectionReport(prompt: string): Promise<StockSelectionResponse> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is not configured');

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/stock-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        const error = new Error(payload?.error || `选股请求失败（HTTP ${response.status}）`);
        if (response.status < 500 || attempt === 2) throw error;
        lastError = error;
      } else {
        const payload = await response.json() as { data?: StockSelectionResponse };
        if (!payload.data?.content) throw new Error('选股服务未返回筛选结果');
        return payload.data;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('选股服务连接失败');
      if (attempt === 2) break;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
  }

  throw new Error(`${lastError?.message || '选股服务暂不可用'}，已自动重试，请稍后再试`);
}
