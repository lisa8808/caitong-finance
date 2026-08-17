import { useEffect, useState } from 'react';
import { Plus, X, Search, RefreshCw } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fundFlowData as initialFundFlowData, minuteChartData as initialMinuteChartData, watchDetail as initialWatchDetail } from '../../data/watchlistData';
import { FundFlowItem, WatchDetail, WatchStock, HoldingStock } from '../../types/watchlist';
import { accounts } from '../../data/accountData';
import MultiStockView from './MultiStockView';
import StockDetailPage from '../stock-detail-page/StockDetailPage';
import { getStoredHoldings, getStoredWatchlist, saveStoredWatchlist, StoredWatchItem } from '../../services/watchlistStorage';
import { BoardMemberItem, ChartPoint, loadBoardMembers, loadHoldingStocks, loadRelatedBoards, loadStockChart, loadStockDetail, loadStockMoneyflow, loadWatchStocks, RelatedBoardGroup, searchStocks, StockSearchItem } from '../../services/watchlistService';

const columns = ['序号', '证券代码', '证券名称', 'K线', '现价', '涨幅%', '涨跌', '涨速%', '换手%', '自选日', '自选价格', '自选收益%', '最高', '最低'];
const holdingColumns = ['序号', '账户', '证券代码', '证券名称', '现价', '持仓数量', '成本价', '市值', '盈亏', '盈亏率', '今日涨幅'];
const ALL_ACCOUNTS_ID = 'all';

type AccountHoldingStock = HoldingStock & {
  账户: string;
  accountId: string;
};

function toApiChartPeriod(period: string) {
  const periodMap: Record<string, string> = {
    分时: '1min',
    五日: '5日',
    日线: '日',
    周线: '周',
    月线: '月',
    年线: '年',
    '60分': '60min',
    '30分': '30min',
    '15分': '15min',
    '5分': '5min',
  };
  return periodMap[period] || '1min';
}

function SparklineCell({ stock }: { stock: WatchStock }) {
  const [points, setPoints] = useState<ChartPoint[]>([]);

  useEffect(() => {
    let active = true;
    loadStockChart(stock.证券代码, '日').then((rows) => {
      if (active) setPoints(rows.slice(-24));
    });
    return () => { active = false; };
  }, [stock.证券代码]);

  if (points.length < 2) return <span className="text-secondary">--</span>;

  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const polyline = prices.map((price, index) => {
    const x = index / (prices.length - 1) * 64;
    const y = 16 - (price - min) / range * 14;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp = prices[prices.length - 1] >= prices[0];

  return (
    <svg width="64" height="18" viewBox="0 0 64 18" role="img" aria-label={`${stock.证券名称}近期K线走势`}>
      <polyline points={polyline} fill="none" stroke={isUp ? '#FF4D4F' : '#36C98C'} strokeWidth="1.5" />
    </svg>
  );
}

export default function WatchlistPage() {
  const [storedWatchlist, setStoredWatchlist] = useState<StoredWatchItem[]>(() => getStoredWatchlist());
  const [watchlist, setWatchlist] = useState<WatchStock[]>([]);
  const [holdings, setHoldings] = useState<AccountHoldingStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<WatchStock | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<AccountHoldingStock | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(ALL_ACCOUNTS_ID);
  const [detailStock, setDetailStock] = useState<{ code: string; name: string } | null>(null);
  const [activeChart, setActiveChart] = useState('分时');
  const [globalTab, setGlobalTab] = useState('自选');
  const [subTab, setSubTab] = useState('股票列表');
  const [activeDetailTab, setActiveDetailTab] = useState('资金流向');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchItem[]>([]);
  const [detail, setDetail] = useState<WatchDetail>(initialWatchDetail);
  const [chartData, setChartData] = useState<ChartPoint[]>(initialMinuteChartData);
  const [moneyflow, setMoneyflow] = useState<FundFlowItem[]>(initialFundFlowData);
  const [relatedBoards, setRelatedBoards] = useState<RelatedBoardGroup[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    const loadAccountHoldings = selectedAccountId === ALL_ACCOUNTS_ID
      ? Promise.all(accounts.map(async (account) => {
          const rows = await loadHoldingStocks(getStoredHoldings(account.id));
          return rows.map((row) => ({ ...row, 账户: account.label, accountId: account.id }));
        })).then((groups) => groups.flat().map((row, index) => ({ ...row, 序号: index + 1 })))
      : loadHoldingStocks(getStoredHoldings(selectedAccountId)).then((rows) => {
          const account = accounts.find((item) => item.id === selectedAccountId) || accounts[0];
          return rows.map((row) => ({ ...row, 账户: account.label, accountId: account.id }));
        });
    const [watchStocks, holdingRows] = await Promise.all([loadWatchStocks(storedWatchlist), loadAccountHoldings]);
    setWatchlist(watchStocks);
    setHoldings(holdingRows);
    setSelectedStock((current) => watchStocks.find((stock) => stock.证券代码 === current?.证券代码) || watchStocks[0] || null);
    setSelectedHolding((current) => holdingRows.find((stock) => stock.accountId === current?.accountId && stock.证券代码 === current?.证券代码) || holdingRows[0] || null);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [storedWatchlist, selectedAccountId]);

  useEffect(() => {
    if (!selectedStock) return;
    let ignore = false;
    setIsDetailLoading(true);
    Promise.all([
      loadStockDetail(selectedStock.证券代码),
      loadStockChart(selectedStock.证券代码, toApiChartPeriod(activeChart)),
      loadStockMoneyflow(selectedStock.证券代码),
      loadRelatedBoards(selectedStock.证券代码),
      loadBoardMembers(selectedStock.证券代码),
    ]).then(([nextDetail, nextChartData, nextMoneyflow, nextRelatedBoards, nextBoardMembers]) => {
      if (ignore) return;
      setDetail(nextDetail);
      setChartData(nextChartData);
      setMoneyflow(nextMoneyflow);
      setRelatedBoards(nextRelatedBoards);
      setBoardMembers(nextBoardMembers);
    }).finally(() => {
      if (!ignore) setIsDetailLoading(false);
    });
    return () => { ignore = true; };
  }, [activeChart, selectedStock]);

  useEffect(() => {
    if (!showAddModal) return;
    let ignore = false;
    setIsSearching(true);
    searchStocks(searchQuery, storedWatchlist.map((stock) => stock.证券代码)).then((items) => {
      if (!ignore) setSearchResults(items);
    }).finally(() => {
      if (!ignore) setIsSearching(false);
    });
    return () => { ignore = true; };
  }, [searchQuery, showAddModal, storedWatchlist]);

  const handleAddStock = async (item: { 证券代码: string; 证券名称: string; 现价: number }) => {
    const nextStored = [...storedWatchlist, {
      证券代码: item.证券代码,
      证券名称: item.证券名称,
      自选日: new Date().toISOString().slice(0, 10),
      自选价格: item.现价,
    }];
    saveStoredWatchlist(nextStored);
    setStoredWatchlist(nextStored);
    setSearchQuery('');
    setShowAddModal(false);
  };

  const chartTabs = ['分时', '五日', '日线', '周线', '月线', '年线', '60分', '30分', '15分', '5分'];
  const detailTabs = ['资金流向', '关联板块', '成份股'];

  if (detailStock) {
    return <StockDetailPage code={detailStock.code} name={detailStock.name} onBack={() => setDetailStock(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-primary-nav border-b border-gray-700">
        <div className="flex items-center px-3 py-1.5 gap-1">
          {['自选', '持仓'].map((t) => (
            <button key={t} onClick={() => { setGlobalTab(t); setSubTab('股票列表'); }} className={`px-3 py-1 text-xs rounded ${globalTab===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>
          ))}
        </div>
        {globalTab === '自选' && (
          <div className="flex items-center px-3 py-1 gap-1 border-t border-gray-700/50">
            {['股票列表', '多股同列'].map((t) => (
              <button key={t} onClick={() => setSubTab(t)} className={`px-3 py-1 text-xs rounded ${subTab===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>
            ))}
            <button className="ml-auto text-secondary hover:text-white" onClick={refreshData} disabled={isLoading}><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /></button>
            <button className="text-secondary hover:text-white" onClick={() => setShowAddModal(true)}><Plus size={14} /></button>
          </div>
        )}
      </div>

      {subTab === '多股同列' ? (
        <MultiStockView stocks={watchlist} />
      ) : globalTab === '持仓' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-2 bg-primary-nav border-b border-gray-700/50 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => setSelectedAccountId(ALL_ACCOUNTS_ID)}
              className={`shrink-0 px-3 py-1 text-xs rounded ${selectedAccountId===ALL_ACCOUNTS_ID?'bg-blue-600 text-white':'text-secondary hover:text-white hover:bg-gray-700/50'}`}
            >
              全部
            </button>
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={`shrink-0 px-3 py-1 text-xs rounded ${selectedAccountId===account.id?'bg-blue-600 text-white':'text-secondary hover:text-white hover:bg-gray-700/50'}`}
              >
                {account.label}
              </button>
            ))}
            <button className="ml-auto shrink-0 text-secondary hover:text-white" onClick={refreshData} disabled={isLoading}><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /></button>
          </div>
          <div className="grid grid-cols-5 gap-3 px-4 py-3 bg-primary-nav border-b border-gray-700">
            <div className="text-center"><div className="text-secondary text-[10px]">总市值</div><div className="text-white text-sm font-mono font-semibold">{holdings.reduce((s,h)=>s+h.市值,0).toLocaleString()}</div></div>
            <div className="text-center"><div className="text-secondary text-[10px]">总盈亏</div><div className={`text-sm font-mono font-semibold ${holdings.reduce((s,h)=>s+h.盈亏,0)>=0?'text-up':'text-down'}`}>{holdings.reduce((s,h)=>s+h.盈亏,0)>=0?'+':''}{holdings.reduce((s,h)=>s+h.盈亏,0).toLocaleString()}</div></div>
            <div className="text-center"><div className="text-secondary text-[10px]">持仓品种</div><div className="text-white text-sm font-mono font-semibold">{holdings.length}</div></div>
            <div className="text-center"><div className="text-secondary text-[10px]">盈利品种</div><div className="text-up text-sm font-mono font-semibold">{holdings.filter(h=>h.盈亏>0).length}</div></div>
            <div className="text-center"><div className="text-secondary text-[10px]">亏损品种</div><div className="text-down text-sm font-mono font-semibold">{holdings.filter(h=>h.盈亏<0).length}</div></div>
          </div>
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-primary-nav z-10">
                <tr className="text-secondary">{holdingColumns.map(c=><th key={c} className="py-1.5 px-1.5 text-left font-normal whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody>
                {holdings.map((s,idx)=>(
                  <tr key={`${s.accountId}-${s.证券代码}`} onClick={()=>setDetailStock({ code: s.证券代码, name: s.证券名称 })} className={`cursor-pointer border-b border-gray-800 ${idx%2===0?'bg-primary-bg':'bg-primary-chart'} hover:bg-gray-700/50 ${selectedHolding?.accountId===s.accountId && selectedHolding?.证券代码===s.证券代码?'bg-primary-chart border-l-2 border-l-yellow-500':''}`}>
                    <td className="py-1.5 px-1.5 text-secondary font-mono">{s.序号}</td><td className="py-1.5 px-1.5 text-neutral whitespace-nowrap">{s.账户}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.证券代码}</td><td className="py-1.5 px-1.5 text-neutral">{s.证券名称}</td><td className={`py-1.5 px-1.5 font-mono font-semibold ${s.今日涨幅>=0?'text-up':'text-down'}`}>{s.现价.toFixed(2)}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.持仓数量.toLocaleString()}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.成本价.toFixed(2)}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.市值.toLocaleString()}</td><td className={`py-1.5 px-1.5 font-mono ${s.盈亏>=0?'text-up':'text-down'}`}>{s.盈亏>=0?'+':''}{s.盈亏.toLocaleString()}</td><td className={`py-1.5 px-1.5 font-mono ${s.盈亏率>=0?'text-up':'text-down'}`}>{s.盈亏率>=0?'+':''}{s.盈亏率.toFixed(2)}%</td><td className={`py-1.5 px-1.5 font-mono ${s.今日涨幅>=0?'text-up':'text-down'}`}>{s.今日涨幅>=0?'+':''}{s.今日涨幅.toFixed(2)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-auto scrollbar-thin">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-primary-nav z-10"><tr className="text-secondary">{columns.map(c=><th key={c} className="py-1.5 px-1.5 text-left font-normal whitespace-nowrap">{c}</th>)}</tr></thead>
                  <tbody>
                    {watchlist.map((s,idx)=>(
                      <tr key={s.证券代码} onClick={()=>setDetailStock({ code: s.证券代码, name: s.证券名称 })} className={`cursor-pointer border-b border-gray-800 ${idx%2===0?'bg-primary-bg':'bg-primary-chart'} hover:bg-gray-700/50 ${selectedStock?.证券代码===s.证券代码?'bg-primary-chart border-l-2 border-l-yellow-500':''}`}>
                        <td className="py-1.5 px-1.5 text-secondary font-mono">{s.序号}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.证券代码}</td><td className="py-1.5 px-1.5 text-neutral">{s.证券名称}</td><td className="py-1.5 px-1.5"><SparklineCell stock={s} /></td><td className={`py-1.5 px-1.5 font-mono font-semibold ${s.涨幅>=0?'text-up':'text-down'}`}>{s.现价.toFixed(2)}</td><td className={`py-1.5 px-1.5 font-mono ${s.涨幅>=0?'text-up':'text-down'}`}>{s.涨幅>=0?'+':''}{s.涨幅.toFixed(2)}%</td><td className={`py-1.5 px-1.5 font-mono ${s.涨跌>=0?'text-up':'text-down'}`}>{s.涨跌>=0?'+':''}{s.涨跌.toFixed(2)}</td><td className={`py-1.5 px-1.5 font-mono ${s.涨速>=0?'text-up':'text-down'}`}>{s.涨速>=0?'+':''}{s.涨速.toFixed(2)}%</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.换手.toFixed(2)}%</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.自选日}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.自选价格.toFixed(2)}</td><td className={`py-1.5 px-1.5 font-mono ${s.自选收益>=0?'text-up':'text-down'}`}>{s.自选收益>=0?'+':''}{s.自选收益.toFixed(2)}%</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.最高.toFixed(2)}</td><td className="py-1.5 px-1.5 text-neutral font-mono">{s.最低.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="w-80 border-l border-gray-700 flex flex-col bg-primary-nav overflow-hidden">
              <div className="p-3 border-b border-gray-700">
                <div className="flex items-center gap-2 mb-2"><span className="text-white font-semibold">{detail.名称}</span><span className="text-secondary text-xs font-mono">{detail.代码}</span>{detail.市场标识.map(t=>(<span key={t} className="px-1 text-[9px] rounded bg-gray-600 text-secondary">{t}</span>))}</div>
                <div className="flex items-end gap-3"><span className={`${detail.涨跌幅>=0?'text-up':'text-down'} text-2xl font-bold font-mono`}>{detail.现价.toFixed(2)}</span><div className="flex flex-col"><span className={`${detail.涨跌>=0?'text-up':'text-down'} text-xs font-mono`}>{detail.涨跌>=0?'+':''}{detail.涨跌.toFixed(2)}</span><span className={`${detail.涨跌幅>=0?'text-up':'text-down'} text-xs font-mono`}>{detail.涨跌幅>=0?'+':''}{detail.涨跌幅.toFixed(2)}%</span></div></div>
                <p className="text-secondary text-[10px] mt-1">{isDetailLoading ? '正在同步东方财富最新数据...' : detail.行情说明}</p>
              </div>
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-700">
                {chartTabs.slice(0,5).map(t=>(<button key={t} onClick={()=>setActiveChart(t)} className={`px-2 py-0.5 text-[10px] rounded ${activeChart===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}
                <span className="text-secondary text-[10px] mx-1">|</span>
                {chartTabs.slice(5).map(t=>(<button key={t} onClick={()=>setActiveChart(t)} className={`px-2 py-0.5 text-[10px] rounded ${activeChart===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}
              </div>
              <div className="h-40 bg-primary-chart p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" /><XAxis dataKey="time" tick={{fill:'#8C8F98',fontSize:9}} /><YAxis tick={{fill:'#8C8F98',fontSize:9}} domain={['dataMin-0.5','dataMax+0.5']} /><Tooltip contentStyle={{backgroundColor:'#1E2230',border:'1px solid #3a3f4b',fontSize:10}} /><Area type="monotone" dataKey="price" stroke="#4FC3F7" fill="rgba(79,195,247,0.15)" strokeWidth={1.5} /></AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-1 px-3 py-2 border-b border-gray-700">{detailTabs.map(t=>(<button key={t} onClick={() => setActiveDetailTab(t)} className={`px-2 py-0.5 text-[10px] rounded ${activeDetailTab===t?'bg-gray-600 text-white':'text-secondary hover:text-white'}`}>{t}</button>))}</div>
              <div className="flex-1 p-3 overflow-auto scrollbar-thin">
                {activeDetailTab === '资金流向' ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="relative w-40 h-40">
                      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={moneyflow} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">{moneyflow.map((e,i)=>(<Cell key={i} fill={e.color} />))}</Pie></PieChart></ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center text-center"><div><span className="text-up text-base font-bold">{(moneyflow[0]?.value || 0).toFixed(1)}%</span><p className="text-secondary text-[9px]">主力流入</p></div></div>
                      <div className="absolute top-0 left-0 right-0 flex justify-between text-[9px] px-2"><span className="text-down">主力流出 {(moneyflow[1]?.value || 0).toFixed(1)}%</span><span className="text-up">主力流入 {(moneyflow[0]?.value || 0).toFixed(1)}%</span></div>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] px-2"><span className="text-secondary">散户流出 {(moneyflow[3]?.value || 0).toFixed(1)}%</span><span className="text-price">散户流入 {(moneyflow[2]?.value || 0).toFixed(1)}%</span></div>
                    </div>
                  </div>
                ) : activeDetailTab === '关联板块' ? (
                  relatedBoards.some((group) => group.items.length > 0) ? (
                    <div className="space-y-3">
                      {relatedBoards.map((group) => (
                        <div key={group.category}>
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-white text-[11px] font-semibold">{group.category}</h4>
                            <span className="text-secondary text-[10px]">{group.items.length}</span>
                          </div>
                          {group.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {group.items.map((board) => {
                                const pctChange = board.pctChange || 0;
                                return (
                                  <span key={board.id} className="rounded border border-gray-700 bg-primary-chart px-2 py-1 text-[10px] text-neutral inline-flex items-center gap-1.5">
                                    <span>{board.name}</span>
                                    <span className={`font-mono ${pctChange>=0?'text-up':'text-down'}`}>{pctChange>=0?'+':''}{pctChange.toFixed(2)}%</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-secondary text-[10px]">暂无数据</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-secondary text-xs py-8">暂无关联板块数据</div>
                  )
                ) : boardMembers.length > 0 ? (
                  <table className="w-full text-[10px]">
                    <thead className="text-secondary border-b border-gray-700">
                      <tr><th className="py-1 text-left font-normal">代码</th><th className="py-1 text-left font-normal">名称</th><th className="py-1 text-right font-normal">最新</th><th className="py-1 text-right font-normal">涨幅</th></tr>
                    </thead>
                    <tbody>
                      {boardMembers.map((member) => (
                        <tr key={`${member.boardName}-${member.code}`} className="border-b border-gray-800">
                          <td className="py-1.5 text-secondary font-mono">{member.code}</td>
                          <td className="py-1.5 text-neutral truncate max-w-[72px]">{member.name}</td>
                          <td className="py-1.5 text-right text-neutral font-mono">{member.price.toFixed(2)}</td>
                          <td className={`py-1.5 text-right font-mono ${member.pctChange>=0?'text-up':'text-down'}`}>{member.pctChange>=0?'+':''}{member.pctChange.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center text-secondary text-xs py-8">暂无成份股数据</div>
                )}
              </div>
            </div>
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
              {isSearching ? (
                <div className="text-center text-secondary text-xs py-8">正在搜索...</div>
              ) : searchResults.length === 0 ? (
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
