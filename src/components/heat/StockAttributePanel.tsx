import { TrendingUp } from 'lucide-react';
import { HeatStock, SimilarStock } from '../../types/heat';

interface Props {
  stock: HeatStock;
  similarStock?: SimilarStock | null;
}

export default function StockAttributePanel({ stock, similarStock }: Props) {
  if (!similarStock) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin p-3">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-neutral text-sm font-semibold">{similarStock.名称}</span>
          <span className="text-secondary text-xs font-mono">{similarStock.代码}</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`${similarStock.涨幅 > 0 ? 'text-up' : similarStock.涨幅 < 0 ? 'text-down' : 'text-neutral'} text-base font-mono font-bold`}>{similarStock.现价.toFixed(2)}</span>
          <span className={`${similarStock.涨幅 > 0 ? 'text-up' : similarStock.涨幅 < 0 ? 'text-down' : 'text-neutral'} text-sm font-mono`}>{similarStock.涨幅 >= 0 ? '+' : ''}{similarStock.涨幅}%</span>
        </div>
        <p className="text-secondary text-[10px]">属性解读 · 相似度分析</p>
      </div>

      <div className="mb-3 p-3 rounded bg-primary-chart border border-yellow-500/30">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-price" />
          <span className="text-price text-sm font-semibold">与「{stock.名称}」的相似度</span>
        </div>

        <div className="p-2 rounded bg-primary-bg mb-3">
          <p className="text-secondary text-[10px] mb-1">匹配度</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2.5 rounded-full bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-price"
                style={{ width: `${similarStock.相似度}%` }}
              />
            </div>
            <span className="text-price text-lg font-bold font-mono">{similarStock.相似度}%</span>
          </div>
        </div>

        <div className="p-2 rounded bg-primary-bg mb-3">
          <p className="text-secondary text-[10px] mb-1">题材标签</p>
          <div className="flex gap-1 flex-wrap">
            {similarStock.题材标签.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-700 text-secondary">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="p-2 rounded bg-primary-bg">
          <p className="text-secondary text-[10px] mb-1">行业地位</p>
          <p className="text-neutral text-xs leading-relaxed">{similarStock.行业地位}</p>
        </div>
      </div>
    </div>
  );
}
