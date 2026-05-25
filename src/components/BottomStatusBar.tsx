import { mockIndices } from '../data/mockData';

export default function BottomStatusBar() {
  return (
    <div className="h-7 bg-primary-nav border-t border-gray-700 flex items-center px-4 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-6">
        {mockIndices.map((index) => (
          <div key={index.name} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-secondary text-xs">{index.name}</span>
            <span className="text-neutral text-xs font-mono">{index.value.toFixed(2)}</span>
            <span className={`text-xs font-mono ${index.change >= 0 ? 'text-up' : 'text-down'}`}>
              {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}
            </span>
            <span className={`text-xs font-mono ${index.changePercent >= 0 ? 'text-up' : 'text-down'}`}>
              {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
            </span>
            <span className="text-secondary text-xs">{index.volume}</span>
          </div>
        ))}
      </div>
    </div>
  );
}