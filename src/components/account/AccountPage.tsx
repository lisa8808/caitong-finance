import { useState } from 'react';
import { Eye, EyeOff, HelpCircle, ArrowRight, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const compareData = [
  { date: '6/1', account: 0, benchmark: 0 }, { date: '6/2', account: 0.8, benchmark: 1.2 },
  { date: '6/3', account: 1.5, benchmark: 0.9 }, { date: '6/4', account: 2.3, benchmark: 1.8 },
  { date: '6/5', account: 1.8, benchmark: 1.1 }, { date: '6/6', account: 2.7, benchmark: 2.0 },
  { date: '6/7', account: 2.1, benchmark: 1.5 }, { date: '6/8', account: 3.2, benchmark: 2.3 },
  { date: '6/9', account: 2.8, benchmark: 1.9 },
];

const yesterdayStocks = [
  { name: '比亚迪', code: '002594', pnl: 8650, pct: 3.12 },
  { name: '宁德时代', code: '300750', pnl: -1800, pct: -0.85 },
  { name: '贵州茅台', code: '600519', pnl: 38500, pct: 2.35 },
  { name: '隆基绿能', code: '601012', pnl: -18200, pct: -7.43 },
  { name: '中芯国际', code: '688981', pnl: -800, pct: -1.35 },
];

export default function AccountPage() {
  const [showAmount, setShowAmount] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [transferType, setTransferType] = useState<'in' | 'out'>('in');
  const [transferAmount, setTransferAmount] = useState('');
  const [billPeriod, setBillPeriod] = useState('本月');
  const [period, setPeriod] = useState('本月');

  return (
    <div className="flex-1 bg-primary-bg overflow-auto scrollbar-thin" style={{ minHeight: 0 }}>
      {/* 模块2: 总资产核心卡片 */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 mx-6 mt-6 rounded-xl p-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/70 text-sm">账户总资产（元）</span>
              <HelpCircle size={14} className="text-white/50 cursor-help" />
              <button onClick={() => setShowAmount(!showAmount)} className="text-white/50 hover:text-white/80">
                {showAmount ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
            <div className="text-3xl font-bold text-white font-mono">
              {showAmount ? '1,160,390.00' : '****'}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-up text-sm font-mono">+6,390.00</span>
              <span className="text-up text-sm font-mono">+0.55%</span>
              <span className="text-white/50 text-xs">累计总收益</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTransfer(true)} className="px-5 py-2.5 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25 transition-colors">转账</button>
          <button onClick={() => setShowBill(true)} className="px-5 py-2.5 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25 transition-colors">账单</button>
        </div>
      </div>

      {/* 模块3: 市场资讯横幅 */}
      {showBanner && (
        <div className="mx-6 mt-4 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-300">
            盘中速递：沪指盘中突破4100点，AI算力板块持续走强 | 
            <span className="text-blue-400 cursor-pointer hover:underline ml-1">《大盘值班室》</span>
          </p>
          <button onClick={() => setShowBanner(false)} className="text-blue-400 hover:text-blue-300"><X size={14} /></button>
        </div>
      )}

      {/* 模块4: 资产分类卡片 */}
      <div className="mx-6 mt-4 grid grid-cols-3 gap-3">
        {[
          { name: '现金', amount: '23,890.50', pnl: '+12.30', isUp: true },
          { name: '股票', amount: '868,240.00', pnl: '+6,390.00', isUp: true },
          { name: '理财', amount: '156,000.00', link: '惠理财' },
        ].map((item) => (
          <div key={item.name} className="bg-primary-nav rounded-xl border border-gray-700 p-4 cursor-pointer hover:border-gray-500 transition-colors">
            <div className="text-xs text-secondary mb-1">{item.name}</div>
            <div className="text-lg font-bold text-neutral font-mono">{item.amount}</div>
            <div className="flex items-center gap-2 mt-1">
              {item.pnl && (
                <span className={`text-xs font-mono ${item.isUp ? 'text-up' : 'text-down'}`}>
                  昨日 {item.pnl}
                </span>
              )}
              {item.link && (
                <span className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  查看{item.link} <ArrowRight size={10} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 模块5: 昨日收益明细 */}
      <div className="mx-6 mt-4 bg-primary-nav rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">昨日收益（截至6月8日）</span>
            <span className="text-xs text-price">跑赢82%平台用户</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-up font-mono">+4,852.00</span>
            <span className="text-lg text-up font-mono">+0.42%</span>
          </div>
        </div>
        {yesterdayStocks.map((s) => (
          <div key={s.code} className={`flex items-center justify-between px-6 py-3 border-b border-gray-800 ${s.pnl >= 0 ? 'bg-up/5' : 'bg-down/5'}`}>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral">{s.name}</span>
              <span className="text-xs text-secondary font-mono">{s.code}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-mono font-semibold ${s.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                {s.pnl >= 0 ? '+' : ''}{s.pnl.toLocaleString()}
              </span>
              <span className={`text-xs font-mono ${s.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                {s.pnl >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 模块6: 资产分析可视化 */}
      <div className="mx-6 mt-4 mb-6 bg-primary-nav rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">本月收益</span>
              <span className="text-xl font-bold text-up font-mono">+6,390.00</span>
              <span className="text-sm text-up font-mono">+0.55%</span>
            </div>
            <p className="text-xs text-secondary mt-1">跑赢沪深300 +1.2%</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-700/50 rounded-lg p-0.5">
              {['本月', '今年', '近半年', '近两年'].map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${period===p?'bg-blue-600 text-white':'text-secondary hover:text-white'}`}>{p}</button>
              ))}
            </div>
            <button className="text-xs text-blue-400 hover:text-blue-300">查看详情</button>
          </div>
        </div>
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={compareData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10, color: '#E8EBF0' }} formatter={(v: number) => [`${v.toFixed(2)}%`, '']} />
              <Area type="monotone" dataKey="account" stroke="#FF4D4F" fill="rgba(255,77,79,0.1)" strokeWidth={2} dot={false} name="我的账户" />
              <Area type="monotone" dataKey="benchmark" stroke="#4096FF" fill="rgba(64,150,255,0.08)" strokeWidth={2} dot={false} name="沪深300" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowTransfer(false)}>
          <div className="bg-[#1A1D23] border border-[#2C303A] rounded-xl w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
              <span className="text-white text-sm font-semibold">资金划转</span>
              <button onClick={() => setShowTransfer(false)} className="text-secondary hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex border-b border-gray-700">
              {(['in', 'out'] as const).map((t) => (
                <button key={t} onClick={() => setTransferType(t)}
                  className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    transferType===t ? 'border-blue-500 text-blue-400' : 'border-transparent text-secondary hover:text-white'
                  }`}>{t==='in'?'银证转入':'银证转出'}</button>
              ))}
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-secondary mb-1.5 block">
                  {transferType === 'in' ? '转入金额' : '转出金额'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">¥</span>
                  <input value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="请输入金额" type="number"
                    className="w-full pl-7 pr-3 py-2.5 text-sm rounded-lg bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono" />
                </div>
              </div>
              <div className="bg-[#242730] rounded-lg p-3 text-xs text-secondary">
                <div className="flex justify-between"><span>可用资金</span><span className="text-neutral font-mono">23,890.50</span></div>
              </div>
              <button className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                确认{transferType==='in'?'转入':'转出'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowBill(false)}>
          <div className="bg-[#1A1D23] border border-[#2C303A] rounded-xl w-[680px] max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
              <span className="text-white text-sm font-semibold">账单明细</span>
              <button onClick={() => setShowBill(false)} className="text-secondary hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-1 px-5 py-2.5 border-b border-gray-700/50 flex-shrink-0">
              {['今日', '昨日', '本月', '今年', '近一年'].map((p) => (
                <button key={p} onClick={() => setBillPeriod(p)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${billPeriod===p?'bg-blue-600 text-white':'text-secondary hover:text-white'}`}>{p}</button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2 px-5 py-3 border-b border-gray-700/50 flex-shrink-0">
              {[
                { label: '交易次数', val: '21' },
                { label: '交易标的数', val: '8' },
                { label: '清仓次数', val: '5' },
                { label: '交易费用', val: '1,100.00' },
                { label: '转入金额', val: '0.00' },
                { label: '转出金额', val: '0.00' },
              ].map((m) => (
                <div key={m.label} className="bg-[#242730] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-secondary mb-1">{m.label}</div>
                  <div className="text-sm text-neutral font-mono font-semibold">{m.val}</div>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-[#1A1D23] z-10">
                  <tr className="text-secondary border-b border-gray-700/50">
                    <th className="py-2 px-3 text-left font-normal">时间</th>
                    <th className="py-2 px-3 text-left font-normal">标的名称</th>
                    <th className="py-2 px-3 text-right font-normal">确认净值</th>
                    <th className="py-2 px-3 text-right font-normal">发生金额</th>
                    <th className="py-2 px-3 text-right font-normal">确认份额</th>
                    <th className="py-2 px-3 text-right font-normal">交易费用</th>
                    <th className="py-2 px-3 text-left font-normal">方向</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { time: '06-09 14:32', name: '比亚迪', price: '285.30', amount: '-28,530', qty: '100', fee: '5.00', dir: '卖出' },
                    { time: '06-09 10:15', name: '中芯国际', price: '58.60', amount: '+58,600', qty: '1,000', fee: '8.50', dir: '买入' },
                    { time: '06-08 13:20', name: '隆基绿能', price: '22.68', amount: '-22,680', qty: '1,000', fee: '3.20', dir: '卖出' },
                    { time: '06-08 09:45', name: '宁德时代', price: '210.50', amount: '+105,250', qty: '500', fee: '12.00', dir: '买入' },
                    { time: '06-07 14:10', name: '贵州茅台', price: '1,680.50', amount: '+168,050', qty: '100', fee: '25.00', dir: '买入' },
                    { time: '06-07 11:30', name: '比亚迪', price: '282.00', amount: '+84,600', qty: '300', fee: '10.00', dir: '买入' },
                    { time: '06-06 10:00', name: '隆基绿能', price: '23.50', amount: '-47,000', qty: '2,000', fee: '6.50', dir: '卖出' },
                    { time: '06-06 09:35', name: '中芯国际', price: '57.80', amount: '-115,600', qty: '2,000', fee: '15.00', dir: '卖出' },
                  ].map((r, i) => (
                    <tr key={i} className={`border-b border-gray-800 ${i%2===0?'bg-primary-bg':'bg-primary-chart'}`}>
                      <td className="py-2 px-3 text-secondary font-mono">{r.time}</td>
                      <td className="py-2 px-3 text-neutral">{r.name}</td>
                      <td className="py-2 px-3 text-neutral font-mono text-right">{r.price}</td>
                      <td className={`py-2 px-3 font-mono text-right ${r.amount.startsWith('+')?'text-up':'text-down'}`}>{r.amount}</td>
                      <td className="py-2 px-3 text-neutral font-mono text-right">{r.qty}</td>
                      <td className="py-2 px-3 text-secondary font-mono text-right">{r.fee}</td>
                      <td className={`py-2 px-3 font-semibold ${r.dir==='买入'?'text-up':'text-down'}`}>{r.dir}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
