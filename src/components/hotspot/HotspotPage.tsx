import { useState, useMemo } from 'react';
import HotspotFilter from './HotspotFilter';
import HotspotTable from './HotspotTable';
import { hotspotData } from '../../data/hotspotData';
import { HotspotItem, HotspotSource } from '../../types/hotspot';

function deduplicate(data: HotspotItem[]): HotspotItem[] {
  const seen = new Set<string>();
  return data.filter((item) => {
    if (item.是否重复) return false;
    if (seen.has(item.标题)) return false;
    seen.add(item.标题);
    return true;
  });
}

export default function HotspotPage() {
  const [startDate, setStartDate] = useState('2026/05/20');
  const [endDate, setEndDate] = useState('2026/05/21');
  const [source, setSource] = useState<HotspotSource>('全部');
  const [sortAsc, setSortAsc] = useState(false);
  const [baseData, setBaseData] = useState<HotspotItem[]>(() => deduplicate(hotspotData));

  const filteredData = useMemo(() => {
    let result = [...baseData];
    result.sort((a, b) => sortAsc ? a.情感打分 - b.情感打分 : b.情感打分 - a.情感打分);
    return result;
  }, [baseData, sortAsc]);

  const handleQuery = () => {
    let result = deduplicate(hotspotData).filter((item) => {
      const itemDate = item.发布时间.slice(0, 10).replace(/-/g, '/');
      const s = startDate.replace(/-/g, '/');
      const e = endDate.replace(/-/g, '/');
      if (itemDate < s || itemDate > e) return false;
      if (source !== '全部' && item.来源 !== source) return false;
      return true;
    });
    setBaseData(result);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <HotspotFilter
        startDate={startDate}
        endDate={endDate}
        source={source}
        sortAsc={sortAsc}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSourceChange={setSource}
        onSortToggle={() => setSortAsc(!sortAsc)}
        onQuery={handleQuery}
      />
      <HotspotTable data={filteredData} />
    </div>
  );
}