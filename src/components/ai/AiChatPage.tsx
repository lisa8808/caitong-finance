import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, TrendingUp, Activity, ClipboardList, Target, ShieldAlert, Loader2, FileText, X, BadgeDollarSign, Share2, MessageCircle, MessageSquare, Copy, NotebookPen, MessageSquarePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import AiReviewModal, { ReviewOption } from './AiReviewModal';
import StockSelectionTemplates, { StockSelectionTemplate } from './StockSelectionTemplates';
import { StockItem } from '../../types';
import { holdingStocks } from '../../data/watchlistData';
import { AbnormalMovementData, AbnormalMovementStock, loadAbnormalMovementData } from '../../services/abnormalMovementService';
import { loadValueInvestingCommitteeReport } from '../../services/valueInvestingCommitteeService';
import { loadHoldingStocks } from '../../services/watchlistService';
import { loadStockSelectionReport, StockSelectionContext } from '../../services/stockSelectionService';
import { loadMarketQuickInsights, MarketQuickInsights } from '../../services/marketQuickInsightService';
import { loadGeneralChatAnswer } from '../../services/generalChatService';

const ABNORMAL_MOVEMENT_SKILL_NAME = 'fi_abnormal_movement';
const ABNORMAL_MOVEMENT_SKILL_TITLE = 'A股异动解读与归因分析 Skill';
const ABNORMAL_REPORT_TITLE = '异动解读报告';
const SAVED_NOTES_KEY = 'caitong-ai-saved-notes';
const INITIAL_ASSISTANT_MESSAGE = '您好！我是您的量化智能助手。您可以提出关于个股筛选、行业异动或策略建议的问题，例如：「帮我筛选 PE 低于 20 的高成长电子股」';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

interface ReportRecord {
  id?: string;
  summary: string;
  time: string;
  content: string;
  status?: 'generating' | 'done';
}

interface ResultColumn {
  key: string;
  title: string;
  align?: 'left' | 'right';
  render: (stock: StockItem) => string;
  className?: (stock: StockItem) => string;
}

const initialRecords: ReportRecord[] = [
  { summary: '券商板块集体走强异动解读', time: '2026-05-21 14:30', content: '' },
  { summary: '市场中期趋势研判分析报告', time: '2026-05-21 11:15', content: '' },
  { summary: '5月21日A股市场复盘总结', time: '2026-05-21 16:45', content: '' },
  { summary: '光伏组件价格触底信号解读', time: '2026-05-20 09:20', content: '' },
  { summary: '消费电池产业链趋势研判', time: '2026-05-19 15:00', content: '' },
];

function loadSavedNotes(): ReportRecord[] {
  try {
    const value = window.localStorage.getItem(SAVED_NOTES_KEY);
    return value ? JSON.parse(value) as ReportRecord[] : [];
  } catch {
    return [];
  }
}

function getNoteSummary(content: string) {
  const firstLine = content.split('\n').map((line) => line.trim()).find(Boolean) || 'AI回答';
  const plainText = firstLine.replace(/^#+\s*/, '').replace(/[*_`>]/g, '').trim();
  return `智询笔记：${plainText.slice(0, 22)}${plainText.length > 22 ? '…' : ''}`;
}

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

type BusinessIntent = 'selection' | 'abnormal' | 'trend' | 'value' | 'review' | 'risk' | 'finance' | 'smalltalk' | 'unrelated';

function classifyBusinessIntent(input: string): BusinessIntent {
  const text = input.trim();
  if (/(风控|风险诊断|风险预警|持仓安全|回撤|减仓|止盈|止损|该不该持有|该不该走)/.test(text)) return 'risk';
  if (/(价值分析|护城河|安全边际|巴菲特|芒格|段永平|李录)/.test(text)) return 'value';
  if (/(筛选|选股|找.*股|挑.*股|排除.*股|剔除.*股|非(?:银行|证券|保险|医药|汽车|电子|消费电子|新能源|半导体).*股|低估值|高成长|高ROE|PE低于|PB低于|市盈率|市净率)/i.test(text)) return 'selection';
  if (/(上一步|上一轮|刚才|前面).*(策略|条件|规则)|(继续|沿用|保持).*(筛选|选股|条件|策略)/.test(text)) return 'selection';
  if (/(异动|为什么.*(?:涨|跌)|大涨|大跌|涨停原因|跌停原因|连板原因|资金异动)/.test(text)) return 'abnormal';
  if (/(趋势判断|趋势研判|趋势溯源|大盘趋势|个股趋势|行业趋势|板块趋势|持续上涨|持续下跌|趋势.*延续)/.test(text)) return 'trend';
  if (/(复盘|盘后总结|市场总结|行情总结|交易总结|操作总结)/.test(text)) return 'review';
  if (/(你好|您好|谢谢|你是谁|怎么用|帮助|能做什么)/.test(text)) return 'smalltalk';
  if (/(股票|A股|港股|美股|指数|大盘|行业|板块|市场|行情|资金|估值|财报|营收|利润|现金流|持仓|涨跌|量化|投资|证券|基金|ETF|债券|汇率|利率|宏观|\b(?:PE|PB|ROE|MACD|RSI)\b|\b\d{6}(?:\.(?:SH|SZ|BJ))?\b)/i.test(text)) return 'finance';
  return 'unrelated';
}

const OUT_OF_SCOPE_REPLY = '抱歉，您咨询的问题与当前业务无关';

const quickActions = [
  { icon: Target, label: '标的筛选', key: '筛选' },
  { icon: Activity, label: '异动解读', key: '异动' },
  { icon: TrendingUp, label: '趋势判断', key: '趋势' },
  { icon: BadgeDollarSign, label: '价值分析', key: '价值' },
  { icon: ClipboardList, label: '复盘总结', key: '复盘' },
  { icon: ShieldAlert, label: '风控提示', key: '风控' },
];

function now() {
  const d = new Date();
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function getDateTime() {
  const d = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatReportValue(value: unknown, digits = 2) {
  if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(digits);
  return value === null || value === undefined || value === '' ? '缺失' : String(value);
}

function formatMarketAmount(value: number) {
  const amountInYi = value / 100_000_000;
  return `${amountInYi >= 0 ? '+' : ''}${amountInYi.toFixed(2)}亿元`;
}

function buildMarketQuickAnswer(prompt: string, data: MarketQuickInsights) {
  const generatedAt = new Date(data.updatedAt).toLocaleString('zh-CN', { hour12: false });
  const meta = `\n\n- 数据来源：${data.source}\n- 更新时间：${generatedAt}\n- 覆盖范围：${data.stockCount}只A股`;

  if (prompt.includes('板块')) {
    const rows = data.topBoards.slice(0, 5).map((board, index) => (
      `| ${index + 1} | ${board.name} | ${board.avgChange >= 0 ? '+' : ''}${board.avgChange.toFixed(2)}% | ${formatMarketAmount(board.mainNetFlow)} | ${board.stockCount} |`
    ));
    return `# 今日涨幅居前板块\n\n| 排名 | 板块 | 平均涨幅 | 主力净流入 | 覆盖股票 |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}${meta}\n\n以上为实时行情聚合结果，盘中数据会持续变化。`;
  }

  if (prompt.includes('资金流')) {
    const flow = data.market.mainNetFlow;
    const direction = flow > 0 ? '净流入' : flow < 0 ? '净流出' : '基本持平';
    const boardRows = [...data.topBoards]
      .sort((a, b) => b.mainNetFlow - a.mainNetFlow)
      .slice(0, 5)
      .map((board, index) => `| ${index + 1} | ${board.name} | ${formatMarketAmount(board.mainNetFlow)} | ${board.avgChange >= 0 ? '+' : ''}${board.avgChange.toFixed(2)}% |`);
    return `# 当前市场资金流向\n\n- 全市场主力资金：${direction} ${formatMarketAmount(Math.abs(flow)).replace('+', '')}\n- 上涨 / 下跌 / 平盘：${data.market.riseCount} / ${data.market.fallCount} / ${data.market.flatCount}\n- 全市场成交额：${formatMarketAmount(data.market.totalAmount).replace('+', '')}\n\n| 排名 | 资金流入居前板块 | 主力净流入 | 平均涨幅 |\n| --- | --- | --- | --- |\n${boardRows.join('\n')}${meta}\n\n资金流为实时截面数据，仅用于描述当前市场状态。`;
  }

  const stockRows = data.activeStocks.slice(0, 3).map((stock, index) => (
    `| ${index + 1} | ${stock.code} | ${stock.name} | ${stock.industry || '未分类'} | ${stock.price.toFixed(2)} | ${stock.pctChange >= 0 ? '+' : ''}${stock.pctChange.toFixed(2)}% | ${formatMarketAmount(stock.mainNetFlow)} |`
  ));
  return `# 短线活跃标的关注清单\n\n| 排名 | 代码 | 名称 | 行业 | 最新价 | 涨跌幅 | 主力净流入 |\n| --- | --- | --- | --- | --- | --- | --- |\n${stockRows.join('\n')}${meta}\n\n筛选逻辑：按实时涨幅与成交活跃度综合排序，并剔除ST、退市风险名称。本内容仅为实时量化筛选结果，不构成任何投资建议。`;
}

function safeCell(value: unknown) {
  return formatReportValue(value).replace(/\|/g, '/').replace(/\s*\n+\s*/g, '；').replace(/\s{2,}/g, ' ');
}

function tableRows(rows: Array<Array<unknown>>) {
  return rows.map((row) => `| ${row.map(safeCell).join(' |')} |`);
}

function buildExpertConclusion(key: string, metrics: Record<string, any>, chair: Record<string, any>, profile: ReturnType<typeof getReportBusinessProfile>) {
  const verdict = chair.verdict || '观察 / 需要验证';
  const pe = formatReportValue(metrics.pe);
  const pb = formatReportValue(metrics.pb);
  const cash = metrics.operating_cash_flow
    ? `经营现金流总额 ${formatReportValue(metrics.operating_cash_flow, 0)}`
    : `仅有每股经营现金流 proxy ${formatReportValue(metrics.operating_cash_flow_per_share)}，经营现金流总额待补`;
  const firstRisk = profile.risks[0] || '关键风险待验证';
  const firstMoat = profile.moats[0] || '护城河待验证';
  const firstSegment = profile.segments[0]?.[0] || '核心业务';

  if (key === 'buffett') {
    return `${verdict}。认可的前提是 ${firstMoat} 能转化为稳定现金流；当前 PE ${pe}、PB ${pb}，${cash}，资本开支仍需补齐后才能确认 owner earnings 和安全边际。`;
  }
  if (key === 'munger') {
    return `核心结论是先防错：最大反证来自 ${firstRisk}。若利润不能持续转化为自由现金流，或资本开支拖累回报，应降低估值倍数和仓位。`;
  }
  if (key === 'duan_yongping') {
    return `核心结论是先判断 ${firstSegment} 是否是好生意、管理层是否值得托付。只有产品需求、用户口碑、现金流和价格同时过关，才适合进入买入讨论。`;
  }
  if (key === 'li_lu') {
    return `核心结论是验证十年确定性：公司必须在产业趋势、组织能力和复利再投资上持续变强；若关键验证节点无法兑现，长期情景估值需要下修。`;
  }
  return verdict;
}

function getReportBusinessProfile(data: { company: string; symbol: string; result?: Record<string, any> }) {
  if (data.symbol === '01810.HK' || data.company.includes('小米')) {
    return {
      archetype: '消费电子 + AIoT + 智能电动车平台型制造公司',
      segments: [
        ['智能手机', '核心规模入口，贡献硬件收入和全球渠道基础', '出货量、ASP、毛利率、高端化占比、库存周转'],
        ['IoT与生活消费产品', '扩展用户场景和硬件生态，提高用户黏性', '品类增长、毛利率、渠道效率、生态联动'],
        ['互联网服务', '高毛利利润池，验证硬件用户规模能否转化为现金流', 'MAU、ARPU、广告/游戏/金融科技收入、毛利率'],
        ['智能电动车', '第二增长曲线，但资本开支和竞争强度高', '交付量、单车毛利、订单持续性、研发和工厂投入回报'],
        ['AI与操作系统生态', '提高终端体验和多设备协同，决定长期差异化', '澎湃OS活跃设备、AI功能留存、生态开发者与服务收入'],
      ],
      moats: [
        '全球消费电子品牌与渠道规模',
        '手机 + IoT + 汽车的多终端生态协同',
        '互联网服务高毛利利润池',
        '供应链效率和性价比心智',
        '创始人长期投入与组织执行力',
      ],
      risks: [
        '智能手机行业成熟、竞争激烈，硬件毛利率受压',
        '汽车业务仍处投入期，若规模或毛利不达预期会拖累自由现金流',
        'IoT品类扩张可能带来库存和渠道效率压力',
        '互联网服务增长依赖设备活跃与用户时长',
        '资本开支、研发投入和股东回报之间需要持续平衡',
      ],
      validationNodes: [
        '分部收入和毛利率',
        '智能手机高端化与海外份额',
        'IoT库存和周转',
        '互联网服务ARPU和毛利',
        '汽车交付量、单车毛利和订单持续性',
        '经营现金流、资本开支、自由现金流',
      ],
    };
  }

  const profile = data.result?.profile || {};
  return {
    archetype: profile.archetype || '待验证的上市公司',
    segments: (profile.segments || []).map((segment: string, index: number) => [
      segment,
      '判断是否能持续贡献现金流和再投资机会',
      (profile.validation_nodes || [])[index % Math.max((profile.validation_nodes || []).length, 1)] || '收入结构、毛利率、现金流',
    ]),
    moats: profile.moats || [],
    risks: profile.risks || [],
    validationNodes: profile.validation_nodes || [],
  };
}

function buildCompactValueReport(data: { company: string; symbol: string; market: string; result?: Record<string, any>; report: string }) {
  const result = data.result || {};
  const metrics = result.metrics || {};
  const valuation = result.valuation || {};
  const chair = result.chair || {};
  const audit = result.audit || chair.audit || {};
  const valuationMetrics = valuation.valuation_metrics || {};
  const threeYear = Array.isArray(valuation.three_year_scenarios) ? valuation.three_year_scenarios : [];
  const tenYear = Array.isArray(valuation.ten_year_scenarios) ? valuation.ten_year_scenarios : [];
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const gaps = Array.isArray(result.data_gaps) ? result.data_gaps : [];
  const consensus = Array.isArray(chair.consensus) ? chair.consensus : [];
  const contradictions = Array.isArray(chair.contradictions) ? chair.contradictions : [];
  const redLines = Array.isArray(chair.red_lines) ? chair.red_lines : [];
  const actions = Array.isArray(chair.actions) ? chair.actions : [];
  const actionFramework = Array.isArray(chair.action_framework) ? chair.action_framework : [];
  const priceDiscipline = Array.isArray(chair.price_discipline) ? chair.price_discipline : [];
  const thesisBroken = Array.isArray(chair.thesis_broken) ? chair.thesis_broken : [];
  const diligenceQuestions = Array.isArray(chair.diligence_questions) ? chair.diligence_questions : [];
  const auditItems = Array.isArray(audit.items) ? audit.items : [];
  const committee = result.committee || {};
  const profile = getReportBusinessProfile(data);
  const filteredGaps = gaps.filter((gap: string) => !(
    gap.includes('经营现金流总额') && metrics.operating_cash_flow_per_share
  ));

  const sourceLines = sources.map((source: any) => (
    `- ${source.kind || 'source'} / ${source.provider || 'unknown'}${source.statement ? ` / ${source.statement}` : ''}${source.endpoint ? ` / ${source.endpoint}` : ''}${source.ok === false ? ` / 未命中：${source.warning || 'unknown'}` : ''}`
  ));
  const searchEvidence = Array.isArray(result.sources)
    ? sources.filter((source: any) => source.kind === 'search' && source.ok !== false)
    : [];
  const sentimentRows = searchEvidence.length
    ? searchEvidence.map((source: any) => [source.provider || 'search', source.query || '舆情/公告/研报搜索', '已命中', source.endpoint || source.url || '见 evidence.search'])
    : [
      ['公告', 'HKEX 披露易 / 公司公告', '待接入解析', '用于识别回购、分红、股权激励、重大合同、诉讼与监管事件'],
      ['年报/业绩会', '公司 IR / 年报 / 中报 / 业绩演示', '待接入解析', '用于补充管理层口径、业务分部、资本开支、经营现金流解释'],
      ['研报', '券商研报 / 行业研究', '待接入解析', '用于补充行业格局、竞争强度、估值假设和风险事件'],
      ['新闻舆情', '新闻源 / 搜索源', '当前缺少可用搜索源', '用于识别近期负面事件、产品口碑、监管变化和市场情绪'],
    ];
  const metricRows = [
    ['latest_date', '最新交易日', metrics.latest_date],
    ['latest_price', '最新价格', metrics.latest_price],
    ['period_return', '样本期涨跌', typeof metrics.period_return === 'number' ? `${formatReportValue(metrics.period_return * 100)}%` : metrics.period_return],
    ['eps', 'EPS（估值口径）', metrics.eps],
    ['eps_reported', 'EPS（原始口径）', metrics.eps_reported],
    ['bvps', 'BVPS（估值口径）', metrics.bvps],
    ['bvps_reported', 'BVPS（原始口径）', metrics.bvps_reported],
    ['financial_currency', '财报币种', metrics.financial_currency],
    ['fx_to_price_currency', '估值换算系数', metrics.fx_to_price_currency],
    ['pe', 'PE', metrics.pe],
    ['pb', 'PB', metrics.pb],
    ['revenue', '收入', typeof metrics.revenue === 'number' ? `${formatReportValue(metrics.revenue / 100000000)}亿` : metrics.revenue],
    ['net_profit', '净利润', typeof metrics.net_profit === 'number' ? `${formatReportValue(metrics.net_profit / 100000000)}亿` : metrics.net_profit],
    ['operating_cash_flow', '经营现金流总额', metrics.operating_cash_flow],
    ['operating_cash_flow_per_share', '每股经营现金流', metrics.operating_cash_flow_per_share],
    ['operating_cash_flow_per_share_reported', '每股经营现金流（原始口径）', metrics.operating_cash_flow_per_share_reported],
    ['capex', '资本开支', metrics.capex],
    ['owner_earnings_proxy', 'Owner earnings proxy', metrics.owner_earnings_proxy],
    ['fcf_per_share_proxy', 'FCF/share proxy', metrics.fcf_per_share_proxy],
    ['report_marker', '财报标记', metrics.report_marker],
    ['market_rows', '行情样本行数', metrics.market_rows],
  ];
  const valuationRows = Object.entries(valuationMetrics).map(([key, value]) => [key, value]);
  const marketSource = sources.find((source: any) => source.kind === 'market_data' && source.ok !== false);
  const financialSources = sources.filter((source: any) => source.kind === 'financials' && source.ok !== false);
  const financialSourceNames = [...new Set(financialSources.map((source: any) => source.provider || 'unknown'))].join('、');
  const scenarioEvidenceRows = [
    ['估值基准日', metrics.latest_date, marketSource?.provider || '缺失', '行情序列最新交易日'],
    ['当前股价', metrics.latest_price, marketSource?.provider || '缺失', '目标价与回报率计算基准'],
    ['起始 EPS', metrics.eps, financialSourceNames || '缺失', `财报期 ${metrics.report_marker || '缺失'}；${metrics.financial_currency || '币种缺失'}${metrics.fx_to_price_currency && metrics.fx_to_price_currency !== 1 ? ` × 汇率系数 ${formatReportValue(metrics.fx_to_price_currency)}` : ''}`],
    ['当前 PE', metrics.pe, '由股价与EPS计算', '当前股价 ÷ 起始EPS'],
    ['当前 PB', metrics.pb, '由股价与BVPS计算', '当前股价 ÷ BVPS'],
    ['情景增长率', '牛/基/熊为模型假设', '本地估值模型', '不是第三方数据源预测；用于压力测试'],
    ['退出 PE', '牛/基/熊为模型假设', '本地估值模型', '不是券商目标价；用于估值敏感性分析'],
  ];
  const scenarioRows = [...threeYear, ...tenYear].map((row: any) => [
    `${row.years}年-${row.scenario}`,
    typeof row.eps_cagr === 'number' ? `${formatReportValue(row.eps_cagr * 100)}%` : row.eps_cagr,
    row.exit_pe,
    row.future_eps,
    row.target_price,
    typeof row.total_return === 'number' ? `${formatReportValue(row.total_return * 100)}%` : row.total_return,
    typeof row.annualized_return === 'number' ? `${formatReportValue(row.annualized_return * 100)}%` : row.annualized_return,
  ]);
  const committeeRows = ['buffett', 'munger', 'duan_yongping', 'li_lu']
    .map((key) => [key, committee[key]])
    .filter(([, item]) => Boolean(item))
    .map(([key, item]: any[]) => {
      const dimensions: Record<string, string> = {
        buffett: '护城河、Owner Earnings、安全边际',
        munger: '逆向思考、失败路径、永久亏损风险',
        duan_yongping: '生意模式、管理层、企业文化、价格',
        li_lu: '十年确定性、产业趋势、复利能力',
      };
      return [
        item.title,
        dimensions[key] || item.stance || '专家维度',
        buildExpertConclusion(key, metrics, chair, profile),
      ];
    });
  const cashFlowLine = metrics.operating_cash_flow
    ? `经营现金流总额 ${formatReportValue(metrics.operating_cash_flow, 0)}`
    : `经营现金流总额缺失；每股经营现金流 proxy ${formatReportValue(metrics.operating_cash_flow_per_share)} 已取得`;

  return [
    `# ${data.company}（${data.symbol}）价值分析记录`,
    '',
    '## 客观结论',
    `- 结论：${result.verdict || chair.verdict || '缺失'}`,
    `- 置信度：${result.confidence || chair.confidence || '缺失'}`,
    `- 市场：${data.market}`,
    `- 评估日：${result.as_of || '缺失'}`,
    `- 公司类型：${profile.archetype}`,
    ...(actions.length ? actions.map((item: string) => `- 动作建议：${item}`) : []),
    '',
    '## 估值情景证据',
    '| 情景 | EPS CAGR | 退出PE | 未来EPS | 目标价 | 总回报 | 年化 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...(scenarioRows.length ? tableRows(scenarioRows) : ['| 缺失 | 缺失 | 缺失 | 缺失 | 缺失 | 缺失 | 缺失 |']),
    '',
    '### 情景输入与证据来源',
    '| 输入项 | 数值/口径 | 数据来源 | 用途与说明 |',
    '| --- | --- | --- | --- |',
    ...tableRows(scenarioEvidenceRows),
    '',
    '> 计算公式：未来EPS = 起始EPS × (1 + EPS CAGR)^年数；目标价 = 未来EPS × 退出PE；总回报 = 目标价 ÷ 当前股价 − 1；年化回报 = (目标价 ÷ 当前股价)^(1/年数) − 1。情景增长率和退出PE是本地压力测试假设，不是行情源提供的预测结论。',
    '',
    '## 核心数据举证',
    `- 最新价格：${formatReportValue(metrics.latest_price)}`,
    `- PE / PB：${formatReportValue(metrics.pe)} / ${formatReportValue(metrics.pb)}`,
    `- EPS / BVPS：${formatReportValue(metrics.eps)} / ${formatReportValue(metrics.bvps)}`,
    `- 收入：${typeof metrics.revenue === 'number' ? `${formatReportValue(metrics.revenue / 100000000)}亿` : '缺失'}`,
    `- 现金流：${cashFlowLine}`,
    `- 资本开支：${metrics.capex ? formatReportValue(metrics.capex, 0) : '缺失，需年报现金流量表/附注继续核验'}`,
    `- 审计门：${audit.verdict || '缺失'}（pass ${audit.pass_count ?? 0} / warn ${audit.warn_count ?? 0} / fail ${audit.fail_count ?? 0}）`,
    `- 估值证据：盈利收益率 ${formatReportValue(valuationMetrics.earnings_yield_pct)}%，P/FCF proxy ${formatReportValue(valuationMetrics.P_FCF_proxy)}`,
    '',
    '### 完整指标底稿',
    '| 字段 | 指标 | 数值 |',
    '| --- | --- | --- |',
    ...tableRows(metricRows),
    '',
    '### 估值指标底稿',
    '| 指标 | 数值 |',
    '| --- | --- |',
    ...(valuationRows.length ? tableRows(valuationRows) : ['| 缺失 | 缺失 |']),
    '',
    '### 审计明细',
    '| 检查项 | 标签 | 值 | 要求 | 结论 |',
    '| --- | --- | --- | --- | --- |',
    ...(auditItems.length ? tableRows(auditItems.map((item: any) => [item.id, item.label, item.value, item.required ? '必需' : '可选', item.verdict])) : ['| 缺失 | 缺失 | 缺失 | 缺失 | 缺失 |']),
    '## 业务/利润池结论',
    '| 业务/利润池 | 结论 | 关键验证 |',
    '| --- | --- | --- |',
    ...profile.segments.map(([segment, conclusion, verification]: string[]) => `| ${segment} | ${conclusion} | ${verification} |`),
    '',
    '## 护城河与风险',
    ...(profile.moats.length ? profile.moats.map((item: string) => `- 护城河：${item}`) : ['- 护城河：缺失']),
    ...(profile.risks.length ? profile.risks.map((item: string) => `- 风险：${item}`) : ['- 风险：缺失']),
    '',
    '## 舆情/事件证据',
    '| 来源类型 | 数据源/检索方向 | 当前状态 | 投研用途 |',
    '| --- | --- | --- | --- |',
    ...tableRows(sentimentRows),
    '',
    '## 委员会结论与举证',
    ...(consensus.length ? consensus.map((item: string) => `- 共识：${item}`) : ['- 共识：缺失']),
    ...(contradictions.length ? contradictions.map((item: string) => `- 矛盾：${item}`) : ['- 矛盾：缺失']),
    ...(redLines.length ? redLines.map((item: string) => `- 红线：${item}`) : []),
    '',
    '### 四委员逐项判断',
    '| 专家 | 分析维度 | 结论 |',
    '| --- | --- | --- |',
    ...(committeeRows.length ? tableRows(committeeRows) : ['| 缺失 | 缺失 | 缺失 |']),
    '',
    '### 主席执行框架',
    ...(actionFramework.length ? actionFramework.map((item: string) => `- ${item}`) : ['- 缺失']),
    '',
    '### 价格纪律',
    ...(priceDiscipline.length ? priceDiscipline.map((item: string) => `- ${item}`) : ['- 缺失']),
    '',
    '## 证据来源',
    ...(sourceLines.length ? sourceLines : ['- 缺失']),
    '',
    '## 待验证',
    ...(filteredGaps.length ? filteredGaps.map((item: string) => `- ${item}`) : ['- 暂无显式数据缺口']),
    ...(profile.validationNodes.length ? profile.validationNodes.map((item: string) => `- 验证节点：${item}`) : []),
    ...(thesisBroken.length ? thesisBroken.map((item: string) => `- 投资假设击穿：${item}`) : []),
    ...(diligenceQuestions.length ? diligenceQuestions.map((item: string) => `- 尽调问题：${item}`) : []),
  ].join('\n');
}

function getStockSeed(stock: StockItem) {
  return `${stock.证券代码}${stock.证券名称}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getResultColumns(query: string): ResultColumn[] {
  const normalized = query.toLowerCase();
  const columns: ResultColumn[] = [
    { key: 'code', title: '股票代码', render: (stock) => stock.证券代码 },
    { key: 'name', title: '股票名称', render: (stock) => stock.证券名称 },
    { key: 'price', title: '最新', align: 'right', render: (stock) => stock.现价.toFixed(2) },
    {
      key: 'change',
      title: '今日涨幅',
      align: 'right',
      render: (stock) => `${stock.涨幅 >= 0 ? '+' : ''}${stock.涨幅.toFixed(2)}%`,
      className: (stock) => stock.涨幅 >= 0 ? 'text-up' : 'text-down',
    },
  ];

  if (normalized.includes('pe') || query.includes('市盈率')) {
    columns.push({
      key: 'pe',
      title: 'PE',
      align: 'right',
      render: (stock) => (8 + (getStockSeed(stock) % 320) / 10).toFixed(1),
    });
  }

  if (normalized.includes('ma') || query.includes('均线') || query.includes('移动平均')) {
    columns.push(
      {
        key: 'ma5',
        title: 'MA5',
        align: 'right',
        render: (stock) => (stock.现价 * (0.97 + (getStockSeed(stock) % 7) / 100)).toFixed(2),
      },
      {
        key: 'ma10',
        title: 'MA10',
        align: 'right',
        render: (stock) => (stock.现价 * (0.95 + (getStockSeed(stock) % 9) / 100)).toFixed(2),
      },
    );
  }

  return columns;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderChatContent(content: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-3 mt-1 border-b border-blue-400/30 pb-2 text-lg font-bold text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-5 border-l-2 border-blue-400 pl-2 text-sm font-semibold text-blue-200 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1.5 mt-4 text-xs font-semibold text-blue-100">{children}</h3>,
        h4: ({ children }) => <h4 className="mb-1 mt-3 font-semibold text-[#E6EDF7]">{children}</h4>,
        p: ({ children }) => <p className="my-2 max-w-full [overflow-wrap:anywhere] leading-6 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-blue-400">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-blue-300">{children}</ol>,
        li: ({ children }) => <li className="pl-1 leading-5">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-blue-400/70 bg-blue-500/5 px-3 py-1 text-gray-300">{children}</blockquote>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">{children}</a>,
        hr: () => <hr className="my-4 border-gray-700" />,
        pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-[#11141B] p-3 text-[11px] leading-5 text-gray-200">{children}</pre>,
        code: ({ children, className }) => className
          ? <code className={className}>{children}</code>
          : <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-blue-200">{children}</code>,
        table: ({ children }) => (
          <div className="my-3 w-full max-w-full overflow-x-auto rounded-lg border border-gray-600/70">
            <table className="min-w-max w-full border-collapse text-[11px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-blue-500/10 text-blue-200">{children}</thead>,
        tr: ({ children }) => <tr className="border-b border-gray-700/60 last:border-b-0 even:bg-white/[0.02]">{children}</tr>,
        th: ({ children }) => <th className="border-r border-gray-600/70 px-3 py-2 text-left font-medium last:border-r-0">{children}</th>,
        td: ({ children }) => <td className="border-r border-gray-700/60 px-3 py-2 align-top text-[#D7DFEC] last:border-r-0">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function buildReviewReport(review: ReviewOption, displayStocks: StockItem[], scope: string) {
  const date = new Date().toLocaleDateString('zh-CN');
  const styleText = review.style === 'trading' ? '实战复盘' : review.style === 'mixed' ? '投研归档 + 交易观察' : '投研归档';
  const topStocks = displayStocks.slice(0, 5);
  const stockRows = topStocks.map((stock) => `| ${stock.证券代码} | ${stock.证券名称} | ${stock.现价.toFixed(2)} | ${stock.涨幅 >= 0 ? '+' : ''}${stock.涨幅.toFixed(2)}% |`).join('\n');

  const sections: Record<ReviewOption['title'], string> = {
    板块热点: `## 三、热点板块分析\n- 今日主线集中在高弹性成长方向，需重点观察成交额能否继续放大。\n- 领涨板块若能保持龙头股强度和板块内扩散，短线持续性更强。\n- 若明日冲高回落且成交缩量，说明资金更偏向轮动而非趋势主升。\n\n## 四、龙头与扩散\n${stockRows || '| - | - | - | - |'}\n\n## 五、明日观察\n- 观察龙头个股是否继续强于板块指数。\n- 观察板块成交额是否维持在高位。\n- 观察低位补涨个股是否扩散。`,
    市场复盘: `## 三、市场结构分析\n- 指数层面重点关注量价配合，放量上涨更利于趋势延续。\n- 情绪层面重点看涨跌家数、连板高度和高位股反馈。\n- 资金层面重点看北向资金、主力资金是否与热点方向一致。\n\n## 四、样例关注标的\n${stockRows || '| - | - | - | - |'}\n\n## 五、明日观察\n- 指数能否在关键位置放量站稳。\n- 热点主线是否继续集中。\n- 高位题材是否出现明显亏钱效应。`,
    个股复盘: `## 三、个股表现分析\n${topStocks.map((stock) => `### ${stock.证券名称}（${stock.证券代码}）\n- 今日表现：现价 ${stock.现价.toFixed(2)}，涨幅 ${stock.涨幅 >= 0 ? '+' : ''}${stock.涨幅.toFixed(2)}%。\n- 复盘重点：结合所属题材、资金承接和均线位置判断持续性。\n- 明日观察：关注开盘强弱、量能变化和关键支撑位。`).join('\n\n') || '暂无选股结果，建议补充个股列表后生成更完整复盘。'}\n\n## 四、风险提示\n- 个股波动受题材、业绩、流动性和市场情绪共同影响。\n- 若放量冲高后回落，需要警惕短线资金兑现。`,
    操作复盘: `## 三、周期交易数据总览（技能结果量化）\n| 模块 | 指标 | 本期数据 | 技能解读 |\n| --- | --- | --- | --- |\n| 账户核心数据 | 期初资金 / 期末资金 / 当期盈亏 / 收益率 | 未提供 | 需补充后才能判断收益是否来自体系能力。 |\n| 交易行为数据 | 总交易笔数 / 盈利笔数 / 亏损笔数 / 胜率 | 未提供 | 建议按笔记录，避免只凭主观感受复盘。 |\n| 风控波动数据 | 最大回撤 / 单笔最大盈亏 / 平均盈亏比 | 未提供 | 缺少该项会导致无法定位风险控制能力。 |\n| 交易效率数据 | 空仓天数 / 频繁交易天数 / 合规交易占比 / 情绪化交易占比 | 未提供 | 后续应重点量化体系内交易比例。 |\n\n## 四、当期市场认知技能复盘（底层研判能力）\n### 1. 大盘周期研判技能\n- 当期大盘周期定义：未提供完整指数和量能数据，暂按当前样例市场归为结构性行情观察。\n- 个人研判结果：待补充交易前对指数、量能、情绪周期的判断。\n- 研判偏差分析：重点检查是否存在把震荡行情当趋势行情、忽视指数破位风险、错判量能趋势等问题。\n\n### 2. 题材主线甄别技能\n- 市场真实主线、支线、退潮题材：待补充当日主线和退潮方向。\n- 个人题材取舍动作：需记录是否聚焦主线，是否参与杂毛题材。\n- 技能短板：重点检查主线聚焦能力、龙头辨识度和题材持续性判断。\n\n### 3. 市场情绪解读技能\n- 核心情绪指标：连板高度、炸板率、涨跌家数、资金流向均待补充。\n- 个人情绪应对策略：需复盘是否在高位激进、低位恐慌或混沌行情盲目出手。\n\n## 五、单笔交易技能拆解（核心落地复盘）\n### （一）盈利交易｜正向技能固化\n- 标的名称 + 代码：待补充。\n- 选股技能：检查是否来自主线题材、趋势突破或超跌低吸，是否有技术面、基本面、资金面或政策面依据。\n- 择时技能：拆解入场节点是否在情绪回暖、板块启动或分歧低吸；出场是否在压力到位、题材分歧或情绪退潮。\n- 仓位技能：判断仓位是否匹配行情确定性，是否存在赚小钱轻仓的问题。\n- 操作纪律：确认是否严格执行体系规则，无情绪化操作。\n- 核心可复用技能：把有效动作沉淀为下一期可复用 SOP。\n\n### （二）亏损交易｜负向技能纠错\n- 标的名称 + 代码：待补充。\n- 亏损根源技能定位：认知研判失误 / 选股技能缺陷 / 择时能力不足 / 仓位管理失控 / 纪律执行失效 / 情绪化操作。\n- 认知层面：是否错判市场周期、题材强度、资金情绪。\n- 选股层面：是否买入非主流杂毛、无板块联动、无资金抱团、逻辑不支撑标的。\n- 择时层面：是否逆势操作、高位追涨、节点踏错。\n- 仓位层面：是否重仓试错、亏损加仓、仓位与确定性不匹配。\n- 纪律层面：是否破位不止损、盈利不止盈、侥幸扛单、频繁换股。\n\n### （三）踏空/观望交易｜机会判断技能复盘\n- 当期确定性优质机会：待补充。\n- 踏空核心原因：主线识别滞后 / 龙头辨识度不足 / 恐高心理 / 持仓分散 / 等待过度。\n- 机会取舍技能优化：把可识别、可执行的机会转化为下期观察清单。\n\n## 六、个人交易技能短板汇总（系统性问题沉淀）\n1. 市场研判技能短板：需补充交易前对周期和量能的判断记录。\n2. 选股筛选技能短板：重点检查是否偏爱低位杂毛、龙头聚焦能力弱、只看价格不看逻辑。\n3. 买卖择时技能短板：重点检查启动期不敢进、高潮期盲目追、退潮期不愿走。\n4. 仓位管理技能短板：重点检查赚小钱轻仓、亏大钱重仓、无动态调仓逻辑。\n5. 风控纪律技能短板：重点检查止损不坚决、不会分批止盈、亏损后报复交易。\n6. 心态执行技能短板：重点检查贪婪拿不住、恐惧不敢上、侥幸扛亏损。\n\n## 七、当期成熟盈利技能固化（标准化动作沉淀）\n1. 行情适配技能：明确强势、震荡、弱势、混沌行情下的重仓、轻仓、空仓标准。\n2. 选股标准化技能：主线优先、龙头优先、联动优先，剔除无逻辑、无资金、无板块联动标的。\n3. 入场标准化技能：固定低吸/突破入场形态、量能条件和确认信号。\n4. 持仓标准化技能：跟踪板块联动、资金承接、关键均线和动态调仓条件。\n5. 止盈止损标准化技能：用支撑压力位、分批规则和极端行情预案约束操作。\n\n## 八、下期技能迭代计划（精准提升方案）\n### 1. 重点提升核心技能\n- 优先提升：主线甄别能力、仓位与确定性匹配能力。\n- 训练方法：每日复盘主线强度，记录每笔交易是否属于体系内机会。\n\n### 2. 新增交易技能规则\n- 选股：只做主线、龙头或板块联动明确的标的。\n- 择时：只在启动确认、分歧低吸或趋势回踩确认时入场。\n- 风控：单笔亏损达到预设阈值必须执行，不允许临盘改规则。\n- 仓位：仓位必须和行情确定性匹配，试错仓不得重仓。\n\n### 3. 禁止性交易红线\n1. 禁止无计划追高。\n2. 禁止亏损后情绪化加仓。\n3. 禁止无止损位开仓。\n\n### 4. 下期量化考核指标\n- 合规交易占比：目标 ≥ 80%。\n- 情绪化交易：目标降为 0。\n- 单笔亏损：控制在预设阈值内。\n- 整体盈亏比：目标 ≥ 1.5。\n\n## 九、技能成长总结与认知迭代\n1. 当期交易核心成长：从结果复盘转向技能复盘，关注动作是否可复制。\n2. 最致命的能力漏洞：没有数据记录时，无法判断问题来自认知、选股、择时、仓位还是纪律。\n3. 交易认知升级：稳定复利依赖机械化、标准化、纪律化交易，而不是单次盈亏。\n4. 长期技能迭代方向：聚焦可复制交易技能，弱化主观情绪，持续淘汰错误交易习惯。`,
  };

  return `# ${review.title}报告 - ${date}\n\n## 一、报告信息\n- 复盘类型：${review.title}\n- 报告风格：${styleText}\n- 复盘范围：${scope}\n- 生成说明：本报告基于当前页面样例行情、已选范围和用户点击的复盘类型生成，用于盘后归档和交易复盘。\n\n## 二、核心结论\n- 当前市场需要同时关注主线持续性、成交量配合和高位股反馈。\n- 已选范围会影响右侧选股结果，报告中的样例标的来自当前选股结果。\n- 后续操作应避免只看涨幅，需结合资金、位置、风险收益比做判断。\n\n## 关键标的概览\n| 股票代码 | 股票名称 | 最新 | 今日涨幅 |\n| --- | --- | --- | --- |\n${stockRows || '| - | 暂无数据 | - | - |'}\n\n${sections[review.title]}\n\n## 六、风险与免责声明\n- 以上内容为基于页面样例数据生成的复盘文本，不构成投资建议。\n- 真实交易需结合实时行情、基本面、资金流和个人风险承受能力独立判断。`;
}

function inferSector(stock: StockItem) {
  const name = stock.证券名称;
  if (/证券|中信|东方/.test(name)) return '非银金融 / 券商';
  if (/宁德|比亚迪|隆基|新能源|电池/.test(name)) return '新能源 / 电池链';
  if (/芯|立讯|电子|科技|中兴/.test(name)) return '半导体 / 消费电子';
  if (/药|康|医|生物/.test(name)) return '医药生物';
  if (/茅台|美的|消费/.test(name)) return '大消费';
  return '综合行业';
}

function buildAbnormalMovementReport(movementData: AbnormalMovementData, scope: string, userInput: string) {
  const generatedAt = getDateTime();
  const abnormalStocks = [...movementData.stocks]
    .sort((a, b) => Number(Boolean(b.是否持仓)) - Number(Boolean(a.是否持仓)) || Math.abs(b.涨幅) - Math.abs(a.涨幅))
    .slice(0, 5);
  const skillTitle = ABNORMAL_MOVEMENT_SKILL_TITLE;
  const templateTitle = ABNORMAL_REPORT_TITLE;

  if (abnormalStocks.length === 0) {
    return '【当前全市场无涨跌幅异常标的，无异动解读内容】';
  }

  const baseRows = abnormalStocks.map((stock) => {
    const absChange = Math.abs(stock.涨幅);
    const type = stock.涨幅 >= 0 ? (absChange >= 9 ? '强势拉升' : '放量上涨') : (absChange >= 5 ? '快速下跌' : '回撤异动');
    const turnover = stock.换手 ? `换手率 ${stock.换手.toFixed(2)}%` : '换手率待同步';
    const volume = stock.量比 ? `量比 ${stock.量比.toFixed(2)}` : '量比待同步';
    const amount = stock.成交额 ? `成交额 ${(stock.成交额 / 100_000_000).toFixed(2)}亿元` : turnover;
    const mainFlow = stock.主力净流入 === undefined ? volume : `主力净流入 ${(stock.主力净流入 / 100_000_000).toFixed(2)}亿元`;
    const displayName = stock.是否持仓 ? `【持仓】${stock.证券名称}` : stock.证券名称;
    return `| ${stock.证券代码} | ${displayName} | ${(stock as AbnormalMovementStock).所属板块 || inferSector(stock)} | ${type} | ${stock.涨幅 >= 0 ? '+' : ''}${stock.涨幅.toFixed(2)}% | ${absChange >= 5 ? '涨跌幅绝对值 >= 5%' : '当前全市场波动居前'} | ${amount} / ${mainFlow} |`;
  }).join('\n');

  const attributionRows = abnormalStocks.map((stock) => {
    const sector = (stock as AbnormalMovementStock).所属板块 || inferSector(stock);
    const cause = stock.直接诱因 || (stock.涨幅 >= 0 ? `${sector}方向资金关注度提升，短线情绪扩散` : `${sector}方向承压，短线资金兑现或避险偏好抬升`);
    const category = stock.诱因分类 || (stock.涨幅 >= 0 ? '资金驱动 / 情绪扩散' : '资金流出 / 风险偏好下降');
    const weight = Math.min(90, Math.max(45, Math.round(Math.abs(stock.涨幅) * 8 + (stock.量比 || 1) * 5)));
    const sentiment = Math.max(-10, Math.min(10, Math.round(stock.涨幅)));
    const confidence = Math.min(92, Math.max(60, 62 + Math.round(Math.abs(stock.涨幅) * 3)));
    const holdingPrefix = stock.是否持仓 ? '【持仓】' : '';
    return `| ${stock.证券代码} | ${holdingPrefix}${cause} | ${category} | ${stock.信息来源 || movementData.source} | ${weight}% | ${sentiment} | ${confidence} | 日内短效 |`;
  }).join('\n');

  const sectors = Array.from(new Set(abnormalStocks.map((stock) => stock.所属板块 || inferSector(stock)))).slice(0, 3);
  const avgChange = abnormalStocks.reduce((sum, stock) => sum + stock.涨幅, 0) / abnormalStocks.length;
  const leadingNames = abnormalStocks.slice(0, 3).map((stock) => stock.证券名称).join('、');
  const globalSentiment = Math.max(-10, Math.min(10, Math.round(avgChange)));

  return `# ${templateTitle}

- 生成时间：${generatedAt}
- 报告范围：${scope}
- 交易日期：${movementData.tradeDate || '最新可用交易日'}
- 数据来源：${movementData.source}${movementData.isRealData ? '' : '（接口不可用时回退）'}
- 触发来源：智询界面 / 异动解读快捷动作
- 调用技能：${ABNORMAL_MOVEMENT_SKILL_NAME}（${skillTitle}）
- 用户输入：${userInput}
- 生成说明：优先动态拉取真实行情、成交额、换手率、量比和资金流字段，再按 ${templateTitle} 模板生成；接口不可用时才回退到当前页面行情。

## 异动基础表征

| 股票代码 | 股票名称 | 所属板块 | 异动类型 | 区间涨跌幅 | 异动触发阈值 | 当日成交额 / 资金净流入 |
| --- | --- | --- | --- | --- | --- | --- |
${baseRows}

## 多维度归因拆解

| 股票代码 | 直接表层诱因 | 诱因分类 | 信息来源 | 影响权重 | 情绪值 | 置信度分值 | 诱因时效 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${attributionRows}

## 全局异动归因总结

| 全局归因主题 | 影响板块 / 标的 | 归因分类 | 核心证据 | 市场影响权重 | 情绪值 | 置信度分值 | 异动性质 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 短线资金集中交易波动居前标的 | ${sectors.join('、')} / ${leadingNames} | 资金驱动 / 情绪扩散 | 当前列表中波动居前标的集中在 ${sectors.join('、')}，平均涨跌幅 ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}% | 78% | ${globalSentiment} | 76 | 短期脉冲 |

## 短期异动影响小结

- 本次异动解读只解释短期异常波动和可能归因，不输出买卖建议、仓位建议或长期趋势判断。
- 当前可见异动主要来自涨跌幅居前标的的资金情绪扩散，仍需结合实时成交额、主力净流入、公告和新闻源复核。
- 若后续连续多日放量同向运行，可标记为趋势雏形，进一步交由趋势判断能力分析。`;
}

function markdownToPrintHtml(markdown: string) {
  const lines = markdown.split('\n');
  const htmlLines: string[] = [];
  let inList = false;
  let inTable = false;
  let tableRows: string[] = [];

  const closeList = () => {
    if (inList) {
      htmlLines.push('</ul>');
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      htmlLines.push('<table>');
      tableRows.forEach((row, index) => {
        const cells = row.replace(/^\||\|$/g, '').split('|').map((cell) => escapeHtml(cell.trim()));
        if (cells.every((cell) => /^[-: ]+$/.test(cell))) return;
        const tag = index === 0 ? 'th' : 'td';
        htmlLines.push(`<tr>${cells.map((cell) => `<${tag}>${cell}</${tag}>`).join('')}</tr>`);
      });
      htmlLines.push('</table>');
    }
    inTable = false;
    tableRows = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('|') && line.includes('|')) {
      closeList();
      inTable = true;
      tableRows.push(line);
      return;
    }

    closeTable();
    if (!line.trim()) {
      closeList();
      return;
    }
    if (line.startsWith('# ')) {
      closeList();
      htmlLines.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      closeList();
      htmlLines.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      closeList();
      htmlLines.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith('- ')) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      htmlLines.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    } else {
      closeList();
      htmlLines.push(`<p>${escapeHtml(line)}</p>`);
    }
  });

  closeList();
  closeTable();
  return htmlLines.join('\n');
}

function printReviewPdf(title: string, content: string) {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Songti SC', 'Heiti SC', Arial, sans-serif; color: #172033; line-height: 1.72; margin: 0; background: #eef2f7; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: #111827; color: #fff; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18); }
    .toolbar-title { font-size: 13px; font-weight: 600; }
    .toolbar button { border: 0; border-radius: 6px; padding: 7px 12px; background: #2563eb; color: #fff; font-size: 12px; cursor: pointer; }
    .page { max-width: 820px; min-height: 1120px; margin: 24px auto; padding: 42px 52px; background: #fff; box-shadow: 0 16px 48px rgba(15, 23, 42, 0.12); }
    h1 { font-size: 26px; margin: 0 0 18px; padding-bottom: 14px; border-bottom: 3px solid #1f4fd8; }
    h2 { font-size: 18px; color: #123a8c; margin-top: 24px; border-left: 4px solid #1f4fd8; padding-left: 10px; }
    h3 { font-size: 15px; color: #344054; margin-top: 18px; }
    p, li { font-size: 13px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
    th { background: #eef4ff; color: #123a8c; }
    th, td { border: 1px solid #d0d5dd; padding: 7px 9px; text-align: left; }
    ul { padding-left: 20px; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .page { max-width: none; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">${escapeHtml(title)}</div>
    <button onclick="window.print()">保存/打印 PDF</button>
  </div>
  <main class="page">${markdownToPrintHtml(content)}</main>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'width=960,height=720');
  if (!opened) {
    URL.revokeObjectURL(url);
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

interface Props {
  stocks?: StockItem[];
}

function holdingToStockItem(holding: typeof holdingStocks[number]): StockItem {
  return {
    序号: holding.序号,
    证券代码: holding.证券代码,
    证券名称: holding.证券名称,
    现价: holding.现价,
    涨幅: holding.今日涨幅,
    涨跌: 0,
    涨速: 0,
    换手: 0,
    最高: holding.现价,
    最低: holding.现价,
    今开: holding.现价,
    昨收: holding.现价,
    量比: 0,
  };
}

export default function AiChatPage({ stocks }: Props) {
  const defaultStocks = useMemo(() => holdingStocks.map(holdingToStockItem), []);
  const [liveHoldingStocks, setLiveHoldingStocks] = useState<StockItem[]>(defaultStocks);
  const displayStocks = useMemo(
    () => stocks && stocks.length > 0 ? [...stocks] : liveHoldingStocks,
    [liveHoldingStocks, stocks],
  );
  const isFiltered = !!stocks;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE, time: now() },
  ]);
  const [input, setInput] = useState('');
  const [resultQuery, setResultQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [reviewGeneratingTitle, setReviewGeneratingTitle] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamTimerRef = useRef<number | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ReportRecord[]>(() => [...loadSavedNotes(), ...initialRecords]);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showStockSelectionTemplates, setShowStockSelectionTemplates] = useState(false);
  const [selectedAction, setSelectedAction] = useState('筛选');
  const [selectionContextRules, setSelectionContextRules] = useState<StockSelectionContext | undefined>();
  const conversationEpochRef = useRef(0);
  const [shareMessageIndex, setShareMessageIndex] = useState<number | null>(null);
  const [savedMessageIndexes, setSavedMessageIndexes] = useState<Set<number>>(() => new Set());
  const [recordShareId, setRecordShareId] = useState<string | null>(null);
  const [isSharingReport, setIsSharingReport] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const [logoImage, setLogoImage] = useState<string | null>('/caitong-finance/logo.jpg');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultColumns = useMemo(() => getResultColumns(input.trim() || resultQuery), [input, resultQuery]);

  const quickPrompts: Record<string, string> = {
    筛选: '帮我筛选PE低于20的高成长电子股',
    异动: '今天券商板块为什么异动？',
    趋势: '分析一下当前大盘趋势和支撑位',
    价值: '分析腾讯(00700.HK):巴菲特看护城河和价格、芒格做逆向、段永平看生意和人、李录看十年确定性,主席综合共识和矛盾',
    复盘: '帮我复盘今天的市场情况',
    策略: '给我一个当前市场的配置策略建议',
    风控: '当前市场有哪些风险需要注意？',
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
  }, [messages, isTyping, isStreaming, reviewGeneratingTitle]);

  useEffect(() => {
    if (stocks && stocks.length > 0) return undefined;
    let active = true;
    const refreshHoldings = async () => {
      const holdings = await loadHoldingStocks(holdingStocks.map((holding) => ({
        证券代码: holding.证券代码,
        证券名称: holding.证券名称,
        持仓数量: holding.持仓数量,
        成本价: holding.成本价,
      })));
      if (active) setLiveHoldingStocks(holdings.map(holdingToStockItem));
    };
    void refreshHoldings();
    const refreshTimer = window.setInterval(refreshHoldings, 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [stocks]);

  useEffect(() => () => {
    if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);
  }, []);

  const copyShareContent = async (content: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  };

  const handleShare = async (platform: 'wechat' | 'feishu', content: string) => {
    const platformName = platform === 'wechat' ? '微信' : '飞书';
    try {
      await copyShareContent(content);
      setShareMessageIndex(null);

      if (typeof navigator.share === 'function' && navigator.maxTouchPoints > 0) {
        try {
          await navigator.share({ title: '财瞳金融 AI 回答', text: content });
          setShareNotice(`分享面板已打开，请选择${platformName}`);
        } catch (error) {
          const isCancelled = error instanceof DOMException && error.name === 'AbortError';
          setShareNotice(isCancelled ? '已取消分享，回答内容仍已复制' : `回答已复制，请打开${platformName}粘贴发送`);
        }
        window.setTimeout(() => setShareNotice(''), 3500);
        return;
      }

      setShareNotice(`回答已复制，正在尝试打开${platformName}，请在聊天中粘贴发送`);
      window.setTimeout(() => setShareNotice(''), 3500);

      const link = document.createElement('a');
      link.href = platform === 'wechat' ? 'weixin://' : 'feishu://';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setShareNotice('复制失败，请检查浏览器剪贴板权限后重试');
      window.setTimeout(() => setShareNotice(''), 3500);
    }
  };

  const handleCopyAnswer = async (content: string) => {
    try {
      await copyShareContent(content);
      setShareNotice('回答内容已复制');
    } catch {
      setShareNotice('复制失败，请检查浏览器剪贴板权限');
    }
    window.setTimeout(() => setShareNotice(''), 2500);
  };

  const handleSaveNote = (messageIndex: number, content: string) => {
    if (savedMessageIndexes.has(messageIndex)) {
      setShareNotice('这条回答已保存为笔记');
      window.setTimeout(() => setShareNotice(''), 2500);
      return;
    }

    const note: ReportRecord = {
      id: `note-${Date.now()}`,
      summary: getNoteSummary(content),
      time: getDateTime(),
      content,
      status: 'done',
    };
    setHistoryRecords((records) => {
      const nextRecords = [note, ...records];
      const savedNotes = nextRecords.filter((record) => record.id?.startsWith('note-'));
      window.localStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(savedNotes));
      return nextRecords;
    });
    setSavedMessageIndexes((indexes) => new Set(indexes).add(messageIndex));
    setShareNotice('已保存笔记，右侧记录已更新');
    window.setTimeout(() => setShareNotice(''), 2500);
  };

  const handleReportImageShare = async (platform: 'wechat' | 'feishu', report: ReportRecord) => {
    if (!report.content || isSharingReport) return;
    const platformName = platform === 'wechat' ? '微信' : '飞书';
    setIsSharingReport(true);
    setRecordShareId(null);
    setShareNotice('正在生成报告长图…');

    const renderTarget = document.createElement('article');
    renderTarget.style.cssText = 'position:fixed;left:-10000px;top:0;width:820px;padding:42px 52px;background:#121722;color:#d8deea;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",Arial,sans-serif;line-height:1.72;';
    renderTarget.innerHTML = `
      <style>
        .share-report h1{font-size:26px;color:#fff;border-bottom:3px solid #3b82f6;padding-bottom:14px}
        .share-report h2{font-size:18px;color:#60a5fa;margin-top:24px;border-left:4px solid #3b82f6;padding-left:10px}
        .share-report h3{font-size:15px;color:#d8deea;margin-top:18px}
        .share-report p,.share-report li{font-size:13px}.share-report table{border-collapse:collapse;width:100%;margin:12px 0;font-size:12px}
        .share-report th{background:#1e3a5f;color:#bfdbfe}.share-report th,.share-report td{border:1px solid #374151;padding:7px 9px;text-align:left}
      </style>
      <div class="share-report">
        <div style="font-size:11px;color:#60a5fa;letter-spacing:.08em">财瞳金融 · 智询报告</div>
        <div style="font-size:22px;font-weight:700;color:#fff;margin-top:6px">${escapeHtml(report.summary)}</div>
        <div style="font-size:11px;color:#6b7280;margin:4px 0 22px">${escapeHtml(report.time)}</div>
        ${markdownToPrintHtml(report.content)}
      </div>`;
    document.body.appendChild(renderTarget);

    try {
      const canvas = await html2canvas(renderTarget, {
        backgroundColor: '#121722',
        scale: 2,
        useCORS: true,
        logging: false,
        width: renderTarget.scrollWidth,
        height: renderTarget.scrollHeight,
        windowWidth: renderTarget.scrollWidth,
        windowHeight: renderTarget.scrollHeight,
      });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('图片生成失败')), 'image/png');
      });
      const safeTitle = report.summary.replace(/[\\/:*?"<>|]/g, '-');
      const file = new File([blob], `${safeTitle}.png`, { type: 'image/png' });
      const canNativeShare = typeof navigator.share === 'function'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [file] });

      if (canNativeShare) {
        try {
          await navigator.share({ title: report.summary, files: [file] });
          setShareNotice(`报告图片已调起系统分享，请选择${platformName}`);
        } catch (error) {
          const isCancelled = error instanceof DOMException && error.name === 'AbortError';
          setShareNotice(isCancelled ? '已取消分享' : '系统分享失败，正在下载报告图片');
          if (!isCancelled) downloadBlob(blob, `${safeTitle}.png`);
        }
      } else if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setShareNotice(`报告图片已复制，正在尝试打开${platformName}，请粘贴发送`);
        const link = document.createElement('a');
        link.href = platform === 'wechat' ? 'weixin://' : 'feishu://';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        downloadBlob(blob, `${safeTitle}.png`);
        setShareNotice(`报告图片已下载，请在${platformName}中发送`);
      }
    } catch {
      setShareNotice('报告图片生成失败，请稍后重试');
    } finally {
      renderTarget.remove();
      setIsSharingReport(false);
      window.setTimeout(() => setShareNotice(''), 4000);
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { role, content, time: now() }]);
  };

  const streamAssistantMessage = (content: string) => new Promise<void>((resolve) => {
    const epoch = conversationEpochRef.current;
    let visibleLength = 0;
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '', time: now() }]);

    streamTimerRef.current = window.setInterval(() => {
      if (conversationEpochRef.current !== epoch) {
        if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        resolve();
        return;
      }
      visibleLength = Math.min(visibleLength + 3, content.length);
      setMessages((prev) => prev.map((message, index) => (
        index === prev.length - 1 ? { ...message, content: content.slice(0, visibleLength) } : message
      )));

      if (visibleLength >= content.length) {
        if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        setIsStreaming(false);
        resolve();
      }
    }, 45);
  });

  const handleSend = (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isTyping) return;
    const intent = classifyBusinessIntent(trimmedText);
    setResultQuery(trimmedText);
    addMessage('user', trimmedText);
    setInput('');
    setIsTyping(true);
    setReviewGeneratingTitle(null);

    if (intent === 'value') {
      setTimeout(async () => {
        try {
          const data = await loadValueInvestingCommitteeReport(trimmedText);
          await streamAssistantMessage(data.report);
          const compactReport = buildCompactValueReport(data);
          const record: ReportRecord = {
            summary: `${data.company}价值投资委员会报告`,
            time: getDateTime(),
            content: compactReport,
          };
          setHistoryRecords((prev) => [record, ...prev]);
          setSelectedReport(record);
        } catch (error) {
          await streamAssistantMessage(`价值分析生成失败：${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
          setIsTyping(false);
        }
      }, 300);
      return;
    }

    if (/涨幅最高的板块|市场资金流向|短线关注/.test(trimmedText)) {
      setTimeout(async () => {
        try {
          const data = await loadMarketQuickInsights();
          await streamAssistantMessage(buildMarketQuickAnswer(trimmedText, data));
        } catch (error) {
          await streamAssistantMessage(`实时市场数据加载失败：${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
          setIsTyping(false);
        }
      }, 300);
      return;
    }

    if (intent === 'selection') {
      setTimeout(async () => {
        try {
          const previousSelectionReport = [...messages]
            .reverse()
            .find((message) => message.role === 'assistant' && message.content.includes('# A股自然语言量化选股报告'))?.content;
          const data = await loadStockSelectionReport(trimmedText, selectionContextRules, previousSelectionReport);
          if (data.parsedRules) setSelectionContextRules(data.parsedRules);
          await streamAssistantMessage(data.content);
        } catch (error) {
          await streamAssistantMessage(`标的筛选失败：${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
          setIsTyping(false);
        }
      }, 300);
      return;
    }

    if (intent === 'abnormal') {
      setTimeout(async () => {
        try {
          const scope = '全 A 股市场（持仓优先标记）';
          const movementData = await loadAbnormalMovementData(displayStocks);
          await streamAssistantMessage(buildAbnormalMovementReport(movementData, scope, trimmedText));
        } catch (error) {
          await streamAssistantMessage(`异动解读失败：${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
          setIsTyping(false);
        }
      }, 300);
      return;
    }

    if (intent === 'finance' || intent === 'smalltalk' || intent === 'unrelated') {
      setTimeout(async () => {
        try {
          await streamAssistantMessage(await loadGeneralChatAnswer(trimmedText, selectedAction));
        } catch {
          await streamAssistantMessage(OUT_OF_SCOPE_REPLY);
        } finally {
          setIsTyping(false);
        }
      }, 300);
      return;
    }

    const replyByIntent: Partial<Record<BusinessIntent, string>> = {
      trend: botReplies['趋势'],
      review: botReplies['复盘'],
      risk: botReplies['风控'],
    };
    const reply = replyByIntent[intent] || OUT_OF_SCOPE_REPLY;

    setTimeout(async () => {
      await streamAssistantMessage(reply);
      setIsTyping(false);
      if (intent === 'review') {
        const nowDate = new Date();
        const dateStr = nowDate.toLocaleDateString('zh-CN');
        const timeStr = nowDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const record: ReportRecord = {
          summary: `${dateStr}A股复盘分析报告`,
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
    if (key === '筛选') {
      setShowReviewModal(false);
      setShowStockSelectionTemplates(true);
    } else if (key === '复盘') {
      setShowStockSelectionTemplates(false);
      setShowReviewModal(true);
    } else if (key === '异动') {
      const prompt = quickPrompts[key] || '生成异动解读报告';
      const reportId = `${Date.now()}-异动解读`;
      const dateStr = new Date().toLocaleDateString('zh-CN');
      const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const pendingRecord: ReportRecord = {
        id: reportId,
        summary: `${dateStr}异动解读报告`,
        time: `${dateStr} ${timeStr}`,
        content: '',
        status: 'generating',
      };

      setInput(prompt);
      setResultQuery(prompt);
      setReviewGeneratingTitle('异动解读');
      setIsTyping(true);
      addMessage('user', prompt);
      setHistoryRecords((prev) => [pendingRecord, ...prev]);
      setSelectedReport(null);

      window.setTimeout(async () => {
        const scope = '全 A 股市场（持仓优先标记）';
        const movementData = await loadAbnormalMovementData(displayStocks);
        const reportContent = buildAbnormalMovementReport(movementData, scope, prompt);
        const record: ReportRecord = {
          ...pendingRecord,
          content: reportContent,
          status: 'done',
        };

        setReviewGeneratingTitle(null);
        setHistoryRecords((prev) => prev.map((item) => item.id === reportId ? record : item));
        await streamAssistantMessage(reportContent);
        setIsTyping(false);
      }, 900);
    } else {
      const prompt = quickPrompts[key] || '';
      setInput(prompt);
      setResultQuery(prompt);
    }
  };

  const handleStockSelectionTemplate = (template: StockSelectionTemplate) => {
    setShowStockSelectionTemplates(false);
    setInput(template.prompt);
    if (template.autoSubmit === false) return;
    setResultQuery(template.prompt);
    handleSend(template.prompt);
  };

  const handleReviewSelect = (review: ReviewOption) => {
    setShowReviewModal(false);
    setInput(review.prompt);
    setResultQuery(review.prompt);
    setReviewGeneratingTitle(review.title);
    setIsTyping(true);
    addMessage('user', review.prompt);

    const reportId = `${Date.now()}-${review.title}`;
    const nowDate = new Date();
    const dateStr = nowDate.toLocaleDateString('zh-CN');
    const timeStr = nowDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const pendingRecord: ReportRecord = {
      id: reportId,
      summary: `${dateStr}${review.title}报告`,
      time: `${dateStr} ${timeStr}`,
      content: '',
      status: 'generating',
    };
    setHistoryRecords((prev) => [pendingRecord, ...prev]);
    setSelectedReport(null);

    setTimeout(async () => {
      const scope = stocks && stocks.length > 0 ? '基于当前传入股票列表生成' : '未选择特定范围，基于全市场样例数据生成';
      const reportContent = buildReviewReport(review, displayStocks, scope);
      const record: ReportRecord = {
        id: reportId,
        summary: `${dateStr}${review.title}报告`,
        time: `${dateStr} ${timeStr}`,
        content: reportContent,
        status: 'done',
      };

      setReviewGeneratingTitle(null);
      setHistoryRecords((prev) => prev.map((item) => item.id === reportId ? record : item));
      setSelectedReport(null);
      await streamAssistantMessage(`已生成《${review.title}报告》，可点击右侧报告记录打开。`);
      setIsTyping(false);
    }, 900);
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

  const handleNewConversation = () => {
    conversationEpochRef.current += 1;
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setMessages([{ role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE, time: now() }]);
    setInput('');
    setResultQuery('');
    setSelectionContextRules(undefined);
    setSelectedReport(null);
    setSelectedAction('筛选');
    setSavedMessageIndexes(new Set());
    setShareMessageIndex(null);
    setReviewGeneratingTitle(null);
    setIsTyping(false);
    setIsStreaming(false);
    setShareNotice('');
  };

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      {shareNotice && (
        <div
          role="status"
          className="fixed left-1/2 top-12 z-[10000] -translate-x-1/2 rounded-lg border border-blue-500/30 bg-[#202638] px-4 py-2 text-xs text-[#E6EDF7] shadow-xl shadow-black/30"
        >
          {shareNotice}
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col bg-gradient-to-br from-indigo-900/20 via-gray-900 to-blue-900/20">
        <div className="flex h-11 flex-shrink-0 items-center justify-between border-b border-gray-700/50 px-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#E6EDF7]">
            <Bot size={15} className="text-blue-400" />
            <span>智询对话</span>
          </div>
          <button
            type="button"
            onClick={handleNewConversation}
            aria-label="新建对话"
            title="新建对话"
            className="flex items-center gap-1.5 rounded-md border border-gray-700/70 px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-300"
          >
            <MessageSquarePlus size={14} />
            <span>新建对话</span>
          </button>
        </div>
        <div className={`min-w-0 flex-1 p-4 ${messages.length > 1 ? 'overflow-auto scrollbar-thin space-y-4' : 'overflow-hidden'}`}>
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
              <div key={idx} className={`flex min-w-0 gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-blue-500/20">
                    <Bot size={13} className="text-white" />
                  </div>
                )}
                <div className={`${msg.role === 'user' ? 'items-end' : ''} min-w-0 max-w-[78%]`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-gray-500">{msg.role === 'assistant' ? 'AI助手' : '我'}</span>
                  </div>
                  <div
                    className={`max-w-full overflow-hidden px-4 py-2.5 text-xs leading-relaxed animate-[fadeIn_0.3s_ease] ${
                      msg.role === 'user'
                        ? 'whitespace-pre-wrap break-words bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-md shadow-md shadow-blue-500/20'
                        : 'whitespace-normal break-words bg-[#1E2230] text-[#E6EDF7] rounded-2xl rounded-tl-md border border-[#2C303A]/50'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderChatContent(msg.content) : msg.content}
                  </div>
                  {msg.role === 'assistant' && msg.content && !(isStreaming && idx === messages.length - 1) && (
                    <div className="mt-1 flex min-h-6 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopyAnswer(msg.content)}
                        aria-label="复制这条回答"
                        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-gray-500 transition-colors hover:bg-white/5 hover:text-blue-400"
                      >
                        <Copy size={11} />
                        复制
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNote(idx, msg.content)}
                        aria-label="保存这条回答为笔记"
                        className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors ${
                          savedMessageIndexes.has(idx)
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'text-gray-500 hover:bg-white/5 hover:text-blue-400'
                        }`}
                      >
                        <NotebookPen size={11} />
                        {savedMessageIndexes.has(idx) ? '已保存' : '保存笔记'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareMessageIndex((current) => current === idx ? null : idx)}
                        aria-expanded={shareMessageIndex === idx}
                        aria-label="分享这条回答"
                        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-gray-500 transition-colors hover:bg-white/5 hover:text-blue-400"
                      >
                        <Share2 size={11} />
                        分享
                      </button>
                      {shareMessageIndex === idx && (
                        <div className="flex items-center gap-1 rounded-lg border border-gray-700/70 bg-[#191D29] p-1 shadow-lg shadow-black/20">
                          <button
                            type="button"
                            onClick={() => void handleShare('wechat', msg.content)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-gray-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
                          >
                            <MessageCircle size={11} />
                            微信
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleShare('feishu', msg.content)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-gray-300 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                          >
                            <MessageSquare size={11} />
                            飞书
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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

          {isTyping && !isStreaming && (
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
                  <span className="text-secondary text-xs">
                    {reviewGeneratingTitle ? `正在生成${reviewGeneratingTitle}报告` : '正在分析'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="relative min-w-0 border-t border-gray-700/50 px-4 py-3">
          {showReviewModal && <AiReviewModal onClose={() => setShowReviewModal(false)} onSelect={handleReviewSelect} />}
          {showStockSelectionTemplates && (
            <StockSelectionTemplates
              onClose={() => setShowStockSelectionTemplates(false)}
              onSelect={handleStockSelectionTemplate}
            />
          )}
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

      <div className="w-72 flex-none bg-gradient-to-br from-indigo-900/20 via-gray-900 to-blue-900/20 border-l border-gray-700/50 flex flex-col overflow-hidden">
        {selectedReport ? (
          <>
            <div className="p-3 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText size={16} className="text-blue-400 flex-shrink-0" />
                <h3 className="text-white text-xs font-semibold truncate">{selectedReport.summary}</h3>
              </div>
              <div className="ml-2 flex items-center">
                <button
                  type="button"
                  aria-label="关闭报告"
                  onClick={() => {
                    setSelectedReport(null);
                  }}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-auto scrollbar-thin bg-[#121722]">
              <div className="min-w-0 bg-[#121722] p-3 text-xs text-neutral/90">
                <div className="mb-3 border-b border-gray-700/70 pb-3">
                  <div className="text-[10px] tracking-wider text-blue-400">财瞳金融 · 智询报告</div>
                  <h2 className="mt-1 text-sm font-semibold text-white">{selectedReport.summary}</h2>
                  <div className="mt-1 text-[10px] text-gray-500">{selectedReport.time}</div>
                </div>
                {renderChatContent(selectedReport.content)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-xs font-semibold">当前持仓</h3>
                <span className="text-blue-400 text-xs">
                  {displayStocks.length}{isFiltered ? '个股票' : '只持仓股票'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin border-b border-gray-700/50">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-[#1A1D23] z-10">
                  <tr className="text-secondary border-b border-gray-700/50">
                    {resultColumns.map((column) => (
                      <th key={column.key} className={`py-2 px-3 font-normal whitespace-nowrap ${column.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayStocks.map((s, idx) => {
                    return (
                      <tr key={`${s.证券代码}-${s.证券名称}`} className={`border-b border-gray-800 hover:bg-gray-700/30 cursor-pointer transition-colors ${idx%2===0?'bg-primary-bg':'bg-primary-chart'}`}>
                        {resultColumns.map((column) => (
                          <td
                            key={column.key}
                            className={`py-1.5 px-3 whitespace-nowrap ${column.align === 'right' ? 'text-right font-mono' : ''} ${column.className?.(s) || 'text-neutral'}`}
                          >
                            {column.render(s)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin px-3 py-2 border-t border-gray-700/50">
              <h3 className="text-white text-xs font-semibold mb-3">报告记录</h3>
              <div className="space-y-2">
                {historyRecords.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    role={rec.status !== 'generating' && rec.content ? 'button' : undefined}
                    tabIndex={rec.status !== 'generating' && rec.content ? 0 : undefined}
                    onClick={() => {
                      if (rec.status !== 'generating' && rec.content) printReviewPdf(rec.summary, rec.content);
                    }}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && rec.status !== 'generating' && rec.content) {
                        event.preventDefault();
                        printReviewPdf(rec.summary, rec.content);
                      }
                    }}
                    className={`relative rounded bg-[#242730] p-2 transition-colors ${
                      rec.status === 'generating'
                        ? 'opacity-80'
                        : rec.content
                          ? 'cursor-pointer hover:bg-gray-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500/60'
                          : 'opacity-60'
                    }`}
                  >
                    <div>
                      <p className="truncate text-xs text-neutral">{rec.summary}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs text-gray-500">{rec.time}</span>
                      {rec.status === 'generating' ? (
                        <span className="flex flex-shrink-0 items-center gap-1 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300">
                          <Loader2 size={10} className="animate-spin" />生成中
                        </span>
                      ) : (
                        <div className="relative flex flex-shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={!rec.content || isSharingReport}
                            onClick={(event) => {
                              event.stopPropagation();
                              setRecordShareId((current) => current === (rec.id || String(idx)) ? null : (rec.id || String(idx)));
                            }}
                            aria-expanded={recordShareId === (rec.id || String(idx))}
                            className="flex items-center gap-1 rounded border border-white/80 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white shadow-sm shadow-white/10 ring-1 ring-white/20 transition-all hover:border-white hover:bg-white/20 hover:shadow-white/20 disabled:cursor-not-allowed disabled:border-white/40 disabled:bg-white/5 disabled:text-white disabled:opacity-60 disabled:shadow-none disabled:ring-0"
                          >
                            {isSharingReport ? <Loader2 size={9} className="animate-spin" /> : <Share2 size={9} />}
                            分享
                          </button>
                          {recordShareId === (rec.id || String(idx)) && (
                            <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-6 z-30 w-24 rounded-lg border border-gray-700 bg-[#191D29] p-1 shadow-xl shadow-black/30">
                              <button type="button" onClick={() => void handleReportImageShare('wechat', rec)} className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[10px] text-gray-300 hover:bg-emerald-500/10 hover:text-emerald-400">
                                <MessageCircle size={11} />微信
                              </button>
                              <button type="button" onClick={() => void handleReportImageShare('feishu', rec)} className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[10px] text-gray-300 hover:bg-blue-500/10 hover:text-blue-400">
                                <MessageSquare size={11} />飞书
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
