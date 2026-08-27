import { StockItem } from '../types';

export interface TrendRow {
  ts_code: string;
  name: string;
  industry?: string;
  trend_type: '持续上涨' | '持续下跌' | '震荡走强' | '连板趋势';
  trend_period: '2日' | '3日' | '一周及以上';
  interval_pct_chg: number;
  limit_up_days?: number;
  slope?: number;
  fund_flow_days?: number;
  trend_stage: '启动' | '发酵' | '高潮' | '尾声';
  current_price?: number;
  latest_pct_chg?: number;
  is_holding?: boolean;
}

export interface TrendAnalysisData {
  tradeDate?: string;
  source: string;
  isRealData: boolean;
  fundamentalsSynced?: boolean;
  rows: TrendRow[];
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

function fallbackData(stocks: StockItem[]): TrendAnalysisData {
  const rows = stocks
    .filter((stock) => Math.abs(stock.涨幅) >= 3)
    .map((stock) => ({
      ts_code: stock.证券代码,
      name: stock.证券名称,
      industry: '页面当前行情未同步行业',
      trend_type: stock.涨幅 >= 0 ? '震荡走强' as const : '持续下跌' as const,
      trend_period: '2日' as const,
      interval_pct_chg: stock.涨幅,
      trend_stage: '启动' as const,
      current_price: stock.现价,
      latest_pct_chg: stock.涨幅,
      is_holding: true,
    }));
  return {
    source: '页面当前行情数据（缺少多日序列，降级展示）',
    isRealData: false,
    fundamentalsSynced: false,
    rows,
  };
}

export async function loadTrendAnalysisData(stocks: StockItem[]): Promise<TrendAnalysisData> {
  const fallback = fallbackData(stocks);
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return fallback;
  const focusCodes = stocks.map((stock) => stock.证券代码).filter(Boolean).join(',');
  try {
    const query = focusCodes ? `?focusCodes=${encodeURIComponent(focusCodes)}` : '';
    const response = await fetch(`${apiBaseUrl}/api/trend-analysis${query}`);
    if (!response.ok) throw new Error(`trend analysis request failed: ${response.status}`);
    const payload = await response.json() as { data?: TrendAnalysisData };
    if (!payload.data?.rows) return fallback;
    return { ...payload.data, rows: payload.data.rows.map((row) => ({ ...row, is_holding: focusCodes.split(',').includes(row.ts_code) })) };
  } catch {
    return fallback;
  }
}

function safe(value: unknown) {
  return String(value ?? '缺失').replace(/\|/g, '/').replace(/\s*\n+\s*/g, '；');
}

export function buildTrendAnalysisReport(data: TrendAnalysisData, scope: string, userInput: string) {
  const generatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  const rows = data.rows.slice(0, 8);
  if (rows.length === 0) return '【当前全市场无成型可持续交易趋势，无异动演化行情，暂无趋势研判内容】';
  const trendRows = rows.map((row) => `| ${safe(row.ts_code)} | ${row.is_holding ? `【持仓】${safe(row.name)}` : safe(row.name)} | ${safe(row.industry || '未分类行业')} | ${safe(row.trend_type)} | ${safe(row.trend_period)} | ${row.interval_pct_chg >= 0 ? '+' : ''}${row.interval_pct_chg.toFixed(2)}% | ${row.trend_type === '连板趋势' ? `${row.limit_up_days || 2}连板` : `多日同向运行，斜率 ${row.slope?.toFixed(2) || '待同步'}`} | ${safe(row.trend_stage)} |`).join('\n');
  const rootRows = rows.map((row) => {
    const positive = row.interval_pct_chg >= 0;
    const root = positive ? `${row.industry || '相关行业'}景气与资金关注度延续` : `${row.industry || '相关行业'}阶段承压，资金风险偏好下降`;
    const dimension = /新能源|电池|光伏/.test(row.industry || '') ? '产业链景气度' : /证券|金融/.test(row.industry || '') ? '行业政策红利' : '赛道逻辑';
    return `| ${safe(row.ts_code)} | ${root} | ${dimension} | ${positive ? '存在' : '减弱'} | ${data.isRealData ? '中' : '低'} | ${positive ? '中期' : '短期'} |`;
  }).join('\n');
  const sustainabilityRows = rows.map((row) => {
    const positive = row.interval_pct_chg >= 0;
    const risk = positive ? '高位波动、量能衰减或板块分化' : '趋势继续走弱、资金持续流出';
    return `| ${safe(row.ts_code)} | ${positive ? '多日同向涨幅与板块资金关注' : '连续走弱与资金承压'} | ${positive ? '是，根因暂未消失' : '否，根因正在减弱'} | ${positive ? '延续' : '震荡'} | ${positive ? '存在但不量化承诺' : '需等待企稳信号'} | ${risk} | ${positive ? '数周，需动态验证' : '短期临界'} |`;
  }).join('\n');
  const leaders = rows.slice(0, 3).map((row) => row.name).join('、');
  const sectors = [...new Set(rows.map((row) => row.industry || '未分类行业'))].slice(0, 4).join('、');
  return `# 趋势研判报告\n\n- 生成时间：${generatedAt}\n- 报告范围：${scope}\n- 交易日期：${data.tradeDate || '最新可用交易日'}\n- 数据来源：${data.source}${data.isRealData ? '' : '（接口不可用或数据不足时回退）'}\n- 触发来源：智询界面 / 趋势判断快捷动作\n- 调用技能：fi_trend_analysis（A股趋势研判与溯源分析 Skill）\n- 用户输入：${safe(userInput)}\n- 生成说明：只纳入满足多日斜率、连续运行或连板条件的成型趋势；单日异动应交由 fi_abnormal_movement。${data.fundamentalsSynced ? '' : ' 当前底层基本面数据未同步，仅基于行情与舆情做趋势研判，结论仅供参考。'}\n\n## 趋势形态表征\n\n| 股票代码 | 股票名称 | 所属板块 | 趋势类型 | 趋势周期 | 阶段累计涨跌幅 | 趋势形态特征 | 当前所处阶段 |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${trendRows}\n\n## 深度溯源分析\n\n| 股票代码 | 核心底层根因 | 溯源维度 | 根因存续状态 | 信息置信度 | 趋势支撑时效 |\n| --- | --- | --- | --- | --- | --- |\n${rootRows}\n\n## 可持续性预判\n\n| 股票代码 | 当前趋势动力 | 核心支撑逻辑是否存续 | 后续行情预判 | 潜在上涨空间 | 风险点 | 可持续周期预判 |\n| --- | --- | --- | --- | --- | --- | --- |\n${sustainabilityRows}\n\n## 全市场趋势小结\n\n- 核心主线趋势：当前成型趋势集中于 ${sectors}，代表标的为 ${leaders}。\n- 强势赛道：以多日同向运行、板块扩散和资金承接共同确认的方向为主。\n- 趋势衰竭板块：阶段涨幅过大但量能衰减、内部个股分化的方向需要警惕趋势尾声。\n- 短期情绪趋势：${rows.some((row) => row.trend_type === '连板趋势') ? '存在连板与情绪扩散，持续性依赖后续接力。' : '未将单日脉冲纳入趋势结论，短线情绪仅作辅助观察。'}\n- 中长期产业趋势：基本面与产业链字段未完全同步，暂不对长期景气作确定性承诺。\n- 具备持续博弈价值的核心标的与赛道：${leaders}及其所属板块，需持续验证根因、量价和资金一致性。\n\n> 本报告不提供具体买卖点、目标价、止损位或仓位配置，不构成投资建议。`;
}
