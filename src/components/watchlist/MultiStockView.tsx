import { useState, useMemo } from 'react';
import { RefreshCw, Columns, Maximize2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { watchlistStocks } from '../../data/watchlistData';

const periods = ['分时', '五日', '1分', '5分', '15分', '30分', '60分', '日线', '周线', '月线', '季线', '年线'];

const COLORS = { bg: '#1A1E26', nav: '#1A1E26', divider: '#2A2E36', text: '#E6E9EF', secondary: '#8A919E', up: '#FF4D4F', down: '#36C98C', yellow: '#FFC53D', blue: '#4096FF', fill: 'rgba(64,150,255,0.2)' };

function generateChartData(base: number, pct: number) {
  const points = 14;
  const times = ['09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00'];
  const labels = ['09:30', '', '', '', '10:30', '', '', '', '11:30', '', '', '14:00', '', '15:00'];
  const maxMove = Math.abs(pct) * 2 + 2;
  const direction = pct >= 0 ? 1 : -1;

  return times.map((t, i) => {
    const progress = i / (points - 1);
    const move = Math.sin(progress * Math.PI * 1.5) * maxMove * 0.5 + progress * maxMove * direction * 0.5;
    const p = base * (1 + move / 100);
    const avgP = base * (1 + move * 0.7 / 100);
    const prevP = i > 0 ? base * (1 + (Math.sin((i - 1) / (points - 1) * Math.PI * 1.5) * maxMove * 0.5 + (i - 1) / (points - 1) * maxMove * direction * 0.5) / 100) : p;
    return {
      time: t,
      label: labels[i],
      price: Math.round(p * 100) / 100,
      avg: Math.round(avgP * 100) / 100,
      vol: Math.round(500 + Math.abs(Math.sin(progress * Math.PI * 3)) * 1500 + (p >= prevP ? Math.random() * 500 : 0)),
    };
  });
}

function MiniChart({ stock }: { stock: typeof watchlistStocks[0] }) {
  const data = useMemo(() => generateChartData(stock.现价, stock.涨幅), [stock]);
  const prices = data.map(d => d.price);
  const yBot = Math.min(...prices) * 0.98;
  const yTop = Math.max(...prices) * 1.02;
  const volMax = Math.max(...data.map(d => d.vol));
  const isUp = stock.涨幅 >= 0;

  return (
    <div className="flex flex-col rounded border border-[#2A2E36] overflow-hidden" style={{ backgroundColor: COLORS.bg }}>
      <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-[#2A2E36] flex-shrink-0">
        <span className="text-[#E6E9EF] text-[11px] font-semibold truncate">{stock.证券名称}</span>
        <span className="text-[#E6E9EF] text-[11px] font-mono">{stock.现价.toFixed(2)}</span>
        <span className="text-[11px] font-mono" style={{ color: isUp ? COLORS.up : COLORS.down }}>
          {isUp ? '+' : ''}{stock.涨幅.toFixed(2)}%
        </span>
        <span className="text-[#8A919E] text-[10px]">换手{stock.换手.toFixed(2)}%</span>
        <span className="text-[#8A919E] text-[10px]">量比{stock.最高}/{stock.最低}</span>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="absolute top-0.5 right-1 z-10 text-[9px] font-mono" style={{ color: isUp ? COLORS.up : COLORS.down }}>
          {isUp ? '+' : ''}{stock.涨幅.toFixed(2)}%
        </div>
        <div className="absolute bottom-[20%] right-1 z-10 text-[9px] font-mono" style={{ color: COLORS.down }}>
          -{Math.abs(stock.涨幅 * 1.5).toFixed(2)}%
        </div>

        <div style={{ flex: '85%', minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 6, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E36" />
              <XAxis dataKey="label" tick={{ fill: '#8A919E', fontSize: 8 }} axisLine={{ stroke: '#2A2E36' }} tickLine={false} />
              <YAxis yAxisId="price" domain={[yBot, yTop]} hide />
              <Tooltip contentStyle={{ backgroundColor: '#1A1E26', border: '1px solid #2A2E36', fontSize: 9, color: '#E6E9EF' }} />
              <ReferenceLine yAxisId="price" y={stock.现价} stroke="#2A2E36" strokeDasharray="3 3" />
              <Area yAxisId="price" type="monotone" dataKey="price" stroke={COLORS.blue} fill={COLORS.fill} strokeWidth={1.2} dot={false} name="现价" />
              <Area yAxisId="price" type="monotone" dataKey="avg" stroke={COLORS.yellow} fill="none" strokeWidth={1} dot={false} name="均价" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: '15%', minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={false} axisLine={false} />
              <YAxis yAxisId="vol" domain={[0, volMax * 1.2]} hide />
              <Bar yAxisId="vol" dataKey="vol" barSize={2}>
                {data.map((e, i) => { const prev = i > 0 ? data[i - 1].price : e.price; return <Cell key={i} fill={e.price >= prev ? COLORS.up : COLORS.down} />; })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function MultiStockView() {
  const [activePeriod, setActivePeriod] = useState('分时');
  const cols = watchlistStocks.length <= 4 ? 2 : watchlistStocks.length <= 6 ? 3 : 4;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: COLORS.bg }}>
      <div className="h-8 flex items-center px-2 gap-1 flex-shrink-0 border-b border-[#2A2E36]">
        {periods.map((p) => (
          <button key={p} onClick={() => setActivePeriod(p)}
            className={`px-2.5 py-0.5 text-[11px] rounded transition-colors ${activePeriod === p ? 'text-[#E6E9EF]' : 'text-[#8A919E] hover:text-[#E6E9EF]'}`}>{p}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button className="text-[#8A919E] hover:text-[#E6E9EF]"><RefreshCw size={14} /></button>
          <button className="text-[#8A919E] hover:text-[#E6E9EF]"><Columns size={14} /></button>
          <button className="text-[#8A919E] hover:text-[#E6E9EF]"><Maximize2 size={14} /></button>
          <button className="text-[#8A919E] hover:text-[#E6E9EF]"><Star size={14} /></button>
          <button className="text-[#8A919E] hover:text-[#E6E9EF]"><ChevronLeft size={14} /></button>
          <button className="text-[#8A919E] hover:text-[#E6E9EF]"><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-2">
        <div className={`grid gap-2 h-full`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: `calc((100vh - 160px) / ${Math.ceil(watchlistStocks.length / cols)})` }}>
          {watchlistStocks.map((s) => (
            <MiniChart key={s.证券代码} stock={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
