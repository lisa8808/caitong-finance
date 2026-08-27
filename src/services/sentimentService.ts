import { hotspotData } from '../data/hotspotData';
import { HotspotItem } from '../types/hotspot';
import { StockItem } from '../types';

export interface SentimentEvidence {
  title: string;
  score: number;
  source: string;
  publishedAt: string;
  industry: string;
  concept: string;
}

function normalizeCode(code: string) {
  return code.replace(/\.(SH|SZ|BJ|HK)$/i, '').replace(/^0+/, '') || '0';
}

function toEvidence(item: HotspotItem): SentimentEvidence {
  return {
    title: item.标题,
    score: item.情感打分,
    source: item.来源,
    publishedAt: item.发布时间,
    industry: item.行业名称,
    concept: item.概念名称,
  };
}

/** Match current abnormal stocks with the sentiment module's deduplicated news rows. */
export function findSentimentEvidence(stock: StockItem, limit = 2): SentimentEvidence[] {
  const code = normalizeCode(stock.证券代码);
  const name = stock.证券名称.trim();
  const matches = hotspotData
    .filter((item) => !item.是否重复)
    .map((item) => {
      const targetCode = item.标的代码 ? normalizeCode(item.标的代码) : '';
      const targetName = item.标的名称 || '';
      const exactCode = Boolean(targetCode && targetCode === code);
      const exactName = Boolean(name && (targetName.includes(name) || item.标题.includes(name)));
      return { item, score: exactCode ? 3 : exactName ? 2 : 0 };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.情感打分 - a.item.情感打分 || b.item.发布时间.localeCompare(a.item.发布时间));

  return matches.slice(0, limit).map(({ item }) => toEvidence(item));
}

export function summarizeSentiment(evidence: SentimentEvidence[]) {
  if (!evidence.length) return undefined;
  const average = evidence.reduce((sum, item) => sum + item.score, 0) / evidence.length;
  return Math.max(-10, Math.min(10, Math.round(average)));
}
