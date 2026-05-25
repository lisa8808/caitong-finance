import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTab, DetailTab, StockItem } from '../types';
import { mockMinuteData, mockDailyData } from '../data/mockData';

interface Props {
  stock: StockItem;
}

const chartTabs: ChartTab[] = ['分时', '五日', '日线', '周线', '月线', '年线', '60分', '30分', '15分', '5分'];
const detailTabs: DetailTab[] = ['资金流向', '关联板块', '成份股'];

const fundFlowData = [
  { name: '主力流入', value: 35, color: '#FF4D4F' },
  { name: '主力流出', value: 25, color: '#52C41A' },
  { name: '散户流入', value: 20, color: '#FFAA00' },
  { name: '散户流出', value: 20, color: '#8C8F98' },
];

export default function StockDetail({ stock }: Props) {
  const [activeChart, setActiveChart] = useState<ChartTab>('分时');
  const [activeDetail, setActiveDetail] = useState<DetailTab>('资金流向');

  return (
    <div className="w-80 bg-primary-nav border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{stock.证券名称}</span>
            <span className="text-secondary text-xs">{stock.证券代码}</span>
            <TrendingUp size={14} className="text-up" />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-price text-2xl font-bold font-mono">{stock.现价.toFixed(3)}</span>
          <div className="flex flex-col items-end">
            <span className="text-up text-sm font-mono">
              {stock.涨跌 > 0 ? '+' : ''}{stock.涨跌.toFixed(3)}
            </span>
            <span className="text-up text-sm font-mono">
              {stock.涨幅 > 0 ? '+' : ''}{stock.涨幅.toFixed(2)}%
            </span>
          </div>
        </div>
        <p className="text-secondary text-[10px] mt-1">行情延时最少15分钟</p>
      </div>

      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-700">
        {chartTabs.slice(0, 5).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveChart(tab)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              activeChart === tab ? 'bg-gray-600 text-white' : 'text-secondary hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
        <span className="text-secondary text-[10px] self-center">|</span>
        {chartTabs.slice(5).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveChart(tab)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              activeChart === tab ? 'bg-gray-600 text-white' : 'text-secondary hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="h-48 bg-primary-chart p-2">
        {activeChart === '分时' || activeChart === '五日' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockMinuteData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="time" tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis tick={{ fill: '#8C8F98', fontSize: 10 }} domain={['dataMin - 0.5', 'dataMax + 0.5']} axisLine={{ stroke: '#2a2f3a' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10 }}
                labelStyle={{ color: '#8C8F98' }}
              />
              <Area type="monotone" dataKey="price" stroke="#FFAA00" fill="rgba(255, 170, 0, 0.2)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockDailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10 }}
                labelStyle={{ color: '#8C8F98' }}
              />
              <Bar dataKey="volume" fill={stock.涨跌 > 0 ? '#FF4D4F' : '#52C41A'} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex gap-1 px-3 py-2 border-b border-gray-700">
        {detailTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveDetail(tab)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeDetail === tab ? 'bg-gray-600 text-white' : 'text-secondary hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 p-3">
        {activeDetail === '资金流向' && (
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fundFlowData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {fundFlowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-up text-lg font-bold">0%</span>
                  <p className="text-secondary text-[10px]">净流入</p>
                </div>
              </div>
            </div>
            <div className="flex justify-between w-full mt-4 text-xs">
              <div className="flex flex-col items-center">
                <span className="text-down">散户流出</span>
                <span className="text-secondary">20%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-up">主力流入</span>
                <span className="text-secondary">35%</span>
              </div>
            </div>
            <div className="flex justify-between w-full mt-2 text-xs">
              <div className="flex flex-col items-center">
                <span className="text-secondary">主力流出</span>
                <span className="text-secondary">25%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-price">散户流入</span>
                <span className="text-secondary">20%</span>
              </div>
            </div>
          </div>
        )}
        {activeDetail === '关联板块' && (
          <div className="text-secondary text-xs text-center py-8">
            暂无关联板块数据
          </div>
        )}
        {activeDetail === '成份股' && (
          <div className="text-secondary text-xs text-center py-8">
            暂无成份股数据
          </div>
        )}
      </div>
    </div>
  );
}