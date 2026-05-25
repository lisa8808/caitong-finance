import { Calendar, Search, ArrowUpDown } from 'lucide-react';
import { HotspotSource } from '../../types/hotspot';

interface Props {
  startDate: string;
  endDate: string;
  source: HotspotSource;
  sortAsc: boolean;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onSourceChange: (v: HotspotSource) => void;
  onSortToggle: () => void;
  onQuery: () => void;
}

export default function HotspotFilter({
  startDate, endDate, source, sortAsc,
  onStartDateChange, onEndDateChange, onSourceChange, onSortToggle, onQuery,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-primary-nav border-b border-gray-700">
      <div className="flex items-center gap-1.5 text-secondary text-xs">
        <Calendar size={14} />
        <input
          type="text"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          placeholder="开始日期"
          className="w-24 px-2 py-1 text-xs rounded bg-primary-bg border border-gray-600 text-neutral focus:outline-none focus:border-gray-400"
        />
        <span className="text-secondary">—</span>
        <input
          type="text"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          placeholder="结束日期"
          className="w-24 px-2 py-1 text-xs rounded bg-primary-bg border border-gray-600 text-neutral focus:outline-none focus:border-gray-400"
        />
      </div>

      <select
        value={source}
        onChange={(e) => onSourceChange(e.target.value as HotspotSource)}
        className="px-2 py-1 text-xs rounded bg-primary-bg border border-gray-600 text-neutral focus:outline-none focus:border-gray-400"
      >
        <option value="全部">来源：可选</option>
        <option value="同花顺">同花顺</option>
        <option value="华尔街见闻">华尔街见闻</option>
        <option value="财新网">财新网</option>
      </select>

      <button
        onClick={onSortToggle}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary-bg border border-gray-600 text-secondary hover:text-white hover:border-gray-400 transition-colors"
      >
        <ArrowUpDown size={12} />
        分值{sortAsc ? '升序' : '降序'}
      </button>

      <button
        onClick={onQuery}
        className="flex items-center gap-1.5 px-4 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        <Search size={12} />
        查询
      </button>
    </div>
  );
}