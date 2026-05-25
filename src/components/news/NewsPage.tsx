import { newsData } from '../../data/newsData';

export default function NewsPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 bg-primary-nav border-b border-gray-700">
        <h1 className="text-lg font-bold text-blue-400">
          热点解读Ⅱ（定） 主题机会
        </h1>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin bg-primary-bg p-6">
        <div className="space-y-3 mx-auto max-w-5xl">
          {newsData.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded bg-primary-chart border border-gray-700/50 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-secondary text-xs font-mono w-12">
                  {item.时间标记}
                </span>
                <span className="text-neutral font-mono text-sm">{item.代码}</span>
                <span className="text-neutral text-sm font-semibold">{item.名称}</span>
                <span className="text-[#FF8C00] font-mono text-sm font-bold">
                  涨幅: {item.涨幅.toFixed(2)}%
                </span>
                {item.连板信息 && (
                  <span className="text-[#FF8C00] font-mono text-xs font-semibold">
                    {item.连板信息}
                  </span>
                )}
              </div>

              <p className="text-neutral text-sm leading-relaxed ml-24 mb-2">
                {item.业务说明}
              </p>

              <div className="flex gap-2 flex-wrap ml-24">
                {item.题材标签.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded bg-gray-600/50 text-neutral/90"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}