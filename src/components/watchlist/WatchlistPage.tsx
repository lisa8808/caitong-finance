import { useState, useMemo } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { holdingStocks, watchlistStocks as initialWatchlist, watchDetail, fundFlowData, minuteChartData } from '../../data/watchlistData';
import { WatchStock, HoldingStock } from '../../types/watchlist';
import { mockIndices } from '../../data/mockData';
import MultiStockView from './MultiStockView';

const columns = ['序号', '证券代码', '证券名称', 'K线', '现价', '涨幅%', '涨跌', '涨速%', '换手%', '自选日', '自选价格', '自选收益%', '最高', '最低'];
const holdingColumns = ['序号', '证券代码', '证券名称', '现价', '持仓数量', '成本价', '市值', '盈亏', '盈亏率', '今日涨幅'];

export default function WatchlistPage() {
  const [selectedStock, setSelectedStock] = useState<WatchStock>(initialWatchlist[0]);
  const [selectedHolding, setSelectedHolding] = useState<HoldingStock>(holdingStocks[0]);
  const [watchlist, setWatchlist] = useState<WatchStock[]>(initialWatchlist);
  const [activeChart, setActiveChart] = useState('分时');
  const [globalTab, setGlobalTab] = useState('自选股');
  const [subTab, setSubTab] = useState('自选股列表');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchPool = useMemo(() => [
    { 证券代码: '000001', 证券名称: '平安银行', 现价: 12.35 },
    { 证券代码: '000333', 证券名称: '美的集团', 现价: 68.90 },
    { 证券代码: '000858', 证券名称: '五粮液', 现价: 158.20 },
    { 证券代码: '002475', 证券名称: '立讯精密', 现价: 35.80 },
    { 证券代码: '300033', 证券名称: '同花顺', 现价: 156.40 },
    { 证券代码: '300124', 证券名称: '汇川技术', 现价: 62.30 },
    { 证券代码: '600900', 证券名称: '长江电力', 现价: 28.60 },
    { 证券代码: '601318', 证券名称: '中国平安', 现价: 52.40 },
    { 证券代码: '601888', 证券名称: '中国中免', 现价: 185.30 },
    { 证券代码: '603259', 证券名称: '药明康德', 现价: 68.45 },
    { 证券代码: '688111', 证券名称: '金山办公', 现价: 420.50 },
    { 证券代码: '688012', 证券名称: '中微公司', 现价: 178.60 },
  ].filter((s) => !watchlist.some((w) => w.证券代码 === s.证券代码)), [watchlist]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return searchPool;
    const q = searchQuery.trim().toLowerCase();
    return searchPool.filter((s) => s.证券代码.includes(q) || s.证券名称.toLowerCase().includes(q));
  }, [searchQuery, searchPool]);

  const handleAddStock = (item: { 证券代码: string; 证券名称: string; 现价: number }) => {
    const newStock: WatchStock = {
      序号: watchlist.length + 1,
      证券代码: item.证券代码,
      证券名称: item.证券名称,
      现价: item.现价,
      涨幅: parseFloat((Math.random() * 8 - 3).toFixed(2)),
      涨跌: parseFloat((Math.random() * 4 - 2).toFixed(2)),
      涨速: parseFloat((Math.random() * 3 - 1).toFixed(2)),
      换手: parseFloat((Math.random() * 5).toFixed(2)),
      自选日: new Date().toISOString().slice(0, 10),
      自选价格: item.现价,
      自选收益: 0,
      最高: item.现价 * 1.05,
      最低: item.现价 * 0.95,
    };
    setWatchlist([...watchlist, newStock]);
    setSelectedStock(newStock);
    setSearchQuery('');
    setShowAddModal(false);
  };

  const chartTabs = ['分时', '五日', '日线', '周线', '月线', '年线', '60分', '30分', '15分', '5分'];
  const detailTabs = ['资金流向', '关联板块', '成份股'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-primary-nav border-b border-gray-700">
        <div className="flex items-center px-3 py-1.5 gap-1">
          {['自选股', '持股'].map((t) => (
            <button key={t} onClick={() => { setGlobalTab(t); setSubTab('自选股列表'); }} className={`px-3 py-1 text-xs rounded ${globalTab===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>
          ))}
          <button className="ml-auto text-secondary hover:text-white"><Plus size={14} /></button>
        </div>
        {globalTab === '自选股' && (
          <div className="flex items-center px-3 py-1 gap-1 border-t border-gray-700/50">
            {['自选股列表', '多股同列'].map((t) => (
              <button key={t} onClick={() => setSubTab(t)} className={`px-3 py-1 text-xs rounded ${subTab===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {subTab === '多股同列' ? (
        <MultiStockView />
      ) : globalTab === '持股' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-5 gap-3 px-4 py-3 bg-primary-nav border-b border-gray-700">
            <div className="text-center"><div className="text-secondary text-[10px]">总市值</div><div className="text-white text-sm font-mono font-semibold">{holdingStocks.reduce((s,h)=>s+h.市值,0).toLocaleString()}</div></div>
            <div className="text-center"><div className="text-secondary text-[10px]">总盈亏</div><div className={`text-sm font-mono font-semibold ${holdingStocks.reduce((s,h)=>s+h.盈亏,0)>=0?'text-up':'text-down'}`}>{holdingStocks.reduce((s,h)=>s+h.盈亏,0)>=0?'+':''}{holdingStocks.reduce((s,h)=>s+h.盈亏,0).toLocaleString()}</div></div>
            <div className="text-center"><div className="text-secondary text-[10px]">持仓品种</div><div className="text-white text-sm font-mono font-semibold">{holdingStocks.length}</div></div>
            <div className="text-center"><div className="text-secondary text-[10px]">盈利品种</div><div className="text-up text-sm font-mono font-semibold">{holdingStocks.filter(h=>h.盈亏>0).length}</div></div>
            <div className="text-center"><div className="text-secondary text-[10px]">亏损品种</div><div className="text-down text-sm font-mono font-semibold">{holdingStocks.filter(h=>h.盈亏<0).length}</div></div>
          </div>
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-primary-nav z-10">
                <tr className="text-secondary">{holdingColumns.map(c=><th key={c} className="py-1.5 px-1.5 text-left font-normal whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody>
                {holdingStocks.map((s,idx)=>(
                  <tr key={s.证券代码} onClick={()=>setSelectedHolding(s)} className={`cursor-pointer border-b border-gray-800 ${idx%2===0?'bg-primary-bg':'bg-primary-chart'} hover:bg-gray-700/50 ${selectedHolding.证券代码===s.证券代码?'bg-primary-chart border-l-2 border-l-yellow-500':''}`}>
                    <td className="py-1.5 px-1.5 text-secondary font-mono">{s.序号}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.证券代码}</td><td className="py-1.5 px-1.5 text-neutral">{s.证券名称}</td><td className={`py-1.5 px-1.5 font-mono font-semibold ${s.今日涨幅>=0?'text-up':'text-down'}`}>{s.现价.toFixed(2)}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.持仓数量.toLocaleString()}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.成本价.toFixed(2)}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.市值.toLocaleString()}</td><td className={`py-1.5 px-1.5 font-mono ${s.盈亏>=0?'text-up':'text-down'}`}>{s.盈亏>=0?'+':''}{s.盈亏.toLocaleString()}</td><td className={`py-1.5 px-1.5 font-mono ${s.盈亏率>=0?'text-up':'text-down'}`}>{s.盈亏率>=0?'+':''}{s.盈亏率.toFixed(2)}%</td><td className={`py-1.5 px-1.5 font-mono ${s.今日涨幅>=0?'text-up':'text-down'}`}>{s.今日涨幅>=0?'+':''}{s.今日涨幅.toFixed(2)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-primary-nav border-b border-gray-700">
                <span className="text-white text-xs font-semibold">自选股({watchlist.length})</span>
                <button className="text-secondary hover:text-white" onClick={() => setShowAddModal(true)}><Plus size={14} /></button>
              </div>
              <div className="flex-1 overflow-auto scrollbar-thin">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-primary-nav z-10"><tr className="text-secondary">{columns.map(c=><th key={c} className="py-1.5 px-1.5 text-left font-normal whitespace-nowrap">{c}</th>)}</tr></thead>
                  <tbody>
                    {watchlist.map((s,idx)=>(
                      <tr key={s.证券代码} onClick={()=>setSelectedStock(s)} className={`cursor-pointer border-b border-gray-800 ${idx%2===0?'bg-primary-bg':'bg-primary-chart'} hover:bg-gray-700/50 ${selectedStock.证券代码===s.证券代码?'bg-primary-chart border-l-2 border-l-yellow-500':''}`}>
                        <td className="py-1.5 px-1.5 text-secondary font-mono">{s.序号}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.证券代码}</td><td className="py-1.5 px-1.5 text-neutral">{s.证券名称}</td><td className="py-1.5 px-1.5 text-secondary text-[9px]">▁▃▅▇▆</td><td className={`py-1.5 px-1.5 font-mono font-semibold ${s.涨幅>=0?'text-up':'text-down'}`}>{s.现价.toFixed(2)}</td><td className={`py-1.5 px-1.5 font-mono ${s.涨幅>=0?'text-up':'text-down'}`}>{s.涨幅>=0?'+':''}{s.涨幅.toFixed(2)}%</td><td className={`py-1.5 px-1.5 font-mono ${s.涨跌>=0?'text-up':'text-down'}`}>{s.涨跌>=0?'+':''}{s.涨跌.toFixed(2)}</td><td className={`py-1.5 px-1.5 font-mono ${s.涨速>=0?'text-up':'text-down'}`}>{s.涨速>=0?'+':''}{s.涨速.toFixed(2)}%</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.换手.toFixed(2)}%</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.自选日}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.自选价格.toFixed(2)}</td><td className={`py-1.5 px-1.5 font-mono ${s.自选收益>=0?'text-up':'text-down'}`}>{s.自选收益>=0?'+':''}{s.自选收益.toFixed(2)}%</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.最高.toFixed(2)}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.最低.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="w-80 border-l border-gray-700 flex flex-col bg-primary-nav overflow-hidden">
              <div className="p-3 border-b border-gray-700">
                <div className="flex items-center gap-2 mb-2"><span className="text-white font-semibold">{watchDetail.名称}</span><span className="text-secondary text-xs font-mono">{watchDetail.代码}</span>{watchDetail.市场标识.map(t=>(<span key={t} className="px-1 text-[9px] rounded bg-gray-600 text-secondary">{t}</span>))}</div>
                <div className="flex items-end gap-3"><span className="text-up text-2xl font-bold font-mono">{watchDetail.现价.toFixed(2)}</span><div className="flex flex-col"><span className="text-up text-xs font-mono">+{watchDetail.涨跌.toFixed(2)}</span><span className="text-up text-xs font-mono">+{watchDetail.涨跌幅.toFixed(2)}%</span></div></div>
                <p className="text-secondary text-[10px] mt-1">{watchDetail.行情说明}</p>
              </div>
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-700">
                {chartTabs.slice(0,5).map(t=>(<button key={t} onClick={()=>setActiveChart(t)} className={`px-2 py-0.5 text-[10px] rounded ${activeChart===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}
                <span className="text-secondary text-[10px] mx-1">|</span>
                {chartTabs.slice(5).map(t=>(<button key={t} onClick={()=>setActiveChart(t)} className={`px-2 py-0.5 text-[10px] rounded ${activeChart===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}
              </div>
              <div className="h-40 bg-primary-chart p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={minuteChartData}><CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" /><XAxis dataKey="time" tick={{fill:'#8C8F98',fontSize:9}} /><YAxis tick={{fill:'#8C8F98',fontSize:9}} domain={['dataMin-0.5','dataMax+0.5']} /><Tooltip contentStyle={{backgroundColor:'#1E2230',border:'1px solid #3a3f4b',fontSize:10}} /><Area type="monotone" dataKey="price" stroke="#4FC3F7" fill="rgba(79,195,247,0.15)" strokeWidth={1.5} /></AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-1 px-3 py-2 border-b border-gray-700">{detailTabs.map(t=>(<button key={t} className={`px-2 py-0.5 text-[10px] rounded ${t==='资金流向'?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}</div>
              <div className="flex-1 flex items-center justify-center p-3">
                <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={fundFlowData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">{fundFlowData.map((e,i)=>(<Cell key={i} fill={e.color} />))}</Pie></PieChart></ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center text-center"><div><span className="text-up text-base font-bold">0%</span><p className="text-secondary text-[9px]">净流入</p></div></div>
                  <div className="absolute top-0 left-0 right-0 flex justify-between text-[9px] px-2"><span className="text-down">主力流出 17.6%</span><span className="text-up">主力流入 14.2%</span></div>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] px-2"><span className="text-secondary">散户流出 32.4%</span><span className="text-price">散户流入 35.8%</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-7 bg-primary-nav border-t border-gray-700 flex items-center px-3 gap-5 overflow-x-auto scrollbar-thin flex-shrink-0">
            {mockIndices.map(idx=>(<div key={idx.name} className="flex items-center gap-1.5 whitespace-nowrap text-[11px]"><span className="text-secondary">{idx.name}</span><span className="text-neutral font-mono">{idx.value.toFixed(2)}</span><span className={`font-mono ${idx.change>=0?'text-up':'text-down'}`}>{idx.change>=0?'+':''}{idx.change.toFixed(2)}</span><span className={`font-mono ${idx.changePercent>=0?'text-up':'text-down'}`}>{idx.changePercent>=0?'+':''}{idx.changePercent.toFixed(2)}%</span><span className="text-secondary">{idx.volume}</span></div>))}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1A1D23] border border-[#2C303A] rounded-lg w-96 shadow-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
              <span className="text-white text-sm font-semibold">添加自选股</span>
              <button onClick={() => setShowAddModal(false)} className="text-secondary hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-3 border-b border-gray-700/50">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索股票代码或名称..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-xs rounded bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin p-1">
              {searchResults.length === 0 ? (
                <div className="text-center text-secondary text-xs py-8">未找到匹配的股票</div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.证券代码}
                    onClick={() => handleAddStock(item)}
                    className="flex items-center justify-between px-3 py-2 mx-1 rounded hover:bg-gray-700/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-blue-400 text-xs font-mono">{item.证券代码}</span>
                      <span className="text-white text-xs">{item.证券名称}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral text-xs font-mono">{item.现价.toFixed(2)}</span>
                      <span className="text-secondary text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">点击添加</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
