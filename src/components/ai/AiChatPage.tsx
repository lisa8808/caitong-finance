import { useState, useRef, useEffect } from 'react';
import { Search, Send, Bot, User, BarChart3, TrendingUp, Activity, ClipboardList, Target, ShieldAlert, Loader2, FileText, X } from 'lucide-react';
import AiReviewModal from './AiReviewModal';

const hotTags = ['宁德时代', '贵州茅台', '比亚迪', '隆基绿能', '中信证券'];
const industries = ['IT设备', '专用机械', '汽车零部件', '电子器件', '生物医药', '新材料', '新能源', '半导体', '消费电子', '通信设备', '软件开发', '化工'];
const sectors = ['新能源车', '人工智能', '光伏', '军工', '芯片', '5G', '云计算', '储能', '机器人', '低空经济', '钠电池', '算力租赁'];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const analysisStocks = [
  { 代码: '600519', 名称: '贵州茅台', PE: 25.3, 增长: '+15.2%' },
  { 代码: '300750', 名称: '宁德时代', PE: 18.7, 增长: '+42.5%' },
  { 代码: '002594', 名称: '比亚迪', PE: 22.1, 增长: '+38.6%' },
  { 代码: '601012', 名称: '隆基绿能', PE: 12.5, 增长: '+25.8%' },
  { 代码: '688981', 名称: '中芯国际', PE: 35.6, 增长: '+18.3%' },
  { 代码: '002475', 名称: '立讯精密', PE: 16.8, 增长: '+32.1%' },
];

interface ReportRecord {
  summary: string;
  time: string;
  content: string;
}

const initialRecords: ReportRecord[] = [
  { summary: '券商板块集体走强异动解读', time: '2026-05-21 14:30', content: '' },
  { summary: '市场中期趋势研判分析报告', time: '2026-05-21 11:15', content: '' },
  { summary: '5月21日A股市场复盘总结', time: '2026-05-21 16:45', content: '' },
  { summary: '光伏组件价格触底信号解读', time: '2026-05-20 09:20', content: '' },
  { summary: '消费电池产业链趋势研判', time: '2026-05-19 15:00', content: '' },
];

const botReplies: Record<string, string> = {
  default: '这是一个很好的问题。基于当前市场数据和量化模型分析，我为您梳理了相关信息。市场整体情绪偏暖，建议关注业绩确定性较强的细分赛道。',
  筛选: '根据您的筛选条件，目前共匹配到6只标的。从估值角度看，隆基绿能PE仅12.5倍，处于历史低位；立讯精密PE16.8倍，具备消费电子+汽车电子双轮驱动逻辑。建议重点关注PE低于20且营收增速超过20%的标的。',
  异动: '今日券商板块异动明显，中信证券盘中涨停，东方财富涨超12%。驱动因素主要有：1）两市成交额突破2万亿；2）证监会发布资本市场改革新政；3）北向资金大幅净流入超百亿。短期情绪面强劲，但需注意追高风险。',
  趋势: '从技术面看，上证指数突破4100点关键压力位，MACD金叉确认，量能温和放大。市场主线仍围绕AI算力、新能源、创新药三大方向轮动。短期支撑位4050点，压力位4250点。建议仓位控制在6-7成。',
  复盘: '📊 今日A股市场复盘报告\n\n一、大盘概况\n三大指数全线上涨，上证指数+1.2%报4120.38点，深证成指+1.8%报13520.15点，创业板指+2.3%报2850.62点。两市成交额突破2.1万亿，涨停家数102家，跌停仅3家，市场情绪高涨。\n\n二、板块表现\n涨幅居前：算力租赁（+5.6%）、新能源车（+4.2%）、创新药（+3.8%）\n跌幅居前：地产服务（-0.8%）、银行（-0.3%）\n\n三、资金流向\n北向资金净流入142.6亿，主力资金净流入通信设备、半导体板块。\n\n四、连板高度\n连板高度升至7板（AI应用方向），市场赚钱效应显著。',
  策略: '当前建议采取「核心+卫星」配置策略：核心仓位配置沪深300ETF（40%），卫星仓位分配AI算力（20%）、新能源（20%）、消费电子（10%）、现金（10%）。在美联储降息周期开启的背景下，成长风格占优。',
  风控: '当前市场风险提示：1）人民币汇率波动风险，USDCNY逼近7.4关口；2）部分高位题材股获利盘回吐压力；3）地产链信用风险仍需警惕。建议设置5%止损线，避免追涨杀跌，关注中报业绩预告窗口期。',
  总结: '📊 今日市场热点行业复盘\n\nTOP1：通信设备  +3.82%\n  成交额 485亿 | 龙头：中兴通讯 +6.2%、烽火通信 +4.8%\n  驱动逻辑：5G-A商用加速推进，运营商资本开支超预期\n\nTOP2：半导体  +3.15%\n  成交额 620亿 | 龙头：中芯国际 +4.1%\n  驱动逻辑：国产替代政策持续加码\n\nTOP3：新能源车  +2.68%\n  成交额 410亿 | 龙头：比亚迪 +3.1%\n  驱动逻辑：5月新能源乘用车零售销量同比+38%',
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
  const [historyRecords, setHistoryRecords] = useState<ReportRecord[]>(initialRecords);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState('筛选');
  const [logoImage, setLogoImage] = useState<string | null>('/logo.jpg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickPrompts: Record<string, string> = {
    筛选: '帮我筛选PE低于20的高成长电子股',
    异动: '今天券商板块为什么异动？',
    趋势: '分析一下当前大盘趋势和支撑位',
    复盘: '帮我复盘今天的市场情况',
    策略: '给我一个当前市场的配置策略建议',
    风控: '当前市场有哪些风险需要注意？',
  };

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
      if (matchedKey === '复盘' || matchedKey === '总结') {
        const nowDate = new Date();
        const dateStr = nowDate.toLocaleDateString('zh-CN');
        const timeStr = nowDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const record: ReportRecord = {
          summary: `${dateStr}A股${matchedKey === '复盘' ? '复盘' : '行业热点'}分析报告`,
          time: `${dateStr} ${timeStr}`,
          content: reply,
        };
        setHistoryRecords((prev) => [record, ...prev]);
        setSelectedReport(record);
      }
    }, 1200 + Math.random() * 800);
  };

  const handleQuickAction = (key: string) => {
    setSelectedAction(key);
    if (key === '复盘') {
      setShowReviewModal(true);
    } else {
      setInput(quickPrompts[key] || '');
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedStock(tag === selectedStock ? null : tag);
  };

  const handleReviewSelect = (prompt: string) => {
    setShowReviewModal(false);
    setInput(prompt);
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-56 bg-gradient-to-bl from-indigo-900/30 via-gray-900 to-gray-900 border-r border-gray-700/50 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50">
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

      <div className="flex-1 flex flex-col bg-gradient-to-br from-indigo-900/20 via-gray-900 to-blue-900/20">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <span className="text-white text-xs font-semibold">分析</span>
        </div>
        <div className={`flex-1 p-4 ${messages.length > 1 ? 'overflow-auto scrollbar-thin space-y-4' : 'overflow-hidden'}`}>
          {messages.length <= 1 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 -mt-8">
              {/* Logo */}
              <div className="relative group cursor-pointer" onClick={handleLogoClick} title="点击替换Logo">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-blue-500/10 animate-pulse" style={{ transform: 'scale(1.4)' }} />
                <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-blue-500/20" style={{ transform: 'scale(1.2)' }} />
                <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 overflow-hidden ${logoImage ? '' : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600'}`}>
                  {logoImage ? (
                    <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                      <rect x="6" y="8" width="26" height="22" rx="3" stroke="white" strokeWidth="2" fill="none" opacity="0.9" />
                      <path d="M2 14h4M32 14h4M2 24h4M32 24h4" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                      <path d="M19 8l-2 4h4l-2-4z" fill="white" opacity="0.7" />
                      <circle cx="19" cy="20" r="4" stroke="white" strokeWidth="2" fill="none" />
                      <circle cx="19" cy="20" r="1.5" fill="white" opacity="0.8" />
                      <path d="M15 26l4-4M23 26l-4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                    </svg>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1.5 tracking-wide">财瞳金融</h2>
                <p className="text-xs text-[#8A919E] tracking-wider">AI量化分析 · 智能决策辅助 · 实时市场洞察</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {[
                  { q: '今日涨幅最高的板块有哪些？', icon: '📈' },
                  { q: '帮我筛选低估值高成长标的', icon: '🔍' },
                  { q: '当前市场资金流向如何？', icon: '💰' },
                  { q: '推荐3只短线关注的个股', icon: '🎯' },
                ].map((item) => (
                  <div key={item.q} onClick={() => handleSend(item.q)} className="p-2.5 rounded-lg bg-[#242730] border border-gray-700/50 cursor-pointer hover:border-blue-500/50 hover:bg-[#2a3040] transition-colors group">
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-xs text-[#E6EDF7] group-hover:text-blue-400 transition-colors leading-relaxed">{item.q}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-blue-500/20">
                    <Bot size={13} className="text-white" />
                  </div>
                )}
                <div className={`${msg.role === 'user' ? 'items-end' : ''} max-w-[78%]`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-gray-500">{msg.role === 'assistant' ? 'AI助手' : '我'}</span>
                  </div>
                  <div
                    className={`px-4 py-2.5 text-xs leading-relaxed animate-[fadeIn_0.3s_ease] whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-md shadow-md shadow-blue-500/20'
                        : 'bg-[#1E2230] text-[#E6EDF7] rounded-2xl rounded-tl-md border border-[#2C303A]/50'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-600 mt-0.5 block">{msg.time}</span>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={13} className="text-white" />
                  </div>
                )}
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                <Bot size={13} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] text-gray-500">AI助手</span>
                </div>
                <div className="px-4 py-2.5 rounded-2xl rounded-tl-md bg-[#1E2230] border border-[#2C303A]/50 flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-secondary text-xs">正在分析</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-gray-700/50 relative">
          {showReviewModal && <AiReviewModal onClose={() => setShowReviewModal(false)} onSelect={handleReviewSelect} />}
          <div className="flex justify-between mb-3">
            {quickActions.map(({ icon: Icon, label, key }) => (
              <button
                key={label}
                onClick={() => handleQuickAction(key)}
                className={`flex flex-col items-center gap-1 transition-colors group ${selectedAction === key ? 'text-blue-400' : 'text-secondary hover:text-blue-400'}`}
              >
                <Icon size={18} className={`transition-colors ${selectedAction === key ? 'text-blue-400' : 'group-hover:text-blue-400'}`} />
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

      <div className="w-72 bg-gradient-to-br from-indigo-900/20 via-gray-900 to-blue-900/20 border-l border-gray-700/50 flex flex-col overflow-hidden">
        {selectedReport ? (
          <>
            <div className="p-3 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText size={16} className="text-blue-400 flex-shrink-0" />
                <h3 className="text-white text-xs font-semibold truncate">{selectedReport.summary}</h3>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-gray-500 hover:text-white transition-colors ml-2">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden scrollbar-thin p-3">
              <pre className="text-xs text-neutral/90 leading-relaxed whitespace-pre-wrap font-sans">{selectedReport.content}</pre>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-xs font-semibold">分析结果</h3>
                <span className="text-blue-400 text-xs">
                  {messages.length > 1 ? analysisStocks.length : 0}只标的
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin p-3 space-y-2 border-b border-gray-700/50">
              {messages.length > 1 ? (
                analysisStocks.map((s, idx) => {
                  const isUp = !s.增长.includes('-');
                  return (
                    <div
                      key={s.代码}
                      className="bg-[#242730] rounded-lg p-3 border border-gray-700/30 hover:border-gray-600/50 cursor-pointer transition-all animate-[fadeIn_0.3s_ease]"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white text-xs font-medium">{s.名称}</span>
                          <span className="text-secondary text-[10px] ml-2 font-mono">{s.代码}</span>
                        </div>
                        <span className={`text-xs font-mono font-semibold ${isUp ? 'text-up' : 'text-down'}`}>
                          {isUp ? '+' : ''}{s.增长}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-secondary w-6">PE</span>
                        <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                            style={{ width: `${Math.min(s.PE / 40 * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-blue-400 font-mono w-10 text-right">{s.PE}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-secondary">暂无分析结果</div>
              )}
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin px-3 py-2 border-t border-gray-700/50">
              <h3 className="text-white text-xs font-semibold mb-3">报告记录</h3>
              <div className="space-y-2">
                {historyRecords.map((rec, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedReport(rec)}
                    className="p-2 rounded bg-[#242730] cursor-pointer hover:bg-gray-700/50 transition-colors group"
                  >
                    <p className="text-neutral text-xs group-hover:text-blue-400 transition-colors">{rec.summary}</p>
                    <span className="text-gray-500 text-xs">{rec.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
