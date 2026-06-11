interface Props {
  onClose: () => void;
  onSelect: (prompt: string) => void;
}

const cards = [
  { title: '板块热点', desc: '分析涨幅前三板块', prompt: '帮我总结今天板块热点表现，分析涨幅前3的板块，包括涨跌幅、成交额和龙头个股' },
  { title: '市场复盘', desc: '指数走势与资金流向', prompt: '帮我分析今日市场整体表现，包括三大指数走势、涨跌家数、北向资金流向和成交量变化' },
  { title: '个股复盘', desc: '涨幅前五个股分析', prompt: '帮我复盘今天涨幅前5的个股，分析它们上涨的原因、技术形态和资金流向' },
  { title: '操作复盘', desc: '交易操作回顾优化', prompt: '帮我总结今日操作情况，分析合理操作与改进建议' },
];

export default function AiReviewModal({ onClose, onSelect }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute bottom-full left-0 right-0 z-50 mb-2 mx-4 bg-[#1A1D23] border border-[#2C303A] rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2C303A]">
          <span className="text-xs font-semibold text-white">选择复盘类型</span>
        </div>
        <div className="grid grid-cols-4 gap-2 p-3">
          {cards.map((card) => (
            <div
              key={card.title}
              onClick={() => onSelect(card.prompt)}
              className="p-2.5 rounded-lg bg-[#242730] border border-gray-700/50 cursor-pointer transition-colors hover:border-blue-500/50 hover:bg-[#2a3040] group"
            >
              <div className="text-xs text-white font-medium mb-0.5 group-hover:text-blue-400 transition-colors">{card.title}</div>
              <div className="text-[10px] text-[#8A919E] leading-relaxed">{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
