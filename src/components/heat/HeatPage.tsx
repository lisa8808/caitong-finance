import { useState } from 'react';
import MarketSentiment from './MarketSentiment';
import LimitUpTable from './LimitUpTable';
import StockAttributePanel from './StockAttributePanel';
import SimilarStockSection from './SimilarStockSection';
import { heatStocks } from '../../data/heatData';
import { HeatStock, SimilarStock } from '../../types/heat';

export default function HeatPage() {
  const [selectedStock, setSelectedStock] = useState<HeatStock>(heatStocks[0]);
  const [selectedSimilar, setSelectedSimilar] = useState<SimilarStock | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <MarketSentiment />
      <div className="flex-1 flex overflow-hidden border-t border-gray-700">
        <div className="flex flex-col flex-1 overflow-hidden">
          <LimitUpTable
            onSelectStock={setSelectedStock}
            selectedCode={selectedStock.代码}
          />
          <div className="flex-[1] overflow-auto scrollbar-thin min-h-0 border-t border-gray-700">
            <SimilarStockSection
              onSelect={setSelectedSimilar}
              selectedCode={selectedSimilar?.代码}
            />
          </div>
        </div>
        <div className="w-80 border-l border-gray-700 flex flex-col bg-primary-nav overflow-hidden">
          <StockAttributePanel stock={selectedStock} similarStock={selectedSimilar} />
        </div>
      </div>
    </div>
  );
}