export interface QuickInsightStock {
  code: string;
  name: string;
  price: number;
  pctChange: number;
  amount: number;
  mainNetFlow: number;
  industry: string;
}

export interface QuickInsightBoard {
  name: string;
  avgChange: number;
  totalAmount: number;
  mainNetFlow: number;
  stockCount: number;
}

export interface MarketQuickInsights {
  source: string;
  updatedAt: string;
  stockCount: number;
  market: {
    riseCount: number;
    fallCount: number;
    flatCount: number;
    totalAmount: number;
    mainNetFlow: number;
  };
  topBoards: QuickInsightBoard[];
  activeStocks: QuickInsightStock[];
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

export async function loadMarketQuickInsights(): Promise<MarketQuickInsights> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is not configured');
  const response = await fetch(`${apiBaseUrl}/api/market/quick-insights`);
  if (!response.ok) throw new Error(`实时市场洞察请求失败（HTTP ${response.status}）`);
  const payload = await response.json() as { data?: MarketQuickInsights };
  if (!payload.data?.stockCount) throw new Error('实时市场洞察数据为空');
  return payload.data;
}
