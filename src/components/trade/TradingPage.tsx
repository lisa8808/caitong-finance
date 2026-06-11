import { useState } from 'react';
import { Settings, RefreshCw, Eye, XCircle, AlertCircle } from 'lucide-react';
import SimTradeReport from './SimTradeReport';

type TradeMode = '实盘交易' | '模拟交易';

interface StrategyCard {
  status: 'running' | 'ended' | 'error';
  name: string;
  todayReturn: string;
  totalReturn: string;
  maxDrawdown: string;
  tagLabel: string;
  tradeCount: number | null;
  hasDetail: boolean;
  hasStop: boolean;
  hasRedDetail: boolean;
}

const strategies: StrategyCard[] = [
  { status: 'error', name: '涨跌幅 + ROC变动率 + OBV能量潮', todayReturn: '-1.59%', totalReturn: '+0.39%', maxDrawdown: '-1.59%', tagLabel: '异常', tradeCount: 13, hasDetail: true, hasStop: false, hasRedDetail: true },
  { status: 'ended', name: 'KDJ-D + OBV能量潮', todayReturn: '-0.77%', totalReturn: '-0.8%', maxDrawdown: '-0.8%', tagLabel: '已结束', tradeCount: 10, hasDetail: true, hasStop: false, hasRedDetail: false },
  { status: 'running', name: 'BIAS1乖离率(6日) + MACD-DIF + MTM动量', todayReturn: '+3.12%', totalReturn: '-0.38%', maxDrawdown: '-3.4%', tagLabel: '进行中', tradeCount: 20, hasDetail: true, hasStop: true, hasRedDetail: false },
  { status: 'running', name: '总市值 + VR量比', todayReturn: '-1.76%', totalReturn: '-5.06%', maxDrawdown: '-5.06%', tagLabel: '进行中', tradeCount: 12, hasDetail: true, hasStop: true, hasRedDetail: false },
  { status: 'running', name: 'MACD-DIF + MFI资金流', todayReturn: '+2.17%', totalReturn: '+3.15%', maxDrawdown: '-0.02%', tagLabel: '进行中', tradeCount: 15, hasDetail: true, hasStop: true, hasRedDetail: false },
  { status: 'error', name: '多因子选股策略Alpha-1', todayReturn: '-', totalReturn: '-', maxDrawdown: '-', tagLabel: '异常', tradeCount: null, hasDetail: true, hasStop: false, hasRedDetail: false },
  { status: 'running', name: '反弹策略', todayReturn: '-4.03%', totalReturn: '-4.27%', maxDrawdown: '-4.27%', tagLabel: '进行中', tradeCount: 14, hasDetail: true, hasStop: true, hasRedDetail: false },
  { status: 'running', name: '多因子选股策略Alpha-1', todayReturn: '-0.02%', totalReturn: '-0.02%', maxDrawdown: '-0.02%', tagLabel: '进行中', tradeCount: 5, hasDetail: true, hasStop: true, hasRedDetail: false },
  { status: 'running', name: 'RSI(6) + ROC变动率 + BIAS1乖离率(6日) + BOLL中轨', todayReturn: '-0.02%', totalReturn: '-0.02%', maxDrawdown: '-0.02%', tagLabel: '进行中', tradeCount: 5, hasDetail: true, hasStop: true, hasRedDetail: false },
  { status: 'error', name: '测试详情', todayReturn: '-', totalReturn: '-', maxDrawdown: '-', tagLabel: '异常', tradeCount: null, hasDetail: true, hasStop: false, hasRedDetail: true },
  { status: 'running', name: 'MACD-DEA + BIAS2乖离率(12日)', todayReturn: '-0.02%', totalReturn: '-0.02%', maxDrawdown: '-0.02%', tagLabel: '进行中', tradeCount: 5, hasDetail: true, hasStop: true, hasRedDetail: false },
  { status: 'error', name: '均值回归套利策略', todayReturn: '-', totalReturn: '-', maxDrawdown: '-', tagLabel: '异常', tradeCount: null, hasDetail: true, hasStop: false, hasRedDetail: true },
];

type ColorVal = 'red' | 'green' | 'neutral';
function pnlColor(v: string): ColorVal { if(v==='-')return'neutral'; if(v.startsWith('+'))return'green'; return'red'; }
const colorMap = { green:'#22c55e', red:'#ef4444', neutral:'#9ca3af' };
const dotMap: Record<StrategyCard['status'],string> = { running:'#22c55e', ended:'#9ca3af', error:'#ef4444' };

function SimTradingView() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (selectedIdx !== null) {
    return <SimTradeReport strategyName={strategies[selectedIdx].name} onBack={() => setSelectedIdx(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-[#161a23]">
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div><h1 className="text-xl font-bold text-[#f0f2f6]" style={{fontFamily:"'Source Han Sans SC',sans-serif"}}>模拟交易</h1><p className="text-xs text-[#9ca3af] mt-0.5">盘中实时模拟校验</p></div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-md bg-[#212632] border border-[#303846] text-[#9ca3af] hover:text-[#f0f2f6] transition-colors"><Settings size={16} /></button>
          <button className="p-2 rounded-md bg-[#212632] border border-[#303846] text-[#9ca3af] hover:text-[#f0f2f6] transition-colors"><RefreshCw size={16} /></button>
        </div>
      </div>
      <div className="flex-1 px-6 pb-6">
        <div className="grid grid-cols-3 gap-4">
          {strategies.map((s, idx) => {
            const todayC = pnlColor(s.todayReturn), totalC = pnlColor(s.totalReturn), ddC = pnlColor(s.maxDrawdown);
            return (
              <div key={idx} onClick={() => setSelectedIdx(idx)}
                className="rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:border-[#4a5568] transition-colors"
                style={{backgroundColor:'#212632', border:'1px solid #303846', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.02)'}}>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:dotMap[s.status]}}/>
                  <span className="text-sm font-semibold text-[#f0f2f6] truncate" style={{fontFamily:"'Source Han Sans SC',sans-serif"}}>{s.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center"><div className="text-[11px] text-[#9ca3af]">今日收益</div><div className="text-base font-bold" style={{color:colorMap[todayC]}}>{s.todayReturn}</div></div>
                  <div className="text-center"><div className="text-[11px] text-[#9ca3af]">累计收益</div><div className="text-base font-bold" style={{color:colorMap[totalC]}}>{s.totalReturn}</div></div>
                  <div className="text-center"><div className="text-[11px] text-[#9ca3af]">最大回撤</div><div className="text-base font-bold" style={{color:colorMap[ddC]}}>{s.maxDrawdown}</div></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] rounded" style={{backgroundColor:s.status==='running'?'#22c55e20':s.status==='ended'?'#9ca3af20':'#ef444420', color:s.status==='running'?'#22c55e':s.status==='ended'?'#9ca3af':'#ef4444'}}>{s.tagLabel}</span>
                    {s.tradeCount!==null&&<span className="text-[11px] text-[#9ca3af]">{s.tradeCount}笔交易</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {s.hasDetail&&<button className="flex items-center gap-0.5 text-[11px] text-blue-400 hover:text-blue-300"><Eye size={12}/>详情</button>}
                    {s.hasRedDetail&&<button className="flex items-center gap-0.5 text-[11px] text-[#ef4444] hover:text-red-400"><AlertCircle size={12}/>详情</button>}
                    {s.hasStop&&<button className="flex items-center gap-0.5 text-[11px] text-orange-400 hover:text-orange-300"><XCircle size={12}/>结束</button>}
                    <button className="flex items-center gap-0.5 text-[11px] text-[#9ca3af] hover:text-[#f0f2f6]"><XCircle size={12}/>移除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TradingPage() {
  const [mode, setMode] = useState<TradeMode>('模拟交易');
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-primary-nav border-b border-gray-700">
        {(['模拟交易','实盘交易'] as TradeMode[]).map(t=>(<button key={t} onClick={()=>setMode(t)} className={`px-6 py-1 text-sm rounded transition-colors ${mode===t?'bg-gray-600 text-white font-semibold':'text-secondary hover:text-white'}`}>{t}</button>))}
      </div>
      {mode === '模拟交易' ? <SimTradingView /> : (
        <div className="flex-1 flex items-center justify-center text-secondary text-sm">实盘交易 — 待开发模块</div>
      )}
    </div>
  );
}
