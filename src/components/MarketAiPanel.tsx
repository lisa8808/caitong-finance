import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Loader2, TrendingUp, ArrowUpDown, Gauge, Zap } from 'lucide-react';
import { StockItem } from '../types';
import { mockStocks } from '../data/mockData';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

interface Props {
  onClose: () => void;
  onUpdateStocks: (stocks: StockItem[]) => void;
}

const suggestQuestions = [
  { label: '涨幅领先', prompt: '帮我筛选涨幅最高的股票', icon: TrendingUp },
  { label: '异动排行', prompt: '今天港股通板块有什么异动？', icon: ArrowUpDown },
  { label: '换手活跃', prompt: '换手率最活跃的标的有哪些？', icon: Gauge },
  { label: '三连板', prompt: '近期三连板涨停的股票有哪些？', icon: Zap },
];

const botReplies: Record<string, { text: string; action?: (stocks: StockItem[]) => StockItem[] }> = {
  涨幅: {
    text: '已为您按涨幅从高到低排序。涨幅领先的标的资金关注度高，建议结合换手率判断上涨质量。',
    action: (stocks) => [...stocks].sort((a, b) => b.涨幅 - a.涨幅),
  },
  异动: {
    text: '已截取今日波动最剧烈的5只标的。异动股票往往伴随重大消息，请注意甄别利好与利空。',
    action: (stocks) => { const sorted = [...stocks].sort((a, b) => Math.abs(b.涨跌) - Math.abs(a.涨跌)); return sorted.slice(0, 5); },
  },
  换手: {
    text: '已按换手率从高到低排序。高换手通常意味着交投活跃，但也需警惕筹码快速易手的风险。',
    action: (stocks) => [...stocks].sort((a, b) => b.换手 - a.换手),
  },
  连板: {
    text: '已筛选近期连续涨停的强势标的。三连板个股通常具备较强的市场合力和题材催化，建议关注封板力度和次日溢价情况，追高需谨慎。',
    action: (stocks) => [...stocks].sort((a, b) => b.涨幅 - a.涨幅).slice(0, 3),
  },
  跌幅: {
    text: '已按跌幅从大到小排序。请关注下跌标的的基本面变化，设置合理止损位。',
    action: (stocks) => [...stocks].sort((a, b) => a.涨幅 - b.涨幅),
  },
  涨速: {
    text: '已按涨速排序。涨速反映短线资金动向，适合短线交易参考。',
    action: (stocks) => [...stocks].sort((a, b) => b.涨速 - a.涨速),
  },
  量比: {
    text: '已按量比排序。量比大于1表明当前成交量高于近期均值，资金活跃度提升。',
    action: (stocks) => [...stocks].filter((s) => s.量比 > 1).sort((a, b) => b.量比 - a.量比),
  },
  策略: {
    text: '当前建议采取「核心+卫星」配置策略：核心仓位配置港股通ETF，卫星仓位关注科技股+制造业龙头。',
    action: (stocks) => { const targetNames = ['腾讯控股', '小米集团', '京东健康', '舜宇光学科技']; return stocks.filter((s) => targetNames.some((n) => s.证券名称.includes(n))); },
  },
  default: {
    text: '基于当前港股通数据，建议关注涨幅稳健、换手适中的标的。您可以尝试点击下方的推荐问题快速筛选。',
  },
};

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export default function MarketAiPanel({ onClose, onUpdateStocks }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '您好！我是智询助手。点击下方推荐问题可快速筛选股票，也可以直接输入问题。', time: now() },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { role, content, time: now() }]);
  };

  const matchReply = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('连板') || lower.includes('涨停') || lower.includes('三板')) return botReplies['连板'];
    if (lower.includes('涨幅') || lower.includes('涨得')) return botReplies['涨幅'];
    if (lower.includes('异动') || lower.includes('波动')) return botReplies['异动'];
    if (lower.includes('换手') || lower.includes('成交')) return botReplies['换手'];
    if (lower.includes('跌幅') || lower.includes('下跌') || lower.includes('跌得')) return botReplies['跌幅'];
    if (lower.includes('涨速') || lower.includes('速度')) return botReplies['涨速'];
    if (lower.includes('量比')) return botReplies['量比'];
    if (lower.includes('策略') || lower.includes('配置')) return botReplies['策略'];
    return botReplies.default;
  };

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;
    addMessage('user', text.trim());
    setInput('');
    setIsTyping(true);
    const config = matchReply(text);
    setTimeout(() => {
      setIsTyping(false);
      addMessage('assistant', config.text);
      if (config.action) onUpdateStocks(config.action(mockStocks));
    }, 800 + Math.random() * 600);
  };

  return (
    <div className="w-80 bg-[#1A1D23] border-l border-gray-700 flex flex-col overflow-hidden animate-[slideIn_0.25s_ease]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
        <div className="flex items-center gap-2"><Bot size={16} className="text-blue-400" /><span className="text-white text-xs font-semibold">智能分析</span></div>
        <button onClick={onClose} className="text-secondary hover:text-white"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin p-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot size={12} className="text-white" /></div>}
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`px-3 py-2 rounded-lg text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#242730] text-neutral/90'}`}>{msg.content}</div>
              <span className="text-[10px] text-gray-500 mt-0.5 block">{msg.time}</span>
            </div>
            {msg.role === 'user' && <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5"><User size={12} className="text-white" /></div>}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"><Bot size={12} className="text-white" /></div>
            <div className="px-3 py-2 rounded-lg bg-[#242730] flex items-center gap-1.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-secondary text-[10px]">分析中...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-2 border-t border-gray-700/50 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {suggestQuestions.map(({ label, prompt, icon: Icon }) => (
            <button key={label} onClick={() => handleSend(prompt)} disabled={isTyping} className="px-2.5 py-1 text-[10px] rounded-full bg-[#242730] text-secondary hover:text-white hover:bg-gray-600 transition-colors flex items-center gap-1 disabled:opacity-50"><Icon size={11} />{label}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(input)} placeholder="输入筛选条件，如：涨幅最高的股票..." className="flex-1 px-3 py-1.5 text-[11px] rounded bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          <button onClick={() => handleSend(input)} disabled={isTyping} className="px-2.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">{isTyping ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
        </div>
      </div>
    </div>
  );
}
