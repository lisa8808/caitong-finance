import { useState } from 'react';
import HotspotPage from './hotspot/HotspotPage';
import NewsPage from './news/NewsPage';

export default function SignalNewsPage() {
  const [activeTab, setActiveTab] = useState<'信号' | '资讯'>('信号');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center px-4 py-2 bg-primary-nav border-b border-gray-700 gap-1">
        {(['信号', '资讯'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded transition-colors ${
              activeTab === tab ? 'bg-gray-600 text-white' : 'text-secondary hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === '信号' ? <HotspotPage /> : <NewsPage />}
    </div>
  );
}