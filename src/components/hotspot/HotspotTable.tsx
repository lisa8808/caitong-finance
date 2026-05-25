import { HotspotItem } from '../../types/hotspot';

interface Props {
  data: HotspotItem[];
}

function stripHtml(html: string): string {
  const text = html.replace(/<[^>]+>/g, '');
  return text.length > 60 ? text.slice(0, 60) + '...' : text;
}

const tagColors: Record<string, string> = {
  '重复': 'text-red-400 border-red-500/30',
  '情感': 'text-blue-400 border-blue-500/30',
  '行业': 'text-green-400 border-green-500/30',
  '概念': 'text-purple-400 border-purple-500/30',
  '标的': 'text-cyan-400 border-cyan-500/30',
};

const tagBgColors: Record<string, string> = {
  '重复': 'bg-red-500/10',
  '情感': 'bg-blue-500/10',
  '行业': 'bg-green-500/10',
  '概念': 'bg-purple-500/10',
  '标的': 'bg-cyan-500/10',
};

export default function HotspotTable({ data }: Props) {
  return (
    <div className="flex-1 overflow-auto scrollbar-thin bg-primary-bg">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-primary-nav">
          <tr className="text-secondary">
            <th className="py-2 px-2 text-left font-normal w-10">#</th>
            <th className="py-2 px-2 text-left font-normal">标题</th>
            <th className="py-2 px-2 text-left font-normal w-[30%]">内容</th>
            <th className="py-2 px-2 text-left font-normal">标签信息</th>
            <th className="py-2 px-2 text-left font-normal">来源</th>
            <th className="py-2 px-2 text-left font-normal whitespace-nowrap">发布时间</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={`${item.id}-${idx}`}
              className={`border-b border-gray-800 transition-colors hover:bg-gray-700/30 ${
                idx % 2 === 0 ? 'bg-primary-bg' : 'bg-primary-chart'
              }`}
            >
              <td className="py-2 px-2 text-secondary font-mono align-top">{item.id}</td>
              <td className="py-2 px-2 text-neutral align-top leading-relaxed">{item.标题}</td>
              <td className="py-2 px-2 text-secondary leading-relaxed align-top">
                {stripHtml(item.内容)}
              </td>
              <td className="py-2 px-2 align-top">
                <div className="flex gap-1 flex-wrap">
                  <span className={`px-1.5 py-0.5 text-[10px] rounded border ${item.情感打分 < 0 ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>
                    {item.情感打分}分
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded border ${tagColors['行业']} ${tagBgColors['行业']}`}>
                    {item.行业名称}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded border ${tagColors['概念']} ${tagBgColors['概念']}`}>
                    {item.概念名称}
                  </span>
                  {item.标的名称 && (
                    <span className={`px-1.5 py-0.5 text-[10px] rounded border ${tagColors['标的']} ${tagBgColors['标的']}`}>
                      {item.标的名称}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 px-2 text-secondary whitespace-nowrap align-top">{item.来源}</td>
              <td className="py-2 px-2 text-secondary font-mono whitespace-nowrap align-top">
                {item.发布时间}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}