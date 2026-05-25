import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { watchlistStocks, watchDetail, fundFlowData, minuteChartData } from '../../data/watchlistData';
import { WatchStock } from '../../types/watchlist';
import { mockIndices } from '../../data/mockData';

const columns = ['序号', '证券代码', '证券名称', 'K线', '现价', '涨幅%', '涨跌', '涨速%', '换手%', '自选日', '自选价格', '自选收益%', '最高', '最低'];

export default function WatchlistPage() {
  const [selectedStock, setSelectedStock] = useState<WatchStock>(watchlistStocks[0]);
  const [activeChart, setActiveChart] = useState('分时');

  const chartTabs = ['分时', '五日', '日线', '周线', '月线', '年线', '60分', '30分', '15分', '5分'];
  const detailTabs = ['资金流向', '关联板块', '成份股'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center px-3 py-1.5 bg-primary-nav border-b border-gray-700 gap-1">
        {['自选', '多股同列', '多维看盘'].map((t) => (
          <button key={t} className={`px-3 py-1 text-xs rounded ${t==='自选'?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>
        ))}
        <button className="ml-auto text-secondary hover:text-white"><Plus size={14} /></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-primary-nav border-b border-gray-700">
            <span className="text-white text-xs font-semibold">自选股({watchlistStocks.length})</span>
            <button className="text-secondary hover:text-white"><Plus size={14} /></button>
          </div>
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-primary-nav z-10">
                <tr className="text-secondary">
                  {columns.map((c) => (
                    <th key={c} className="py-1.5 px-1.5 text-left font-normal whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {watchlistStocks.map((s, idx) => (
                  <tr key={s.证券代码} onClick={() => setSelectedStock(s)}
                    className={`cursor-pointer border-b border-gray-800 ${idx%2===0?'bg-primary-bg':'bg-primary-chart'} hover:bg-gray-700/50 ${selectedStock.证券代码===s.证券代码?'bg-primary-chart border-l-2 border-l-yellow-500':''}`}>
                    <td className="py-1.5 px-1.5 text-secondary font-mono">{s.序号}</td>
                    <td className="py-1.5 px-1.5 text-neutral font-mono">{s.证券代码}</td>
                    <td className="py-1.5 px-1.5 text-neutral">{s.证券名称}</td>
                    <td className="py-1.5 px-1.5 text-secondary text-[9px]">▁▃▅▇▆</td>
                    <td className={`py-1.5 px-1.5 font-mono font-semibold ${s.涨幅>=0?'text-up':'text-down'}`}>{s.现价.toFixed(2)}</td>
                    <td className={`py-1.5 px-1.5 font-mono ${s.涨幅>=0?'text-up':'text-down'}`}>{s.涨幅>=0?'+':''}{s.涨幅.toFixed(2)}%</td>
                    <td className={`py-1.5 px-1.5 font-mono ${s.涨跌>=0?'text-up':'text-down'}`}>{s.涨跌>=0?'+':''}{s.涨跌.toFixed(2)}</td>
                    <td className={`py-1.5 px-1.5 font-mono ${s.涨速>=0?'text-up':'text-down'}`}>{s.涨速>=0?'+':''}{s.涨速.toFixed(2)}%</td>
                    <td className="py-1.5 px-1.5 text-neutral font-mono">{s.换手.toFixed(2)}%</td>
                    <td className="py-1.5 px-1.5 text-neutral font-mono">{s.自选日}</td>
                    <td className="py-1.5 px-1.5 text-neutral font-mono">{s.自选价格.toFixed(2)}</td>
                    <td className={`py-1.5 px-1.5 font-mono ${s.自选收益>=0?'text-up':'text-down'}`}>{s.自选收益>=0?'+':''}{s.自选收益.toFixed(2)}%</td>
                    <td className="py-1.5 px-1.5 text-neutral font-mono">{s.最高.toFixed(2)}</td>
                    <td className="py-1.5 px-1.5 text-neutral font-mono">{s.最低.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-80 border-l border-gray-700 flex flex-col bg-primary-nav overflow-hidden">
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-semibold">{watchDetail.名称}</span>
              <span className="text-secondary text-xs font-mono">{watchDetail.代码}</span>
              {watchDetail.市场标识.map((t)=>(<span key={t} className="px-1 text-[9px] rounded bg-gray-600 text-secondary">{t}</span>))}
            </div>
            <div className="flex items-end gap-3">
              <span className="text-up text-2xl font-bold font-mono">{watchDetail.现价.toFixed(2)}</span>
              <div className="flex flex-col">
                <span className="text-up text-xs font-mono">+{watchDetail.涨跌.toFixed(2)}</span>
                <span className="text-up text-xs font-mono">+{watchDetail.涨跌幅.toFixed(2)}%</span>
              </div>
            </div>
            <p className="text-secondary text-[10px] mt-1">{watchDetail.行情说明}</p>
          </div>

          <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-700">
            {chartTabs.slice(0,5).map((t)=>(<button key={t} onClick={()=>setActiveChart(t)} className={`px-2 py-0.5 text-[10px] rounded ${activeChart===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}
            <span className="text-secondary text-[10px] mx-1">|</span>
            {chartTabs.slice(5).map((t)=>(<button key={t} onClick={()=>setActiveChart(t)} className={`px-2 py-0.5 text-[10px] rounded ${activeChart===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}
          </div>

          <div className="h-40 bg-primary-chart p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={minuteChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
                <XAxis dataKey="time" tick={{fill:'#8C8F98',fontSize:9}} />
                <YAxis tick={{fill:'#8C8F98',fontSize:9}} domain={['dataMin-0.5','dataMax+0.5']} />
                <Tooltip contentStyle={{backgroundColor:'#1E2230',border:'1px solid #3a3f4b',fontSize:10}} />
                <Area type="monotone" dataKey="price" stroke="#4FC3F7" fill="rgba(79,195,247,0.15)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex gap-1 px-3 py-2 border-b border-gray-700">
            {detailTabs.map((t)=>(<button key={t} className={`px-2 py-0.5 text-[10px] rounded ${t==='资金流向'?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}
          </div>

          <div className="flex-1 flex items-center justify-center p-3">
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fundFlowData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">
                    {fundFlowData.map((e,i)=>(<Cell key={i} fill={e.color} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <span className="text-up text-base font-bold">0%</span>
                  <p className="text-secondary text-[9px]">净流入</p>
                </div>
              </div>
              <div className="absolute top-0 left-0 right-0 flex justify-between text-[9px] px-2">
                <span className="text-down">主力流出 17.6%</span>
                <span className="text-up">主力流入 14.2%</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] px-2">
                <span className="text-secondary">散户流出 32.4%</span>
                <span className="text-price">散户流入 35.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-7 bg-primary-nav border-t border-gray-700 flex items-center px-3 gap-5 overflow-x-auto scrollbar-thin flex-shrink-0">
        {mockIndices.map((idx)=>(
          <div key={idx.name} className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
            <span className="text-secondary">{idx.name}</span>
            <span className="text-neutral font-mono">{idx.value.toFixed(2)}</span>
            <span className={`font-mono ${idx.change>=0?'text-up':'text-down'}`}>{idx.change>=0?'+':''}{idx.change.toFixed(2)}</span>
            <span className={`font-mono ${idx.changePercent>=0?'text-up':'text-down'}`}>{idx.changePercent>=0?'+':''}{idx.changePercent.toFixed(2)}%</span>
            <span className="text-secondary">{idx.volume}</span>
          </div>
        ))}
      </div>
    </div>
  );
}