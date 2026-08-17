import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import { HeatStock } from '../../types/heat';

interface Props {
  stocks: HeatStock[];
  onSelectStock: (stock: HeatStock) => void;
  selectedCode?: string;
}

export default function LimitUpTable({ stocks, onSelectStock, selectedCode }: Props) {
  const [filter, setFilter] = useState<'all' | '2' | '1' | '炸板'>('all');
  const [probabilitySort, setProbabilitySort] = useState<'desc' | 'asc' | null>(null);
  const [tipPosition, setTipPosition] = useState<{ top: number; left: number } | null>(null);

  const filteredStocks = useMemo(() => {
    const rows = stocks.filter((s) => {
      if (filter === '2') return s.连板数 >= 2;
      if (filter === '1') return s.连板数 === 1;
      if (filter === '炸板') return s.开板次数 > 3;
      return true;
    });
    if (!probabilitySort) return rows;
    const direction = probabilitySort === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => (
      (a.明涨停概率 - b.明涨停概率) * direction || a.代码.localeCompare(b.代码)
    ));
  }, [filter, probabilitySort, stocks]);

  const toggleProbabilitySort = () => {
    setProbabilitySort((current) => current === 'desc' ? 'asc' : 'desc');
  };

  return (
    <>
      <div className="flex-[3] flex flex-col overflow-hidden min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 bg-primary-nav border-b border-gray-700">
        {[
          { label: '全部', key: 'all' },
          { label: '2连板', key: '2' },
          { label: '首板', key: '1' },
          { label: '炸板', key: '炸板' },
        ].map(({ label, key }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              filter === key ? 'bg-gray-600 text-white' : 'text-secondary hover:text-white hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin bg-primary-bg">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-primary-nav">
            <tr className="text-secondary">
              <th className="py-2 px-2 text-left font-normal">代码</th>
              <th className="py-2 px-2 text-left font-normal">名称</th>
              <th className="py-2 px-2 text-left font-normal">现价</th>
              <th className="py-2 px-2 text-left font-normal">涨幅%</th>
              <th className="py-2 px-2 text-left font-normal">首次涨停</th>
              <th className="py-2 px-2 text-left font-normal">开板次数</th>
              <th
                className="p-0 text-left font-normal"
                aria-sort={probabilitySort === 'desc' ? 'descending' : probabilitySort === 'asc' ? 'ascending' : 'none'}
              >
                <button
                  type="button"
                  onClick={toggleProbabilitySort}
                  className="flex w-full items-center gap-1 px-2 py-2 text-left hover:bg-gray-700/60 hover:text-white"
                  title="点击按明涨停概率排序"
                >
                  <span>明涨停概率%</span>
                  <span
                    className="relative"
                    onClick={(event) => event.stopPropagation()}
                    onMouseEnter={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const halfWidth = 144;
                      setTipPosition({
                        top: rect.bottom + 8,
                        left: Math.min(window.innerWidth - halfWidth - 8, Math.max(halfWidth + 8, rect.left + rect.width / 2)),
                      });
                    }}
                    onMouseLeave={() => setTipPosition(null)}
                  >
                    <HelpCircle size={12} className="cursor-help text-secondary/70 hover:text-blue-400" />
                  </span>
                  <span className={probabilitySort ? 'text-blue-400' : 'text-secondary/60'}>
                    {probabilitySort === 'desc' ? '↓' : probabilitySort === 'asc' ? '↑' : '↕'}
                  </span>
                </button>
              </th>
              <th className="py-2 px-2 text-left font-normal">题材标签</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock, idx) => (
              <tr
                key={stock.代码}
                onClick={() => onSelectStock(stock)}
                className={`border-b border-gray-800 cursor-pointer transition-colors ${
                  idx % 2 === 0 ? 'bg-primary-bg' : 'bg-primary-chart'
                } hover:bg-gray-700/50 ${
                  selectedCode === stock.代码 ? 'bg-primary-chart border-l-2 border-l-yellow-500' : ''
                }`}
              >
                <td className="py-1.5 px-2 text-neutral font-mono">{stock.代码}</td>
                <td className="py-1.5 px-2 text-neutral">{stock.名称}</td>
                <td className="py-1.5 px-2 text-up font-mono font-semibold">{stock.现价.toFixed(2)}</td>
                <td className="py-1.5 px-2 text-up font-mono">{stock.涨幅.toFixed(2)}%</td>
                <td className="py-1.5 px-2 text-neutral font-mono">{stock.首次涨停时间}</td>
                <td className="py-1.5 px-2 text-neutral font-mono">{stock.开板次数}</td>
                <td className="py-1.5 px-2 font-mono">
                  <span className={stock.明涨停概率 > 30 ? 'text-up' : 'text-secondary'}>
                    {stock.明涨停概率.toFixed(2)}%
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex gap-1 flex-wrap">
                    {stock.题材.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-1.5 py-0 text-[10px] rounded bg-gray-700/50 text-secondary whitespace-nowrap">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      {tipPosition && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] w-72 -translate-x-1/2 rounded border border-blue-500/60 bg-[#161a24] p-3 text-left text-[11px] font-normal leading-relaxed text-secondary shadow-2xl"
          style={{ top: tipPosition.top, left: tipPosition.left }}
          role="tooltip"
        >
          <span className="mb-1 block font-semibold text-white">明涨停概率预测工具</span>
          <span className="block">综合连板高度、开板次数和当日涨幅生成 0–99 分的模型概率。</span>
          <span className="mt-1 block text-neutral">
            连板高度最高贡献 50 分；封板稳定性最高贡献 25 分；涨幅强度最高贡献 25 分。
          </span>
          <span className="mt-1 block">
            原始数据来自当前标注的数据源；概率为本地模型计算，并非东方财富或 Tushare 官方预测。
          </span>
          <span className="mt-1 block text-yellow-400">仅用于热度排序，不代表次日一定涨停，也不构成投资建议。</span>
        </div>,
        document.body,
      )}
    </>
  );
}
