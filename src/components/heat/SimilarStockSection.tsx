import { Star } from 'lucide-react';
import { similarStocks } from '../../data/heatData';
import { SimilarStock } from '../../types/heat';

interface Props {
  onSelect: (stock: SimilarStock) => void;
  selectedCode?: string;
}

export default function SimilarStockSection({ onSelect, selectedCode }: Props) {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-secondary text-xs">基于属性的相似股列表</span>
        <span className="text-secondary text-[10px]">匹配题材属性</span>
      </div>

      <div className="space-y-1.5">
        {similarStocks.map((stock) => (
          <div
            key={stock.代码}
            onClick={() => onSelect(stock)}
            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors border ${
              selectedCode === stock.代码
                ? 'bg-primary-chart border-yellow-500/50'
                : 'bg-primary-chart border-gray-700/50 hover:border-gray-600'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-neutral text-xs font-mono">{stock.代码}</span>
                <span className="text-neutral text-xs">{stock.名称}</span>
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {stock.题材标签.map((tag) => (
                  <span key={tag} className="px-1 py-0 text-[9px] rounded bg-gray-700/50 text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-up text-xs font-mono font-semibold">{stock.现价.toFixed(2)}</span>
              <span className="text-up text-[10px] font-mono">+{stock.涨幅}%</span>
            </div>

            <button
              className="p-1 rounded hover:bg-gray-700 text-secondary hover:text-price transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Star size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}