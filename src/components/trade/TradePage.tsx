import { useState } from 'react';
import { TrendingUp, Flame, Plus } from 'lucide-react';
import { strategyCards, topicCards } from '../../data/tradeData';
import MembershipModal from './MembershipModal';

export default function TradePage() {
  const [showMembership, setShowMembership] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 精选策略 */}
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-neutral text-base font-semibold mb-3">
            <Flame size={16} className="inline mr-1 text-price" />
            精选策略
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {topicCards.map((topic) => (
              <div
                key={topic.id}
                className="p-3 rounded border border-gray-700/50 bg-primary-chart hover:border-gray-500 transition-colors"
              >
                <h3 className="text-neutral text-sm font-semibold mb-2">{topic.名称}</h3>
                <p className="text-secondary text-xs mb-2 leading-relaxed">{topic.描述}</p>
                <div className="mb-2 space-y-1">
                  <div className="flex justify-between text-[11px]"><span className="text-secondary">年化收益</span><span className="text-up font-mono font-semibold">{topic.年化收益}</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-secondary">累计收益</span><span className="text-up font-mono font-semibold">{topic.累计收益}</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-secondary">最大回撤</span><span className="text-down font-mono">{topic.最大回撤}</span></div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setShowMembership(true); }} className="flex-1 py-1.5 text-[10px] rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">查看</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowMembership(true); }} className="flex-1 py-1.5 text-[10px] rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">模拟交易</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowMembership(true); }} className="flex-1 py-1.5 text-[10px] rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors">进入实盘</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden border-t border-gray-700 mt-3">
          {/* 自建策略 */}
          <div className="flex-1 overflow-auto scrollbar-thin p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-neutral text-base font-semibold">
                <TrendingUp size={16} className="inline mr-1 text-up" />
                自建策略
              </h2>
              <button className="px-2.5 py-1 text-xs rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center gap-1">
                <Plus size={12} /> 新增
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {strategyCards.map((card) => (
                <div
                  key={card.id}
                  className="p-3 rounded border border-gray-700/50 bg-primary-chart hover:border-gray-500 transition-colors"
                >
                  <h3 className="text-neutral text-sm font-semibold mb-1.5">{card.名称}</h3>
                  <p className="text-secondary text-xs mb-2">{card.描述}</p>
                  {card.年化收益 && (
                    <div className="flex justify-between text-[11px] mb-2">
                      <span className="text-secondary">年化收益</span>
                      <span className="text-up font-mono font-semibold">{card.年化收益}</span>
                    </div>
                  )}
                  {card.介绍 && (
                    <p className="text-secondary text-[10px] mb-2 leading-relaxed">{card.介绍}</p>
                  )}
                  {card.个股 && card.个股.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {card.个股.map((s) => (
                        <div key={s.名称} className="flex items-center gap-1">
                          <span className="text-neutral text-xs">{s.名称}</span>
                          <span className={`text-xs font-mono ${s.涨跌幅 >= 0 ? 'text-up' : 'text-down'}`}>
                            {s.涨跌幅 >= 0 ? '+' : ''}{s.涨跌幅.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showMembership && <MembershipModal onClose={() => setShowMembership(false)} />}
    </div>
  );
}
