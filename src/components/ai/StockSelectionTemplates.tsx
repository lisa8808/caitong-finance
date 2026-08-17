export interface StockSelectionTemplate {
  title: string;
  desc: string;
  prompt: string;
  factors: string;
}

interface Props {
  onClose: () => void;
  onSelect: (template: StockSelectionTemplate) => void;
}

const templates: StockSelectionTemplate[] = [
  {
    title: '低估值高成长',
    desc: '兼顾估值与营收增速',
    prompt: '帮我筛选PE低于20且营收同比增长超过20%的A股',
    factors: 'PE < 20 · 营收增长 > 20%',
  },
  {
    title: '优质高ROE',
    desc: '筛选盈利能力较强标的',
    prompt: '帮我筛选ROE高于15%的A股',
    factors: 'ROE > 15%',
  },
  {
    title: '低估值电子',
    desc: '聚焦电子产业低估值公司',
    prompt: '帮我筛选PE低于20的电子股',
    factors: '电子行业 · PE < 20',
  },
  {
    title: '成长半导体',
    desc: '关注营收保持较快增长公司',
    prompt: '帮我筛选营收同比增长超过30%的半导体股',
    factors: '半导体 · 营收增长 > 30%',
  },
];

export default function StockSelectionTemplates({ onClose, onSelect }: Props) {
  return (
    <>
      <button type="button" aria-label="关闭标的筛选模板" className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <section className="absolute bottom-full left-0 right-0 z-50 mx-4 mb-2 overflow-hidden rounded-lg border border-[#2C303A] bg-[#1A1D23] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2C303A] px-3 py-2">
          <div>
            <div className="text-xs font-semibold text-white">选择标的筛选模板</div>
            <div className="mt-0.5 text-[10px] text-[#8A919E]">点击后立即按真实市场数据执行</div>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-white/5 hover:text-white">
            取消
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          {templates.map((template) => (
            <button
              type="button"
              key={template.title}
              onClick={() => onSelect(template)}
              className="rounded-lg border border-gray-700/50 bg-[#242730] p-2.5 text-left transition-colors hover:border-blue-500/50 hover:bg-[#2a3040] group"
            >
              <div className="mb-0.5 text-xs font-medium text-white transition-colors group-hover:text-blue-400">{template.title}</div>
              <div className="text-[10px] leading-relaxed text-[#8A919E]">{template.desc}</div>
              <div className="mt-2 text-[9px] text-blue-400/80">{template.factors}</div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
