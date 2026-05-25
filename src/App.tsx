import { useState } from 'react';
import TitleBar from './components/TitleBar';
import NavBar from './components/NavBar';
import SideNav from './components/SideNav';
import StockTable from './components/StockTable';
import StockDetail from './components/StockDetail';
import BottomStatusBar from './components/BottomStatusBar';
import HeatPage from './components/heat/HeatPage';
import SignalNewsPage from './components/SignalNewsPage';
import TradePage from './components/trade/TradePage';
import AiChatPage from './components/ai/AiChatPage';
import WatchlistPage from './components/watchlist/WatchlistPage';
import { mockStocks } from './data/mockData';
import { StockItem } from './types';
import { SideNavItem } from './components/SideNav';

function App() {
  const [selectedStock, setSelectedStock] = useState<StockItem>(mockStocks[0]);
  const [activePage, setActivePage] = useState<SideNavItem>('市场');

  const handleSelectStock = (stock: StockItem) => {
    setSelectedStock(stock);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-primary-bg overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <SideNav active={activePage} onSelect={setActivePage} />
        {activePage === '市场' ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <NavBar />
            <StockTable onSelectStock={handleSelectStock} selectedCode={selectedStock.证券代码} />
          </div>
        ) : activePage === '自选' ? (
          <WatchlistPage />
        ) : activePage === '热度' ? (
          <HeatPage />
        ) : activePage === '信号' ? (
          <SignalNewsPage />
        ) : activePage === '策略' ? (
          <TradePage />
        ) : activePage === '智询' ? (
          <AiChatPage />
        ) : (
          <div className="flex-1 flex items-center justify-center text-secondary text-sm">
            {activePage}模块开发中...
          </div>
        )}
        {activePage === '市场' && <StockDetail stock={selectedStock} />}
      </div>
      <BottomStatusBar />
    </div>
  );
}

export default App;