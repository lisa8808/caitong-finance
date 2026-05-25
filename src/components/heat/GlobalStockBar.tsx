import { useState } from 'react';
import { globalStock, strategyTags } from '../../data/heatData';

export default function GlobalStockBar() {
  const [activeTag, setActiveTag] = useState('龙头');

  return (
    <div className="bg-primary-nav border-b border-gray-700">
      <div className="flex items-center px-3 py-2 gap-4 border-b border-gray-700/50">
        <span className="text-neutral text-sm font-mono font-semibold">{globalStock.代码}</span>
        <span className="text-neutral text-sm">{globalStock.名称}</span>
        <span className="text-up text-sm font-mono font-semibold">{globalStock.现价.toFixed(2)}</span>
        <span className="text-up text-sm font-mono">{globalStock.涨跌幅.toFixed(2)}%</span>
        <span className="text-up text-xs font-mono">+{globalStock.涨跌额.toFixed(2)}</span>
        <span className="text-secondary text-xs">
          振幅 <span className="text-neutral font-mono">{globalStock.振幅}%</span>
        </span>
        <span className="text-secondary text-xs">
          量比 <span className="text-neutral font-mono">{globalStock.量比}</span>
        </span>
        <div className="flex gap-1 ml-3">
          {globalStock.题材标签.map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-[10px] rounded bg-gray-700 text-secondary">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center px-3 py-1.5 gap-0.5 flex-wrap">
        {strategyTags.map((tag) => (
          <button
            key={tag.name}
            onClick={() => setActiveTag(tag.name)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors whitespace-nowrap ${
              activeTag === tag.name
                ? 'bg-up text-white'
                : 'text-secondary hover:text-white hover:bg-gray-700'
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}