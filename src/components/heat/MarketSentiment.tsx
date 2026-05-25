import { LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { sentimentHistory } from '../../data/heatData';

export default function MarketSentiment() {
  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      <div className="bg-primary-chart rounded p-3 border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-secondary text-xs">市场实热度</span>
          <span className="text-up text-xl font-bold font-mono">67%</span>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sentimentHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 9 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis hide domain={[30, 70]} />
              <Tooltip contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10 }} />
              <Bar dataKey="成功率" fill="#FF4D4F" opacity={0.3} barSize={8} />
              <Line type="monotone" dataKey="成功率" stroke="#FF4D4F" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-primary-chart rounded p-3 border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-secondary text-xs">连板数趋势</span>
          <div className="flex gap-4">
            <span className="text-up text-sm font-mono">
              最高连板 <span className="text-base font-bold">7</span>
            </span>
            <span className="text-price text-sm font-mono">
              非一字 <span className="text-base font-bold">7</span>
            </span>
          </div>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sentimentHistory}>
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

      <div className="bg-primary-chart rounded p-3 border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-secondary text-xs">打板成功率 / 炸板率</span>
          <div className="flex gap-4">
            <span className="text-up text-sm font-mono">
              成功率 <span className="text-base font-bold">49.12%</span>
            </span>
            <span className="text-down text-sm font-mono">
              炸板率 <span className="text-base font-bold">25.00%</span>
            </span>
          </div>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sentimentHistory}>
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

      <div className="bg-primary-chart rounded p-3 border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-secondary text-xs">最高板 / 涨停家数</span>
          <div className="flex gap-4">
            <span className="text-up text-sm font-mono">
              最高板 <span className="text-base font-bold">6</span>
            </span>
            <span className="text-up text-sm font-mono">
              涨停 <span className="text-base font-bold">54</span>
            </span>
          </div>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sentimentHistory}>
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