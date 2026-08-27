import { useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Star } from 'lucide-react';
import { SimilarStock } from '../../types/heat';

interface Props {
  stocks: SimilarStock[];
  onSelect: (stock: SimilarStock) => void;
  selectedCode?: string;
}

export default function SimilarStockSection({ stocks, onSelect, selectedCode }: Props) {
  const [tipPosition, setTipPosition] = useState<{ top: number; left: number; above: boolean } | null>(null);

  const showTip = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const above = rect.bottom + 210 > window.innerHeight;
    setTipPosition({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(window.innerWidth - 152, Math.max(152, rect.left + rect.width / 2)),
      above,
    });
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-secondary text-xs">基于属性的相似股列表</span>
          <button
            type="button"
            aria-label="相似股匹配逻辑说明"
            className="inline-flex rounded text-secondary/60 outline-none hover:text-blue-400 focus-visible:ring-1 focus-visible:ring-blue-400"
            onMouseEnter={(event) => showTip(event.currentTarget)}
            onMouseLeave={() => setTipPosition(null)}
            onFocus={(event) => showTip(event.currentTarget)}
            onBlur={() => setTipPosition(null)}
          >
            <HelpCircle size={12} className="cursor-help" />
          </button>
        </div>
        <span className="text-secondary text-[10px]">匹配连板属性</span>
      </div>

      <div className="space-y-1.5">
        {stocks.map((stock) => (
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
              <span className={`${stock.涨幅 > 0 ? 'text-up' : stock.涨幅 < 0 ? 'text-down' : 'text-neutral'} text-xs font-mono font-semibold`}>{stock.现价.toFixed(2)}</span>
              <span className={`${stock.涨幅 > 0 ? 'text-up' : stock.涨幅 < 0 ? 'text-down' : 'text-neutral'} text-[10px] font-mono`}>{stock.涨幅 >= 0 ? '+' : ''}{stock.涨幅}%</span>
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
      {tipPosition && createPortal(
        <div
          role="tooltip"
          className={`pointer-events-none fixed z-[9999] w-72 -translate-x-1/2 rounded border border-blue-500/60 bg-[#161a24] p-3 text-left text-[11px] font-normal leading-relaxed text-secondary shadow-2xl ${tipPosition.above ? '-translate-y-full' : ''}`}
          style={{ top: tipPosition.top, left: tipPosition.left }}
        >
          <span className="mb-1 block font-semibold text-white">相似股匹配逻辑</span>
          <span className="block">1. 以当前选中的连板股作为比较基准。</span>
          <span className="block">2. 综合连板高度、开板次数、涨幅和明涨停概率排序，相同题材优先。</span>
          <span className="block">3. 排除当前股票，默认展示属性最接近的 8 只。</span>
          <span className="mt-1 block text-neutral">原始行情和题材来自页面顶部标注的数据源。</span>
          <span className="mt-1 block text-yellow-400">相似度是本地规则生成的连板属性排序分，不是东方财富或 Tushare 官方指标，也不构成投资建议。</span>
        </div>,
        document.body,
      )}
    </div>
  );
}
