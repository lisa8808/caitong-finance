import { accountHoldingStocks, fundFlowData, holdingStocks, minuteChartData, watchDetail, watchlistStocks } from '../data/watchlistData';
import { FundFlowItem, HoldingStock, WatchDetail, WatchStock } from '../types/watchlist';
import { StoredHoldingItem, StoredWatchItem } from './watchlistStorage';

export interface StockSearchItem {
  证券代码: string;
  证券名称: string;
  现价: number;
}

export interface ChartPoint {
  time: string;
  price: number;
  vol: number;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
  pctChange?: number;
  amplitude?: number;
  amount?: number;
}

export interface RelatedBoardItem {
  id: string;
  name: string;
  pctChange?: number;
  count?: number;
}

export interface RelatedBoardGroup {
  category: string;
  items: RelatedBoardItem[];
}

export interface BoardMemberItem {
  code: string;
  name: string;
  boardName: string;
  price: number;
  pctChange: number;
}

interface QuoteItem {
  code: string;
  name: string;
  price: number;
  change: number;
  pctChange: number;
  speed?: number;
  turnoverRate?: number;
  high: number;
  low: number;
}

const fallbackQuoteMap = new Map<string, WatchStock | HoldingStock>([
  ...watchlistStocks.map((stock) => [stock.证券代码, stock] as const),
  ...holdingStocks.map((stock) => [stock.证券代码, stock] as const),
  ...Object.values(accountHoldingStocks).flat().map((stock) => [stock.证券代码, stock] as const),
]);

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

function getFallbackQuote(code: string, name: string): QuoteItem {
  const fallback = fallbackQuoteMap.get(code);
  if (fallback && '涨幅' in fallback) {
    return {
      code,
      name: fallback.证券名称,
      price: fallback.现价,
      change: fallback.涨跌,
      pctChange: fallback.涨幅,
      speed: fallback.涨速,
      turnoverRate: fallback.换手,
      high: fallback.最高,
      low: fallback.最低,
    };
  }
  if (fallback) {
    return {
      code,
      name: fallback.证券名称,
      price: fallback.现价,
      change: fallback.现价 - fallback.成本价,
      pctChange: fallback.今日涨幅,
      speed: 0,
      turnoverRate: 0,
      high: fallback.现价,
      low: fallback.现价,
    };
  }
  return { code, name, price: 0, change: 0, pctChange: 0, speed: 0, turnoverRate: 0, high: 0, low: 0 };
}

async function fetchQuotes(codes: string[]): Promise<QuoteItem[]> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl || codes.length === 0) return [];
  const response = await fetch(`${apiBaseUrl}/api/watchlist/quotes?codes=${encodeURIComponent(codes.join(','))}`);
  if (!response.ok) throw new Error(`quotes request failed: ${response.status}`);
  const payload = await response.json() as { data?: QuoteItem[] };
  return payload.data || [];
}

export async function loadWatchStocks(items: StoredWatchItem[]): Promise<WatchStock[]> {
  let quoteMap = new Map<string, QuoteItem>();
  try {
    const quotes = await fetchQuotes(items.map((item) => item.证券代码));
    quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
  } catch {
    quoteMap = new Map();
  }

  return items.map((item, index) => {
    const quote = quoteMap.get(item.证券代码) || getFallbackQuote(item.证券代码, item.证券名称);
    return {
      序号: index + 1,
      证券代码: item.证券代码,
      证券名称: quote.name || item.证券名称,
      现价: quote.price,
      涨幅: quote.pctChange,
      涨跌: quote.change,
      涨速: quote.speed || 0,
      换手: quote.turnoverRate || 0,
      自选日: item.自选日,
      自选价格: item.自选价格,
      自选收益: item.自选价格 ? ((quote.price - item.自选价格) / item.自选价格) * 100 : 0,
      最高: quote.high,
      最低: quote.low,
    };
  });
}

export async function loadHoldingStocks(items: StoredHoldingItem[]): Promise<HoldingStock[]> {
  let quoteMap = new Map<string, QuoteItem>();
  try {
    const quotes = await fetchQuotes(items.map((item) => item.证券代码));
    quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
  } catch {
    quoteMap = new Map();
  }

  return items.map((item, index) => {
    const quote = quoteMap.get(item.证券代码) || getFallbackQuote(item.证券代码, item.证券名称);
    const marketValue = quote.price * item.持仓数量;
    const costValue = item.成本价 * item.持仓数量;
    const profit = marketValue - costValue;
    return {
      序号: index + 1,
      证券代码: item.证券代码,
      证券名称: quote.name || item.证券名称,
      现价: quote.price,
      持仓数量: item.持仓数量,
      成本价: item.成本价,
      市值: marketValue,
      盈亏: profit,
      盈亏率: costValue ? (profit / costValue) * 100 : 0,
      今日涨幅: quote.pctChange,
    };
  });
}

export async function searchStocks(query: string, currentCodes: string[]): Promise<StockSearchItem[]> {
  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl && query.trim()) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/stocks/search?q=${encodeURIComponent(query.trim())}`);
      if (response.ok) {
        const payload = await response.json() as { data?: StockSearchItem[] };
        return (payload.data || []).filter((item) => !currentCodes.includes(item.证券代码));
      }
    } catch {
      // Fall back to local sample pool below.
    }
  }

  const localPool = watchlistStocks.concat(holdingStocks.map((stock) => ({
    序号: stock.序号,
    证券代码: stock.证券代码,
    证券名称: stock.证券名称,
    现价: stock.现价,
    涨幅: stock.今日涨幅,
    涨跌: 0,
    涨速: 0,
    换手: 0,
    自选日: new Date().toISOString().slice(0, 10),
    自选价格: stock.现价,
    自选收益: 0,
    最高: stock.现价,
    最低: stock.现价,
  })));
  const normalized = query.trim().toLowerCase();
  return localPool
    .filter((stock) => !currentCodes.includes(stock.证券代码))
    .filter((stock) => !normalized || stock.证券代码.includes(normalized) || stock.证券名称.toLowerCase().includes(normalized))
    .map((stock) => ({ 证券代码: stock.证券代码, 证券名称: stock.证券名称, 现价: stock.现价 }));
}

export async function loadStockDetail(code: string): Promise<WatchDetail> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return watchDetail;
  try {
    const response = await fetch(`${apiBaseUrl}/api/stocks/${encodeURIComponent(code)}/detail`);
    if (!response.ok) throw new Error(`detail request failed: ${response.status}`);
    const payload = await response.json() as { data?: WatchDetail };
    return payload.data || watchDetail;
  } catch {
    return watchDetail;
  }
}

export async function loadStockChart(code: string, period = '1min'): Promise<ChartPoint[]> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return minuteChartData;
  try {
    const response = await fetch(`${apiBaseUrl}/api/stocks/${encodeURIComponent(code)}/chart?period=${encodeURIComponent(period)}`);
    if (!response.ok) throw new Error(`chart request failed: ${response.status}`);
    const payload = await response.json() as { data?: ChartPoint[] };
    return payload.data && payload.data.length > 0 ? payload.data : minuteChartData;
  } catch {
    return minuteChartData;
  }
}

export async function loadStockMoneyflow(code: string): Promise<FundFlowItem[]> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return fundFlowData;
  try {
    const response = await fetch(`${apiBaseUrl}/api/stocks/${encodeURIComponent(code)}/moneyflow`);
    if (!response.ok) throw new Error(`moneyflow request failed: ${response.status}`);
    const payload = await response.json() as { data?: FundFlowItem[] };
    return payload.data && payload.data.length > 0 ? payload.data : fundFlowData;
  } catch {
    return fundFlowData;
  }
}

export async function loadRelatedBoards(code: string): Promise<RelatedBoardGroup[]> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return [];
  try {
    const response = await fetch(`${apiBaseUrl}/api/stocks/${encodeURIComponent(code)}/boards`);
    if (!response.ok) throw new Error(`boards request failed: ${response.status}`);
    const payload = await response.json() as { data?: RelatedBoardGroup[] };
    return payload.data || [];
  } catch {
    return [];
  }
}

export async function loadBoardMembers(code: string): Promise<BoardMemberItem[]> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return [];
  try {
    const response = await fetch(`${apiBaseUrl}/api/stocks/${encodeURIComponent(code)}/members`);
    if (!response.ok) throw new Error(`members request failed: ${response.status}`);
    const payload = await response.json() as { data?: BoardMemberItem[] };
    return payload.data || [];
  } catch {
    return [];
  }
}
