import { StockItem } from '../types';

export interface AbnormalMovementStock extends StockItem {
  所属板块?: string;
  成交额?: number;
  主力净流入?: number;
  是否持仓?: boolean;
  直接诱因?: string;
  诱因分类?: string;
  信息来源?: string;
}

export interface AbnormalMovementData {
  tradeDate?: string;
  source: string;
  isRealData: boolean;
  scope?: 'global_market' | 'watchlist' | 'stock';
  stocks: AbnormalMovementStock[];
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

function fallbackData(stocks: StockItem[]): AbnormalMovementData {
  return {
    source: '页面当前行情数据',
    isRealData: false,
    scope: 'global_market',
    stocks: [...stocks]
      .sort((a, b) => Math.abs(b.涨幅) - Math.abs(a.涨幅))
      .slice(0, 5)
      .map((stock) => ({ ...stock, 是否持仓: true })),
  };
}

function normalizeStock(item: Partial<AbnormalMovementStock>, index: number): AbnormalMovementStock {
  return {
    序号: Number(item.序号 || index + 1),
    证券代码: String(item.证券代码 || ''),
    证券名称: String(item.证券名称 || item.证券代码 || ''),
    现价: Number(item.现价 || 0),
    涨幅: Number(item.涨幅 || 0),
    涨跌: Number(item.涨跌 || 0),
    涨速: Number(item.涨速 || 0),
    换手: Number(item.换手 || 0),
    最高: Number(item.最高 || item.现价 || 0),
    最低: Number(item.最低 || item.现价 || 0),
    今开: Number(item.今开 || item.现价 || 0),
    昨收: Number(item.昨收 || item.现价 || 0),
    量比: Number(item.量比 || 0),
    所属板块: item.所属板块,
    成交额: item.成交额 === undefined ? undefined : Number(item.成交额),
    主力净流入: item.主力净流入 === undefined ? undefined : Number(item.主力净流入),
    是否持仓: item.是否持仓 === true,
    直接诱因: item.直接诱因,
    诱因分类: item.诱因分类,
    信息来源: item.信息来源,
  };
}

export async function loadAbnormalMovementData(stocks: StockItem[]): Promise<AbnormalMovementData> {
  const apiBaseUrl = getApiBaseUrl();
  const fallback = fallbackData(stocks);
  if (!apiBaseUrl) return fallback;

  const holdingCodes = stocks.map((stock) => stock.证券代码).filter(Boolean).join(',');
  const query = holdingCodes ? `?focusCodes=${encodeURIComponent(holdingCodes)}` : '';

  try {
    const response = await fetch(`${apiBaseUrl}/api/abnormal-movement${query}`);
    if (!response.ok) throw new Error(`abnormal movement request failed: ${response.status}`);
    const payload = await response.json() as { data?: Partial<AbnormalMovementData> };
    const data = payload.data;
    if (!data?.stocks?.length) return fallback;
    return {
      tradeDate: data.tradeDate,
      source: data.source || 'Tushare行情接口',
      isRealData: data.isRealData !== false,
      scope: data.scope || 'global_market',
      stocks: data.stocks.map(normalizeStock),
    };
  } catch {
    return fallback;
  }
}
