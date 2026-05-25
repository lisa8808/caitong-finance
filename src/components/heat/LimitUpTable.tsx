import { useState } from 'react';
import { heatStocks } from '../../data/heatData';
import { HeatStock } from '../../types/heat';

interface Props {
  onSelectStock: (stock: HeatStock) => void;
  selectedCode?: string;
}

export default function LimitUpTable({ onSelectStock, selectedCode }: Props) {
  const [filter, setFilter] = useState<'all' | '2' | '1' | '炸板'>('all');

  const filteredStocks = heatStocks.filter((s) => {
    if (filter === '2') return s.连板数 >= 2;
    if (filter === '1') return s.连板数 === 1;
    if (filter === '炸板') return s.开板次数 > 3;
    return true;
  });

  return (
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
              <th className="py-2 px-2 text-left font-normal">明涨停概率%</th>
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
  );
}