import { useState } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, BarChart3, Shield, Send } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  strategyName: string;
  onBack: () => void;
}

const metricCards = [
  { title: '累计收益', value: '+0.39万 (0.39%)', note: '2026-05-08 ~ 2026-05-13', color: '#ef4444', icon: TrendingUp, isUp: true },
  { title: '年化收益', value: '+28.5%', note: '累计/天数×365', color: '#ef4444', icon: DollarSign, isUp: true },
  { title: '夏普比率', value: '1.96', note: '模拟交易夏普', color: '#3b82f6', icon: BarChart3 },
  { title: '最大回撤', value: '-1.59%', note: '历史最大回撤', color: '#22c55e', icon: Shield, isDown: true },
  { title: '总资产', value: '100.39万', note: '持仓+现金', color: '#3b82f6', icon: DollarSign },
  { title: '可用资金', value: '2.39万', note: '现金余额', color: '#8A919E', icon: DollarSign },
  { title: '初始资金', value: '100万', note: '模拟本金', color: '#f59e0b', icon: DollarSign },
  { title: '交易次数', value: '21笔', note: '买卖合计', color: '#3b82f6', icon: BarChart3 },
];

const profitCurve = [
  { date: '05-08', value: 1000000 }, { date: '05-09', value: 1001800 }, { date: '05-10', value: 1004200 },
  { date: '05-11', value: 1007500 }, { date: '05-12', value: 1005100 }, { date: '05-13', value: 1003900 },
];

const trades = [
  { date: '2026-05-13', code: '688146.SH', name: '中船特气', dir: '买入', price: 117.60, qty: 1700, amount: 199920 },
  { date: '2026-05-13', code: '300210.SZ', name: '森远股份', dir: '买入', price: 12.05, qty: 16500, amount: 198825 },
  { date: '2026-05-13', code: '300959.SZ', name: '线上线下', dir: '买入', price: 133.79, qty: 1400, amount: 187306 },
  { date: '2026-05-12', code: '688323.SH', name: '瑞华泰', dir: '买入', price: 31.32, qty: 6300, amount: 197316 },
  { date: '2026-05-12', code: '920469.BJ', name: '富恒新材', dir: '买入', price: 8.17, qty: 24400, amount: 199348 },
  { date: '2026-05-12', code: '600050.SH', name: '中国联通', dir: '买入', price: 4.62, qty: 42300, amount: 195426 },
  { date: '2026-05-13', code: '600050.SH', name: '中国联通', dir: '卖出(止盈)', price: 4.74, qty: 42300, amount: 200502 },
  { date: '2026-05-09', code: '300059.SZ', name: '东方财富', dir: '买入', price: 21.48, qty: 9300, amount: 199764 },
  { date: '2026-05-13', code: '300059.SZ', name: '东方财富', dir: '卖出(止损)', price: 21.08, qty: 9300, amount: 196044 },
  { date: '2026-05-09', code: '600031.SH', name: '三一重工', dir: '买入', price: 21.15, qty: 9100, amount: 192465 },
  { date: '2026-05-13', code: '600031.SH', name: '三一重工', dir: '卖出(调仓)', price: 21.39, qty: 9100, amount: 194649 },
  { date: '2026-05-08', code: '600111.SH', name: '北方稀土', dir: '买入', price: 28.50, qty: 7000, amount: 199500 },
  { date: '2026-05-11', code: '600111.SH', name: '北方稀土', dir: '卖出(止盈)', price: 29.65, qty: 7000, amount: 207550 },
  { date: '2026-05-08', code: '600048.SH', name: '保利发展', dir: '买入', price: 9.85, qty: 20300, amount: 199955 },
  { date: '2026-05-12', code: '600048.SH', name: '保利发展', dir: '卖出(止盈)', price: 10.28, qty: 20300, amount: 208684 },
  { date: '2026-05-09', code: '000063.SZ', name: '中兴通讯', dir: '买入', price: 32.80, qty: 6100, amount: 200080 },
  { date: '2026-05-12', code: '000063.SZ', name: '中兴通讯', dir: '卖出(止盈)', price: 33.45, qty: 6100, amount: 204045 },
  { date: '2026-05-10', code: '601989.SH', name: '中国船舶', dir: '买入', price: 38.20, qty: 5200, amount: 198640 },
  { date: '2026-05-13', code: '601989.SH', name: '中国船舶', dir: '卖出(止盈)', price: 38.95, qty: 5200, amount: 202540 },
];

type Tab1 = '收益归因' | '风险归因';

export default function SimTradeReport({ strategyName, onBack }: Props) {
  const [chartTab, setChartTab] = useState<'累计收益曲线' | '最大回撤曲线'>('累计收益曲线');
  const [attrTab1, setAttrTab1] = useState<Tab1>('收益归因');

  return (
    <div className="flex-1 flex flex-col bg-[#17191F] overflow-auto scrollbar-thin">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2C303A] flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={onBack} className="text-[#8A919E] hover:text-white"><ArrowLeft size={18} /></button>
            <h1 className="text-lg font-bold text-[#E8EBF0]">模拟交易报告</h1>
          </div>
          <p className="text-xs text-[#8A919E]">策略:{strategyName} 上架时间:2026-05-11 20:38:22</p>
        </div>
        <button className="px-4 py-1.5 text-xs rounded-lg bg-blue-600 text-white flex items-center gap-1.5 hover:bg-blue-700 transition-colors">
          <Send size={12} /> 返回策略列表
        </button>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-4 gap-3 p-6 pb-3">
        {metricCards.map((m) => (
          <div key={m.title} className="bg-[#20232A] rounded-lg p-3 border border-[#2C303A] flex hover:border-[#4a5568] transition-colors" style={{ borderLeftWidth: '3px', borderLeftColor: m.color }}>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#8A919E]">{m.title}</span>
                <m.icon size={14} className="text-[#8A919E]" />
              </div>
              <div className={`text-lg font-bold font-mono mb-0.5 ${m.isUp ? 'text-[#ef4444]' : m.isDown ? 'text-[#22c55e]' : 'text-[#E8EBF0]'}`}>{m.value}</div>
              <div className="text-[10px] text-[#8A919E]">{m.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 收益曲线图 */}
      <div className="px-6 pb-4">
        <div className="bg-[#20232A] rounded-lg border border-[#2C303A] p-4">
          <div className="flex items-center gap-2 mb-3">
            {(['累计收益曲线', '最大回撤曲线'] as const).map((t) => (
              <button key={t} onClick={() => setChartTab(t)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${chartTab===t?'bg-blue-600 text-white':'bg-[#2C303A] text-[#8A919E] hover:text-white'}`}>{t}</button>
            ))}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitCurve} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C303A" />
                <XAxis dataKey="date" tick={{ fill: '#8A919E', fontSize: 10 }} axisLine={{ stroke: '#2C303A' }} />
                <YAxis domain={[997000, 1009000]} tick={{ fill: '#8A919E', fontSize: 10 }} axisLine={{ stroke: '#2C303A' }}
                  tickFormatter={(v) => `${(v/10000).toFixed(1)}万`} />
                <Tooltip contentStyle={{ backgroundColor: '#20232A', border: '1px solid #2C303A', fontSize: 10, color: '#E8EBF0' }}
                  formatter={(v: number) => [`${(v/10000).toFixed(1)}万`, '收益']} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="rgba(59,130,246,0.15)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 归因分析 */}
      <div className="px-6 pb-4">
        <div className="bg-[#20232A] rounded-lg border border-[#2C303A] p-4">
          <div className="flex items-center gap-2 mb-4">
            {(['收益归因', '风险归因'] as Tab1[]).map((t) => (
              <button key={t} onClick={() => setAttrTab1(t)}
                className={`px-4 py-1.5 text-xs rounded-md transition-colors ${attrTab1===t?'bg-blue-600 text-white':'bg-[#2C303A] text-[#8A919E] hover:text-white'}`}>{t}</button>
            ))}
          </div>

          {attrTab1 === '收益归因' && (
            <div className="flex items-center justify-center py-16 text-[#8A919E] text-sm">
              收益归因 — 待开发模块
            </div>
          )}

          {attrTab1 === '风险归因' && (
            <div className="flex items-center justify-center py-16 text-[#8A919E] text-sm">
              风险归因 — 待开发模块
            </div>
          )}
        </div>
      </div>

      {/* 成交记录表格 */}
      <div className="px-6 pb-6">
        <div className="bg-[#20232A] rounded-lg border border-[#2C303A] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2C303A]">
            <span className="text-sm font-semibold text-[#E8EBF0]">成交记录</span>
            <span className="text-xs text-[#8A919E]">{trades.length}笔</span>
          </div>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#20232A] z-10">
                <tr className="text-[#8A919E]">
                  <th className="py-2 px-3 text-left font-normal">交易日期</th>
                  <th className="py-2 px-3 text-left font-normal">股票代码</th>
                  <th className="py-2 px-3 text-left font-normal">股票名称</th>
                  <th className="py-2 px-3 text-left font-normal">交易方向</th>
                  <th className="py-2 px-3 text-right font-normal">成交价格</th>
                  <th className="py-2 px-3 text-right font-normal">成交数量</th>
                  <th className="py-2 px-3 text-right font-normal">成交金额</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={i} className={`border-b border-[#2C303A] hover:bg-[#2C303A]/50 transition-colors ${i%2===0?'bg-[#1C1F26]':''}`}>
                    <td className="py-2 px-3 text-[#E8EBF0]">{t.date}</td>
                    <td className="py-2 px-3 text-blue-400 font-mono">{t.code}</td>
                    <td className="py-2 px-3 text-[#E8EBF0]">{t.name}</td>
                    <td className={`py-2 px-3 font-semibold ${t.dir.includes('买入')?'text-[#ef4444]':'text-[#22c55e]'}`}>{t.dir}</td>
                    <td className="py-2 px-3 text-[#E8EBF0] font-mono text-right">{t.price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-[#E8EBF0] font-mono text-right">{t.qty.toLocaleString()}</td>
                    <td className="py-2 px-3 text-[#E8EBF0] font-mono text-right">{t.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
