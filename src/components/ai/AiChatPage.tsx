import { useState, useRef, useEffect } from 'react';
import { Search, Send, Bot, User, BarChart3, TrendingUp, Activity, ClipboardList, Target, ShieldAlert, Loader2 } from 'lucide-react';

const hotTags = ['宁德时代', '贵州茅台', '比亚迪', '隆基绿能', '中信证券'];
const industries = ['IT设备', '专用机械', '汽车零部件', '电子器件', '生物医药', '新材料', '新能源', '半导体', '消费电子', '通信设备', '软件开发', '化工'];
const sectors = ['新能源车', '人工智能', '光伏', '军工', '芯片', '5G', '云计算', '储能', '机器人', '低空经济', '钠电池', '算力租赁'];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const analysisStocks = [
  { 代码: '600519', 名称: '贵州茅台', PE: 25.3, 增长: '15.2%' },
  { 代码: '300750', 名称: '宁德时代', PE: 18.7, 增长: '42.5%' },
  { 代码: '002594', 名称: '比亚迪', PE: 22.1, 增长: '38.6%' },
  { 代码: '601012', 名称: '隆基绿能', PE: 12.5, 增长: '25.8%' },
  { 代码: '688981', 名称: '中芯国际', PE: 35.6, 增长: '18.3%' },
  { 代码: '002475', 名称: '立讯精密', PE: 16.8, 增长: '32.1%' },
];

const historyRecords = [
  { summary: '券商板块集体走强异动解读', time: '2026-05-21 14:30', file: '/reports/yidong.html' },
  { summary: '市场中期趋势研判分析报告', time: '2026-05-21 11:15', file: '/reports/qushi.html' },
  { summary: '5月21日A股市场复盘总结', time: '2026-05-21 16:45', file: '/reports/fupan.html' },
  { summary: '光伏组件价格触底信号解读', time: '2026-05-20 09:20', file: '/reports/yidong.html' },
  { summary: '消费电池产业链趋势研判', time: '2026-05-19 15:00', file: '/reports/qushi.html' },
];

const botReplies: Record<string, string> = {
  default: '这是一个很好的问题。基于当前市场数据和量化模型分析，我为您梳理了相关信息。市场整体情绪偏暖，建议关注业绩确定性较强的细分赛道。',
  筛选: '根据您的筛选条件，目前共匹配到6只标的。从估值角度看，隆基绿能PE仅12.5倍，处于历史低位；立讯精密PE16.8倍，具备消费电子+汽车电子双轮驱动逻辑。建议重点关注PE低于20且营收增速超过20%的标的。',
  异动: '今日券商板块异动明显，中信证券盘中涨停，东方财富涨超12%。驱动因素主要有：1）两市成交额突破2万亿；2）证监会发布资本市场改革新政；3）北向资金大幅净流入超百亿。短期情绪面强劲，但需注意追高风险。',
  趋势: '从技术面看，上证指数突破4100点关键压力位，MACD金叉确认，量能温和放大。市场主线仍围绕AI算力、新能源、创新药三大方向轮动。短期支撑位4050点，压力位4250点。建议仓位控制在6-7成。',
  复盘: '今日A股三大指数全线上涨，上证+1.2%，深证+1.8%，创业板+2.3%。涨停家数102家，跌停仅3家。板块方面，算力租赁、新能源车、创新药涨幅居前。市场情绪高涨，赚钱效应明显。连板高度升至7板。',
  策略: '当前建议采取「核心+卫星」配置策略：核心仓位配置沪深300ETF（40%），卫星仓位分配AI算力（20%）、新能源（20%）、消费电子（10%）、现金（10%）。在美联储降息周期开启的背景下，成长风格占优。',
  风控: '当前市场风险提示：1）人民币汇率波动风险，USDCNY逼近7.4关口；2）部分高位题材股获利盘回吐压力；3）地产链信用风险仍需警惕。建议设置5%止损线，避免追涨杀跌，关注中报业绩预告窗口期。',
};

const quickActions = [
  { icon: Target, label: '标的筛选', key: '筛选' },
  { icon: Activity, label: '异动解读', key: '异动' },
  { icon: TrendingUp, label: '趋势判断', key: '趋势' },
  { icon: ClipboardList, label: '复盘总结', key: '复盘' },
  { icon: BarChart3, label: '策略选择', key: '策略' },
  { icon: ShieldAlert, label: '风控提示', key: '风控' },
];

function now() {
  const d = new Date();
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export default function AiChatPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '您好！我是您的量化智能助手。您可以提出关于个股筛选、行业异动或策略建议的问题，例如：「帮我筛选 PE 低于 20 的高成长电子股」', time: now() },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { role, content, time: now() }]);
  };

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;
    addMessage('user', text.trim());
    setInput('');
    setIsTyping(true);

    const selectedInfo = [
      selectedIndustry && `行业:${selectedIndustry}`,
      selectedSector && `概念:${selectedSector}`,
      selectedStock && `标的:${selectedStock}`,
    ].filter(Boolean).join('，');

    const context = selectedInfo ? `[已选范围：${selectedInfo}] ` : '';

    const matchedKey = Object.keys(botReplies).find((k) => text.includes(k));
    const reply = context + (botReplies[matchedKey || ''] || botReplies.default);

    setTimeout(() => {
      setIsTyping(false);
      addMessage('assistant', reply);
    }, 1200 + Math.random() * 800);
  };

  const handleQuickAction = (key: string) => {
    const prompts: Record<string, string> = {
      筛选: '帮我筛选PE低于20的高成长电子股',
      异动: '今天券商板块为什么异动？',
      趋势: '分析一下当前大盘趋势和支撑位',
      复盘: '帮我复盘今天的市场情况',
      策略: '给我一个当前市场的配置策略建议',
      风控: '当前市场有哪些风险需要注意？',
    };
    handleSend(prompts[key] || '');
  };

  const handleTagClick = (tag: string) => {
    setSelectedStock(tag === selectedStock ? null : tag);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-56 bg-[#1A1D23] border-r border-gray-700/50 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-700/50">
          <h3 className="text-white text-xs font-semibold">选股</h3>
        </div>
        <div className="flex-1 overflow-auto scrollbar-thin p-3 space-y-4">
          <div>
            <h4 className="text-secondary text-xs mb-2">股票筛选</h4>
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                placeholder="输入代码或名称..."
                className="w-full pl-7 pr-2 py-1.5 text-xs rounded bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSend((e.target as HTMLInputElement).value)}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {hotTags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
                    selectedStock === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700/50 text-secondary hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-secondary text-xs mb-2">行业分析（申万）</h4>
            <div className="flex gap-1 flex-wrap">
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setSelectedIndustry(ind === selectedIndustry ? null : ind)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedIndustry === ind
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700/30 text-secondary hover:bg-gray-600'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-secondary text-xs mb-2">板块概念</h4>
            <div className="flex gap-1 flex-wrap">
              {sectors.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec === selectedSector ? null : sec)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedSector === sec
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700/30 text-secondary hover:bg-gray-600'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#1A1D23]">
        <div className="px-4 py-2 border-b border-gray-700/50">
          <span className="text-white text-xs font-semibold">分析</span>
        </div>
        <div className="flex-1 overflow-auto scrollbar-thin p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div
                  className={`px-4 py-3 rounded-xl text-xs leading-relaxed animate-[fadeIn_0.3s_ease] ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#242730] text-neutral/90'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-gray-500 mt-1 block">{msg.time}</span>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="px-5 py-4 rounded-xl bg-[#242730] flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-secondary text-xs">AI正在分析中...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-gray-700/50">
          <div className="flex justify-between mb-3">
            {quickActions.map(({ icon: Icon, label, key }) => (
              <button
                key={label}
                onClick={() => handleQuickAction(key)}
                className="flex flex-col items-center gap-1 text-secondary hover:text-blue-400 transition-colors group"
              >
                <Icon size={18} className="group-hover:text-blue-400 transition-colors" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="请输入股票/行业/板块问题，例如：帮我筛选电子行业的高股息个股..."
              className="flex-1 px-4 py-2 text-xs rounded-lg bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isTyping}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="w-72 bg-[#1A1D23] border-l border-gray-700/50 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-xs font-semibold">结果</h3>
            <span className="text-blue-400 text-xs">
              {messages.length > 1 ? analysisStocks.length : 0}只标的
            </span>
          </div>
        </div>

        {messages.length > 1 && (
          <div className="p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-secondary border-b border-gray-700/50">
                  <th className="py-1.5 text-left font-normal">代码</th>
                  <th className="py-1.5 text-left font-normal">名称</th>
                  <th className="py-1.5 text-right font-normal">PE</th>
                  <th className="py-1.5 text-right font-normal">增长</th>
                </tr>
              </thead>
              <tbody>
                {analysisStocks.map((s, idx) => (
                  <tr
                    key={s.代码}
                    className="border-b border-gray-700/30 hover:bg-gray-700/30 cursor-pointer transition-colors animate-[fadeIn_0.3s_ease]"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <td className="py-1.5 text-neutral font-mono">{s.代码}</td>
                    <td className="py-1.5 text-neutral">{s.名称}</td>
                    <td className="py-1.5 text-blue-400 font-mono text-right">{s.PE}</td>
                    <td className={`py-1.5 font-mono text-right ${s.增长.includes('-') ? 'text-down' : 'text-up'}`}>{s.增长}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex-1 overflow-auto scrollbar-thin px-3 py-2 border-t border-gray-700/50">
          <h3 className="text-white text-xs font-semibold mb-3">生成记录</h3>
          <div className="space-y-2">
            {historyRecords.map((rec, idx) => (
              <div
                key={idx}
                onClick={() => window.open(rec.file, '_blank')}
                className="p-2 rounded bg-[#242730] cursor-pointer hover:bg-gray-700/50 transition-colors group"
              >
                <p className="text-neutral text-xs group-hover:text-blue-400 transition-colors">{rec.summary}</p>
                <span className="text-gray-500 text-xs">{rec.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}