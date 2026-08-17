import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Columns, Maximize2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { watchlistStocks } from '../../data/watchlistData';
import { WatchStock } from '../../types/watchlist';
import { ChartPoint, loadStockChart } from '../../services/watchlistService';

const periods = ['日线', '周线', '月线', '季线', '年线'];

const COLORS = { bg: '#1A1E26', nav: '#1A1E26', divider: '#2A2E36', text: '#E6E9EF', secondary: '#8A919E', up: '#FF4D4F', down: '#36C98C', yellow: '#FFC53D', blue: '#4096FF', fill: 'rgba(64,150,255,0.2)' };

type NormalizedPoint = ReturnType<typeof normalizeChartData>[number];

function toApiPeriod(period: string) {
  const map: Record<string, string> = {
    分时: '1min',
    五日: '5日',
    '1分': '1min',
    '5分': '5min',
    '15分': '15min',
    '30分': '30min',
    '60分': '60min',
    日线: '日',
    周线: '周',
    月线: '月',
    季线: '季',
    年线: '年',
  };
  return map[period] || '1min';
}

function normalizeChartData(points: ChartPoint[]) {
  let amount = 0;
  let volume = 0;
  return points.map((point, index) => {
    amount += point.price * point.vol;
    volume += point.vol;
    return {
      time: point.time,
      label: index % Math.max(1, Math.floor(points.length / 4)) === 0 ? point.time : '',
      price: point.price,
      open: point.open,
      close: point.close ?? point.price,
      high: point.high,
      low: point.low,
      pctChange: point.pctChange,
      amplitude: point.amplitude,
      avg: volume ? amount / volume : point.price,
      vol: point.vol,
      amount: point.amount,
    };
  });
}

function formatCompact(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return '--';
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}亿`;
  if (Math.abs(value) >= 10_000) return `${(value / 10_000).toFixed(2)}万`;
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

function ChartHoverTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: NormalizedPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const pctColor = (point.pctChange || 0) >= 0 ? COLORS.up : COLORS.down;
  const priceColor = (point.close || point.price) >= (point.open || point.price) ? COLORS.up : COLORS.down;
  const price = (value?: number) => value ? value.toFixed(2) : '--';

  return (
    <div className="min-w-[142px] rounded-sm border border-[#3A404B] bg-[#20242B]/95 px-2 py-1.5 text-[11px] leading-[1.65] shadow-2xl">
      <div className="flex justify-between gap-4 font-semibold text-[#D6DAE1]"><span>时间</span><span>{point.time}</span></div>
      <div className="flex justify-between gap-4"><span className="text-[#D6DAE1]">开盘</span><span className="font-mono" style={{ color: priceColor }}>{price(point.open)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-[#D6DAE1]">收盘</span><span className="font-mono" style={{ color: priceColor }}>{price(point.close)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-[#D6DAE1]">最高</span><span className="font-mono" style={{ color: COLORS.up }}>{price(point.high)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-[#D6DAE1]">最低</span><span className="font-mono" style={{ color: COLORS.down }}>{price(point.low)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-[#D6DAE1]">涨幅</span><span className="font-mono" style={{ color: pctColor }}>{point.pctChange === undefined ? '--' : `${point.pctChange.toFixed(2)}%`}</span></div>
      <div className="flex justify-between gap-4"><span className="text-[#D6DAE1]">振幅</span><span className="font-mono text-[#D6DAE1]">{point.amplitude === undefined ? '--' : `${point.amplitude.toFixed(2)}%`}</span></div>
      <div className="flex justify-between gap-4"><span className="text-[#D6DAE1]">成交量</span><span className="font-mono text-[#D6DAE1]">{formatCompact(point.vol)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-[#D6DAE1]">成交额</span><span className="font-mono text-[#D6DAE1]">{formatCompact(point.amount)}</span></div>
    </div>
  );
}

function MiniChart({ stock, period }: { stock: WatchStock; period: string }) {
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const data = useMemo(() => normalizeChartData(chartPoints), [chartPoints]);

  useEffect(() => {
    let ignore = false;
    loadStockChart(stock.证券代码, toApiPeriod(period)).then((points) => {
      if (!ignore) setChartPoints(points);
    });
    return () => { ignore = true; };
  }, [stock.证券代码, period]);

  const prices = data.map(d => d.price);
  const yBot = (prices.length ? Math.min(...prices) : stock.最低) * 0.98;
  const yTop = (prices.length ? Math.max(...prices) : stock.最高) * 1.02;
  const volMax = Math.max(...data.map(d => d.vol), 1);
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
              <Tooltip content={<ChartHoverTip />} />
              <ReferenceLine yAxisId="price" y={data[0]?.price || stock.现价} stroke="#2A2E36" strokeDasharray="3 3" />
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
              <Tooltip content={<ChartHoverTip />} />
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

interface Props {
  stocks?: WatchStock[];
}

export default function MultiStockView({ stocks = watchlistStocks }: Props) {
  const [activePeriod, setActivePeriod] = useState('日线');
  const cols = stocks.length <= 4 ? 2 : stocks.length <= 6 ? 3 : 4;

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
        <div className={`grid gap-2 h-full`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: `calc((100vh - 160px) / ${Math.ceil(stocks.length / cols)})` }}>
          {stocks.map((s) => (
            <MiniChart key={s.证券代码} stock={s} period={activePeriod} />
          ))}
        </div>
      </div>
    </div>
  );
}
