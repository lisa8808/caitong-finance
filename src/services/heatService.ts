import { heatStocks, sentimentHistory, similarStocks, subjectBlocks } from '../data/heatData';
import { HeatStock, SentimentData, SimilarStock, SubjectBlock } from '../types/heat';

export interface HeatDataBundle {
  tradeDate?: string;
  source: {
    provider: 'eastmoney' | 'tushare' | 'local';
    label: string;
    isFallback: boolean;
    detail: string;
    updatedAt?: string;
  };
  heatStocks: HeatStock[];
  sentimentHistory: SentimentData[];
  subjectBlocks: SubjectBlock[];
  similarStocks: SimilarStock[];
}

const fallbackHeatData: HeatDataBundle = {
  source: {
    provider: 'local',
    label: '本地样例（兜底）',
    isFallback: true,
    detail: '实时数据源不可用，当前展示项目内置样例数据。',
  },
  heatStocks,
  sentimentHistory,
  subjectBlocks,
  similarStocks,
};

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

export async function loadHeatData(): Promise<HeatDataBundle> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return fallbackHeatData;
  try {
    const response = await fetch(`${apiBaseUrl}/api/heat`);
    if (!response.ok) throw new Error(`heat request failed: ${response.status}`);
    const payload = await response.json() as { data?: HeatDataBundle };
    return payload.data || fallbackHeatData;
  } catch {
    return fallbackHeatData;
  }
}
