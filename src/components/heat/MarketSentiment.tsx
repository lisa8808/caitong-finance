import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { HelpCircle } from 'lucide-react';
import { SentimentData } from '../../types/heat';

interface Props {
  data: SentimentData[];
  height: number;
}

interface MetricTipProps {
  title: string;
  children: ReactNode;
}

function MetricTip({ title, children }: MetricTipProps) {
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean } | null>(null);

  const showTip = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const above = rect.bottom + 190 > window.innerHeight;
    setPosition({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(window.innerWidth - 152, Math.max(152, rect.left + rect.width / 2)),
      above,
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`${title}指标说明`}
        className="inline-flex rounded text-secondary/60 outline-none hover:text-blue-400 focus-visible:ring-1 focus-visible:ring-blue-400"
        onMouseEnter={(event) => showTip(event.currentTarget)}
        onMouseLeave={() => setPosition(null)}
        onFocus={(event) => showTip(event.currentTarget)}
        onBlur={() => setPosition(null)}
      >
        <HelpCircle size={12} className="cursor-help" />
      </button>
      {position && createPortal(
        <div
          role="tooltip"
          className={`pointer-events-none fixed z-[9999] w-72 -translate-x-1/2 rounded border border-blue-500/60 bg-[#161a24] p-3 text-left text-[11px] font-normal leading-relaxed text-secondary shadow-2xl ${position.above ? '-translate-y-full' : ''}`}
          style={{ top: position.top, left: position.left }}
        >
          <span className="mb-1 block font-semibold text-white">{title}</span>
          {children}
          <span className="mt-2 block border-t border-gray-700 pt-1 text-[10px] text-yellow-400">
            统计范围为页面所示最近 15 个交易日；指标用于市场热度观察，不构成投资建议。
          </span>
        </div>,
        document.body,
      )}
    </>
  );
}

export default function MarketSentiment({ data, height }: Props) {
  const [showFormula, setShowFormula] = useState(false);
  const latest = data[data.length - 1];
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-3 p-3 shrink-0" style={{ height }}>
      <div className="bg-primary-chart rounded p-3 border border-gray-700/50 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 relative">
            <span className="text-secondary text-xs">市场实热度</span>
            <HelpCircle size={12} className="text-secondary/60 cursor-help" onMouseEnter={() => setShowFormula(true)} onMouseLeave={() => setShowFormula(false)} />
            {showFormula && (
              <div className="pointer-events-none absolute left-0 top-5 z-[9999] w-56 rounded border border-[#2f80ff]/70 bg-[#1A1D23] p-2 text-[10px] shadow-2xl">
                <div className="text-[#f0f0f0] font-semibold mb-1">热度计算公式</div>
                <div className="text-[#8a8f99] leading-relaxed">
                  热度 = min(100,<br />
                  <span className="text-[#FF4D4F]">&nbsp;&nbsp;(涨停家数/80) × 50</span><br />
                  <span className="text-[#FFAA00]">&nbsp;&nbsp;+ (最高板/10) × 30</span><br />
                  <span className="text-[#4096FF]">&nbsp;&nbsp;+ (成功率/100) × 20</span><br />
                </div>
                <div className="mt-1 text-[#8a8f99]">涨停家数贡献 50%，最高板 30%，封板成功率 20%</div>
              </div>
            )}
          </div>
          <span className="text-up text-xl font-bold font-mono">{latest?.热度?.toFixed(0) || '--'}</span>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 9 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10 }} />
              <Bar dataKey="热度" fill="#FF4D4F" opacity={0.3} barSize={8} />
              <Line type="monotone" dataKey="热度" stroke="#FF4D4F" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-primary-chart rounded p-3 border border-gray-700/50 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-secondary text-xs">连板数趋势</span>
            <MetricTip title="连板数趋势统计口径">
              <span className="block">红线「连板数」：当日涨停池中连续涨停至少 2 个交易日的股票数量。</span>
              <span className="mt-1 block">黄线「非一字连板数」：上述连板股中，存在开板记录，或首次封板晚于 09:30 的股票数量。</span>
              <span className="mt-1 block text-neutral">右上角最高连板取当日涨停股的最大连续涨停天数；数据来自东方财富涨停池。</span>
              <span className="mt-1 block">Tushare 降级时，以开板次数大于 0 识别非一字连板。</span>
            </MetricTip>
          </div>
          <div className="flex gap-4">
            <span className="text-up text-sm font-mono">
               最高连板 <span className="text-base font-bold">{latest?.最高板 || '--'}</span>
            </span>
            <span className="text-price text-sm font-mono">
               非一字 <span className="text-base font-bold">{latest?.非一字连板数 || '--'}</span>
            </span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 9 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10 }} />
              <Line type="monotone" dataKey="连板数" stroke="#FF4D4F" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="非一字连板数" stroke="#FFAA00" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-primary-chart rounded p-3 border border-gray-700/50 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-secondary text-xs">打板成功率 / 炸板率</span>
            <MetricTip title="打板成功率 / 炸板率统计口径">
              <span className="block">尝试涨停数 = 收盘封板家数 + 当日炸板家数。</span>
              <span className="mt-1 block">成功率 = 收盘封板家数 ÷ 尝试涨停数 × 100%。</span>
              <span className="block">炸板率 = 炸板家数 ÷ 尝试涨停数 × 100%，两者合计 100%。</span>
              <span className="mt-1 block text-neutral">封板池与炸板池来自东方财富；Tushare 降级时按涨停池内开板记录近似计算。</span>
            </MetricTip>
          </div>
          <div className="flex gap-4">
            <span className="text-up text-sm font-mono">
               成功率 <span className="text-base font-bold">{latest?.成功率?.toFixed(2) || '--'}%</span>
            </span>
            <span className="text-down text-sm font-mono">
               炸板率 <span className="text-base font-bold">{latest?.炸板率?.toFixed(2) || '--'}%</span>
            </span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 9 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10 }} />
              <Bar dataKey="成功率" fill="#FF4D4F" opacity={0.4} barSize={6} />
              <Bar dataKey="炸板率" fill="#52C41A" opacity={0.4} barSize={6} />
              <Line type="monotone" dataKey="成功率" stroke="#FF4D4F" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="炸板率" stroke="#52C41A" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-primary-chart rounded p-3 border border-gray-700/50 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-secondary text-xs">最高板 / 涨停家数</span>
            <MetricTip title="最高板 / 涨停家数统计口径">
              <span className="block">最高板：当日涨停池中，个股连续涨停交易日数的最大值。</span>
              <span className="mt-1 block">涨停家数：当日收盘仍处于涨停状态的股票数量；炸板股票不计入。</span>
              <span className="block">图中同时绘制跌停家数（绿线）；东方财富当前接口未提供时记为 0。</span>
              <span className="mt-1 block text-neutral">主数据来自东方财富涨停池；接口异常时使用 Tushare 涨跌停数据降级。</span>
            </MetricTip>
          </div>
          <div className="flex gap-4">
            <span className="text-up text-sm font-mono">
               最高板 <span className="text-base font-bold">{latest?.最高板 || '--'}</span>
            </span>
            <span className="text-up text-sm font-mono">
               涨停 <span className="text-base font-bold">{latest?.涨停家数 || '--'}</span>
            </span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 9 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10 }} />
              <Line type="monotone" dataKey="最高板" stroke="#FF4D4F" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="涨停家数" stroke="#FFAA00" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="跌停家数" stroke="#52C41A" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
