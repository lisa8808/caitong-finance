import { useState } from 'react';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { strategyCards, topicCards, resultStocks } from '../../data/tradeData';
import { StrategyCard } from '../../types/trade';

type TradeTab = '基础选股' | '策略选股' | '主题选股';

export default function TradePage() {
  const [activeTab, setActiveTab] = useState<TradeTab>('策略选股');
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyCard | null>(strategyCards[0]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center px-4 py-2 bg-primary-nav border-b border-gray-700 gap-1">
        {(['基础选股', '策略选股', '主题选股'] as TradeTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded transition-colors ${
              activeTab === tab
                ? 'bg-gray-600 text-white'
                : 'text-secondary hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 策略精选卡片 */}
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-neutral text-base font-semibold mb-3">
            <Flame size={16} className="inline mr-1 text-price" />
            策略精选
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {strategyCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setSelectedStrategy(card)}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  selectedStrategy?.id === card.id
                    ? 'bg-gray-700 border-yellow-500/50'
                    : 'bg-primary-chart border-gray-700/50 hover:border-gray-500'
                }`}
              >
                <h3 className="text-neutral text-sm font-semibold mb-2">{card.名称}</h3>
                <p className="text-secondary text-xs mb-2 leading-relaxed">{card.描述}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {card.关联标的.map((name) => (
                    <span key={name} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-700 text-secondary">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedStrategy && (
          <div className="flex-1 flex overflow-hidden border-t border-gray-700 mt-3">
            {/* 左下：热门主题选股 */}
            <div className="flex-1 overflow-auto scrollbar-thin p-4 border-r border-gray-700">
              <h2 className="text-neutral text-base font-semibold mb-3">
                <TrendingUp size={16} className="inline mr-1 text-up" />
                热门主题选股
              </h2>
              <div className="space-y-3">
                {topicCards.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-3 rounded bg-primary-chart border border-gray-700/50 hover:border-gray-500 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-neutral text-sm font-semibold">{topic.名称}</h3>
                      {topic.isHot && (
                        <span className="px-1.5 py-0 text-[9px] rounded bg-red-600 text-white font-bold">HOT</span>
                      )}
                      <span className="text-secondary text-[10px] ml-auto">{topic.时间}</span>
                    </div>
                    <p className="text-secondary text-xs mb-3 leading-relaxed">{topic.描述}</p>
                    <div className="flex gap-4">
                      {topic.关联个股.map((s) => (
                        <div key={s.名称} className="flex items-center gap-1.5">
                          <span className="text-neutral text-xs">{s.名称}</span>
                          <span className={`text-xs font-mono ${s.涨跌幅 >= 0 ? 'text-up' : 'text-down'}`}>
                            {s.涨跌幅 >= 0 ? '+' : ''}{s.涨跌幅.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右下：选股结果 */}
            <div className="flex-1 overflow-auto scrollbar-thin p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-neutral text-sm font-semibold">
                  {selectedStrategy.名称} 选股结果
                </h2>
                <span className="text-secondary text-[10px]">共{resultStocks.length}只</span>
              </div>
              <p className="text-secondary text-[10px] mb-3">
                筛选规则：{selectedStrategy.描述}
              </p>
              <table className="w-full text-[11px]">
                <thead className="bg-primary-nav sticky top-0 z-10">
                  <tr className="text-secondary">
                    <th className="py-1.5 px-2 text-left font-normal">代码</th>
                    <th className="py-1.5 px-2 text-left font-normal">名称</th>
                    <th className="py-1.5 px-2 text-right font-normal">最新价</th>
                    <th className="py-1.5 px-2 text-right font-normal">涨跌幅</th>
                  </tr>
                </thead>
                <tbody>
                  {resultStocks.map((stock, idx) => (
                    <tr
                      key={stock.代码}
                      className={`border-b border-gray-800 hover:bg-gray-700/30 cursor-pointer ${
                        idx % 2 === 0 ? 'bg-primary-bg' : 'bg-primary-chart'
                      }`}
                    >
                      <td className="py-1 px-2 text-neutral font-mono">
                        {stock.代码}.{stock.市场}
                      </td>
                      <td className="py-1 px-2 text-neutral">{stock.名称}</td>
                      <td className="py-1 px-2 text-neutral font-mono text-right">
                        {stock.最新价.toFixed(2)}
                      </td>
                      <td className={`py-1 px-2 font-mono text-right whitespace-nowrap ${
                        stock.涨跌幅 >= 0 ? 'text-up' : 'text-down'
                      }`}>
                        {stock.涨跌幅 >= 0 ? (
                          <TrendingUp size={10} className="inline mr-0.5" />
                        ) : (
                          <TrendingDown size={10} className="inline mr-0.5" />
                        )}
                        {stock.涨跌幅 >= 0 ? '+' : ''}{stock.涨跌幅.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}