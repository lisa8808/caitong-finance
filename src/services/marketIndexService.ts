export interface MarketIndexItem {
  code: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  amount: number;
  source: string;
  tradeDate?: string;
}

export interface MarketIndexBundle {
  indices: MarketIndexItem[];
  source: string;
  isFallback: boolean;
  updatedAt: string;
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

export async function loadMarketIndices(): Promise<MarketIndexBundle> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is not configured');
  const response = await fetch(`${apiBaseUrl}/api/market/indices`);
  if (!response.ok) throw new Error(`指数行情请求失败（HTTP ${response.status}）`);
  const payload = await response.json() as { data?: MarketIndexBundle };
  if (!payload.data?.indices?.length) throw new Error('指数行情为空');
  return payload.data;
}
