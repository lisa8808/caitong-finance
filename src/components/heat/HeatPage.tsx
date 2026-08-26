import { useEffect, useMemo, useRef, useState } from 'react';
import MarketSentiment from './MarketSentiment';
import LimitUpTable from './LimitUpTable';
import StockAttributePanel from './StockAttributePanel';
import SimilarStockSection from './SimilarStockSection';
import { heatStocks } from '../../data/heatData';
import { HeatStock, SimilarStock } from '../../types/heat';
import { HeatDataBundle, loadHeatData } from '../../services/heatService';

export default function HeatPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [sentimentHeight, setSentimentHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [heatData, setHeatData] = useState<HeatDataBundle>({
    source: {
      provider: 'local',
      label: '本地样例（兜底）',
      isFallback: true,
      detail: '正在连接实时数据源。',
    },
    heatStocks,
    sentimentHistory: [],
    subjectBlocks: [],
    similarStocks: [],
  });
  const [selectedStock, setSelectedStock] = useState<HeatStock>(heatStocks[0]);
  const [selectedSimilar, setSelectedSimilar] = useState<SimilarStock | null>(null);

  useEffect(() => {
    let ignore = false;
    loadHeatData().then((data) => {
      if (ignore) return;
      setHeatData(data);
      setSelectedStock(data.heatStocks[0] || heatStocks[0]);
      setSelectedSimilar(null);
    });
    return () => { ignore = true; };
  }, []);

  const filteredSimilarStocks = useMemo(() => {
    if (!selectedStock) return heatData.similarStocks;
    return heatData.heatStocks
      .filter((stock) => stock.代码 !== selectedStock.代码)
      .map((stock) => {
        const hasSharedSubject = stock.题材.some((subject) => selectedStock.题材.includes(subject));
        const distance = Math.abs(stock.连板数 - selectedStock.连板数) * 12
          + Math.abs(stock.开板次数 - selectedStock.开板次数) * 4
          + Math.abs(stock.涨幅 - selectedStock.涨幅) * 2
          + Math.abs(stock.明涨停概率 - selectedStock.明涨停概率) * 0.2
          + (hasSharedSubject ? 0 : 15);
        const similarity = Math.max(60, Math.min(99, Math.round(99 - distance)));
        return { stock, similarity, hasSharedSubject };
      })
      .sort((a, b) => b.similarity - a.similarity || b.stock.连板数 - a.stock.连板数)
      .slice(0, 8)
      .map(({ stock, similarity, hasSharedSubject }) => ({
        代码: stock.代码,
        名称: stock.名称,
        现价: stock.现价,
        涨幅: stock.涨幅,
        题材标签: stock.题材,
        相似度: similarity,
        行业地位: `${stock.连板数}连板${hasSharedSubject ? '，题材匹配' : '，连板属性相近'}`,
      }));
  }, [selectedStock, heatData]);
  const displayedSimilarStock = selectedSimilar ?? filteredSimilarStocks[0] ?? null;

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = sentimentHeight;
    setIsResizing(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const pageHeight = pageRef.current?.clientHeight || window.innerHeight;
      const maxHeight = Math.max(260, pageHeight - 190);
      setSentimentHeight(Math.min(maxHeight, Math.max(220, startHeight + moveEvent.clientY - startY)));
    };
    const stopResize = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
  };

  return (
    <div ref={pageRef} className={`flex-1 flex flex-col overflow-hidden ${isResizing ? 'select-none' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-nav border-b border-gray-700 text-[10px]">
        <span className="text-secondary">数据来源</span>
        <span className={`rounded px-2 py-0.5 font-medium ${
          heatData.source.provider === 'eastmoney'
            ? 'bg-red-500/15 text-red-400'
            : heatData.source.provider === 'tushare'
              ? 'bg-blue-500/15 text-blue-400'
              : 'bg-yellow-500/15 text-yellow-400'
        }`}>
          {heatData.source.label}
        </span>
        {heatData.tradeDate && <span className="text-secondary">交易日 {heatData.tradeDate}</span>}
        <span className="truncate text-secondary" title={heatData.source.detail}>{heatData.source.detail}</span>
      </div>
      <MarketSentiment data={heatData.sentimentHistory} height={sentimentHeight} />
      <div
        role="separator"
        aria-label="调整热度图表高度"
        aria-orientation="horizontal"
        onPointerDown={startResize}
        className={`group relative h-2 shrink-0 cursor-row-resize border-y transition-colors ${
          isResizing ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700 bg-primary-nav hover:border-blue-500'
        }`}
      >
        <span className="absolute left-1/2 top-1/2 h-0.5 w-12 -translate-x-1/2 -translate-y-1/2 rounded bg-gray-500 group-hover:bg-blue-400" />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <LimitUpTable
            stocks={heatData.heatStocks}
            onSelectStock={(stock) => {
              setSelectedStock(stock);
              setSelectedSimilar(null);
            }}
            selectedCode={selectedStock.代码}
          />
          <div className="flex-[1] overflow-auto scrollbar-thin min-h-0 border-t border-gray-700">
            <SimilarStockSection
              stocks={filteredSimilarStocks}
              onSelect={setSelectedSimilar}
              selectedCode={displayedSimilarStock?.代码}
            />
          </div>
        </div>
        <div className="w-80 border-l border-gray-700 flex flex-col bg-primary-nav overflow-hidden">
          <StockAttributePanel stock={selectedStock} similarStock={displayedSimilarStock} />
        </div>
      </div>
    </div>
  );
}
