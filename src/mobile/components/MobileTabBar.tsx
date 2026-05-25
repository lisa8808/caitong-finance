import { ChevronDown } from 'lucide-react';

export type MobilePage = '智询' | '市场' | '自选' | '热度' | '信号' | '策略';

interface Props {
  active: MobilePage;
  onSelect: (page: MobilePage) => void;
}

const tabs: MobilePage[] = ['市场', '自选', '热度', '信号', '智询', '策略'];

export default function MobileTabBar({ active, onSelect }: Props) {
  return (
    <div className="px-3 py-1.5 bg-primary-nav border-b border-gray-700">
      <div className="relative">
        <select
          value={active}
          onChange={(e) => onSelect(e.target.value as MobilePage)}
          className="w-full appearance-none px-3 py-1.5 text-xs rounded bg-primary-bg border border-gray-600 text-white focus:outline-none focus:border-blue-500"
        >
          {tabs.map((tab) => (
            <option key={tab} value={tab}>{tab}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
      </div>
    </div>
  );
}