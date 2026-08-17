import { useEffect, useState } from 'react';
import { MarketIndexBundle, loadMarketIndices } from '../services/marketIndexService';

function formatAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return '--';
  return `${Math.round(amount / 100_000_000)}亿`;
}

export default function BottomStatusBar() {
  const [bundle, setBundle] = useState<MarketIndexBundle | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      try {
        const data = await loadMarketIndices();
        if (!disposed) {
          setBundle(data);
          setError('');
        }
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : '指数行情加载失败');
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="h-7 bg-primary-nav border-t border-gray-700 flex items-center px-4 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-6">
        {bundle?.indices.map((index) => (
          <div key={index.name} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-secondary text-xs">{index.name}</span>
            <span className="text-neutral text-xs font-mono">{index.value.toFixed(2)}</span>
            <span className={`text-xs font-mono ${index.change >= 0 ? 'text-up' : 'text-down'}`}>
              {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}
            </span>
            <span className={`text-xs font-mono ${index.changePercent >= 0 ? 'text-up' : 'text-down'}`}>
              {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
            </span>
            <span className="text-secondary text-xs">{formatAmount(index.amount)}</span>
          </div>
        ))}
        {!bundle && <span className="text-secondary text-xs">{error || '实时指数加载中…'}</span>}
        {bundle && (
          <span
            className={`whitespace-nowrap text-[10px] ${bundle.isFallback ? 'text-yellow-400' : 'text-secondary'}`}
            title={`更新时间 ${new Date(bundle.updatedAt).toLocaleTimeString('zh-CN', { hour12: false })}`}
          >
            {bundle.source} · {new Date(bundle.updatedAt).toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
        )}
      </div>
    </div>
  );
}
