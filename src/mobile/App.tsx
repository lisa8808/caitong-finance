import { useState } from 'react';
import MobileTabBar, { MobilePage } from './components/MobileTabBar';
import HeatPage from '../components/heat/HeatPage';
import SignalNewsPage from '../components/SignalNewsPage';
import AiChatPage from '../components/ai/AiChatPage';
import TradePage from '../components/trade/TradePage';
import WatchlistPage from '../components/watchlist/WatchlistPage';
import StockTable from '../components/StockTable';
import StockDetail from '../components/StockDetail';
import NavBar from '../components/NavBar';
import BottomStatusBar from '../components/BottomStatusBar';
import { mockStocks } from '../data/mockData';
import { StockItem } from '../types';

export default function MobileApp() {
  const [activePage, setActivePage] = useState<MobilePage>('市场');
  const [selectedStock, setSelectedStock] = useState<StockItem>(mockStocks[0]);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-primary-bg overflow-hidden">
      <div className="h-10 bg-primary-nav flex items-center px-3 border-b border-gray-700 flex-shrink-0">
        <div className="w-5 h-5 rounded bg-up flex items-center justify-center mr-2">
          <span className="text-[10px] font-bold text-white">C</span>
        </div>
        <span className="text-sm font-semibold text-white">财瞳金融终端</span>
      </div>

      <MobileTabBar active={activePage} onSelect={(p) => { setActivePage(p); setShowDetail(false); }} />

      <div className="flex-1 overflow-hidden">
        {activePage === '市场' && (
          showDetail ? (
            <div className="flex-1 overflow-auto scrollbar-thin p-3">
              <button onClick={() => setShowDetail(false)} className="text-xs text-blue-400 mb-3">← 返回</button>
              <StockDetail stock={selectedStock} />
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <NavBar />
              <StockTable onSelectStock={(s) => { setSelectedStock(s); setShowDetail(true); }} selectedCode={selectedStock.证券代码} />
            </div>
          )
        )}
        {activePage === '自选' && <WatchlistPage />}
        {activePage === '热度' && <HeatPage />}
        {activePage === '信号' && <SignalNewsPage />}
        {activePage === '智询' && <AiChatPage />}
        {activePage === '策略' && <TradePage />}
      </div>

      {activePage === '市场' && <BottomStatusBar />}
    </div>
  );
}