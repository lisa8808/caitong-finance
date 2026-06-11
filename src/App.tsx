import { useState } from 'react';
import { Bot } from 'lucide-react';
import TitleBar from './components/TitleBar';
import NavBar from './components/NavBar';
import SideNav from './components/SideNav';
import StockTable from './components/StockTable';
import StockDetail from './components/StockDetail';
import BottomStatusBar from './components/BottomStatusBar';
import HeatPage from './components/heat/HeatPage';
import SignalNewsPage from './components/SignalNewsPage';
import TradePage from './components/trade/TradePage';
import TradingPage from './components/trade/TradingPage';
import AccountPage from './components/account/AccountPage';
import AiChatPage from './components/ai/AiChatPage';
import WatchlistPage from './components/watchlist/WatchlistPage';
import MarketAiPanel from './components/MarketAiPanel';
import { mockStocks } from './data/mockData';
import { StockItem } from './types';
import { SideNavItem } from './components/SideNav';

function App() {
  const [selectedStock, setSelectedStock] = useState<StockItem>(mockStocks[0]);
  const [activePage, setActivePage] = useState<SideNavItem>('市场');
  const [showMarketAi, setShowMarketAi] = useState(false);
  const [marketStocks, setMarketStocks] = useState<StockItem[]>(mockStocks);

  const handleSelectStock = (stock: StockItem) => {
    setSelectedStock(stock);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-primary-bg overflow-hidden">
      <TitleBar rightContent={
        (activePage === '市场' || activePage === '自选') ? (
          <button
            onClick={() => setShowMarketAi(!showMarketAi)}
            className={`px-3.5 py-1 text-[11px] rounded-md flex items-center gap-1.5 font-semibold transition-all duration-200 shadow-lg ${
              showMarketAi
                ? 'bg-blue-600 text-white shadow-blue-500/20 ring-1 ring-blue-400/40'
                : 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white hover:from-blue-500 hover:to-indigo-400 hover:shadow-blue-400/30 animate-pulse'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={10} className="text-white" />
            </div>
            智能分析
          </button>
        ) : undefined
      } />
      <div className="flex-1 flex overflow-hidden">
        <SideNav active={activePage} onSelect={setActivePage} />
        {activePage === '市场' ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <NavBar />
            <StockTable onSelectStock={handleSelectStock} selectedCode={selectedStock.证券代码} stocks={showMarketAi ? marketStocks : undefined} />
          </div>
        ) : activePage === '自选' ? (
          <WatchlistPage />
        ) : activePage === '热度' ? (
          <HeatPage />
        ) : activePage === '信号' ? (
          <SignalNewsPage />
        ) : activePage === '策略' ? (
          <TradePage />
        ) : activePage === '交易' ? (
          <TradingPage />
        ) : activePage === '账户' ? (
          <AccountPage />
        ) : activePage === '智询' ? (
          <AiChatPage />
        ) : (
          <div className="flex-1 flex items-center justify-center text-secondary text-sm">
            {activePage}模块开发中...
          </div>
        )}
        {activePage === '市场' && <StockDetail stock={selectedStock} />}
        {(activePage === '市场' || activePage === '自选') && showMarketAi && (
          <MarketAiPanel
            onClose={() => setShowMarketAi(false)}
            onUpdateStocks={setMarketStocks}
          />
        )}
      </div>
      <BottomStatusBar />
    </div>
  );
}

export default App;
