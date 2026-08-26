import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { URL } from 'node:url';
import { promisify } from 'node:util';
import {
  getEastmoneyBrokenBoardPool,
  getEastmoneyIndices,
  getEastmoneyKline,
  getEastmoneyLimitUpPool,
  getEastmoneyMarketQuotes,
  getEastmoneyMoneyflow,
  getEastmoneyQuotes,
  searchEastmoneyStocks,
} from './eastmoney-provider.mjs';
import { filterStockSelectionCandidates, parseStockSelectionRules as parseStockSelectionRulesCore } from './stock-selection-rules.mjs';
import { getTencentQuotes, getThsHotReasons } from './tencent-market-provider.mjs';

const execFileAsync = promisify(execFile);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '.env.local'));

const PORT = Number(process.env.PORT || 8787);
const TUSHARE_TOKEN = process.env.TUSHARE_TOKEN;
const TUSHARE_URL = 'https://api.tushare.pro';
const CACHE_TTL = 30_000;
const cache = new Map();
const STOCK_SELECTION_SNAPSHOT_PATH = path.join(os.tmpdir(), 'caitong-stock-selection-market.json');
const STOCK_SELECTION_SNAPSHOT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/responses';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

function sendJson(res, status, data) {
  res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const GENERAL_CHAT_SKILL_ROLES = {
  '筛选': '你是「标的筛选」助手，定位是将用户的自然语言条件转换为可执行的 A 股量化筛选条件，并解释筛选结果。',
  '异动': '你是「异动解读」助手，定位是识别 A 股个股、行业和市场的异常涨跌、连板与资金异动，并进行证据化归因。',
  '趋势': '你是「趋势判断」助手，定位是对已形成持续性的市场、行业或个股行情进行趋势研判、溯源和风险边界分析。',
  '价值': '你是「价值分析」助手，定位是从商业模式、护城河、管理层、财务质量和安全边际视角评估上市公司的长期价值。',
  '复盘': '你是「复盘总结」助手，定位是对 A 股市场、板块、个股和交易行为进行结构化复盘，形成可归档的总结。',
  '风控': '你是「风控提示」助手，定位是识别持仓与市场风险、进行风险分级和预警，并提供不构成投资承诺的风险应对建议。',
};

async function getGeneralChatAnswer(prompt = '', skill = '') {
  const input = String(prompt).trim();
  if (!input) throw new Error('问题不能为空');
  if (!OPENAI_API_KEY) throw new Error('通用模型未配置 OPENAI_API_KEY');
  const role = GENERAL_CHAT_SKILL_ROLES[String(skill)] || GENERAL_CHAT_SKILL_ROLES['筛选'];
  const instructions = `${role}当用户询问你的角色、身份、定位或能力时，必须严格以当前角色回答，不得介绍成其他模块或泛化的通用助手。对非本模块的通用问题仍可准确、简洁地回答；不确定时明确说明，不要编造信息。`;
  const usesChatCompletions = OPENAI_API_URL.includes('/chat/completions');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(usesChatCompletions
      ? {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: input },
        ],
      }
      : { model: OPENAI_MODEL, instructions, input }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || '通用模型请求失败');
  }
  const responseOutput = Array.isArray(payload.output)
    ? payload.output.flatMap((item) => Array.isArray(item.content) ? item.content : [])
      .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n')
    : '';
  const messageContent = payload.choices?.[0]?.message?.content;
  const content = typeof messageContent === 'string'
    ? messageContent
    : payload.output_text || responseOutput;
  if (!content?.trim()) throw new Error('通用模型未返回有效内容');
  return content.trim();
}

function parseValueInvestingTarget(prompt = '') {
  const text = String(prompt);
  const match = text.match(/分析\s*([^（(：:\s]+)\s*[（(：:]\s*([0-9A-Za-z.]+)\s*[）)]?/);
  if (!match) {
    throw new Error('无法识别分析标的，请使用格式：分析公司名(代码)，例如：分析滴普科技(01384.HK)');
  }
  const company = match[1];
  const rawSymbol = match[2].toUpperCase();
  let symbol = rawSymbol;
  if (/^\d{6}$/.test(rawSymbol)) {
    if (/^(4|8|92)/.test(rawSymbol)) symbol = `${rawSymbol}.BJ`;
    else if (/^(5|6|9)/.test(rawSymbol)) symbol = `${rawSymbol}.SH`;
    else symbol = `${rawSymbol}.SZ`;
  } else if (/^\d{5}$/.test(rawSymbol)) {
    symbol = `${rawSymbol}.HK`;
  }
  const market = symbol.endsWith('.HK') ? 'HK' : symbol.endsWith('.SZ') || symbol.endsWith('.SH') || symbol.endsWith('.BJ') ? 'A-share' : 'US';
  return { company, symbol, market };
}

function formatMaybeNumber(value, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '缺失';
  return value.toFixed(digits);
}

function getEvidenceFallbackSources(target) {
  const company = encodeURIComponent(target.company);
  const symbol = encodeURIComponent(target.symbol);
  const sources = [];

  if (target.market === 'HK') {
    const hkCode = target.symbol.replace('.HK', '').replace(/^0+/, '');
    sources.push(
      {
        title: 'HKEX 披露易公告搜索',
        url: `https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=zh&market=SEHK&stockId=${hkCode}`,
        note: '用于补充公告、年报、中报、回购、股权激励等正式披露。',
      },
      {
        title: 'HKEXnews 发行人文件入口',
        url: `https://www.hkexnews.hk/index_c.htm`,
        note: '当具体公告链接变动时，可用股票代码检索正式披露文件。',
      },
      {
        title: '公司名 + 股票代码 年报检索',
        url: `https://www.google.com/search?q=${company}+${symbol}+%E5%B9%B4%E6%8A%A5+annual+report`,
        note: '用于补充年报、分部收入、资本开支、管理层讨论与分析。',
      },
      {
        title: '公司名 + 股票代码 研报检索',
        url: `https://www.google.com/search?q=${company}+${symbol}+%E7%A0%94%E6%8A%A5+%E6%AF%9B%E5%88%A9%E7%8E%87+ROIC+%E8%B5%84%E6%9C%AC%E5%BC%80%E6%94%AF`,
        note: '用于补充行业格局、毛利率、ROIC、资本开支和竞争假设。',
      },
    );
  }

  if (target.symbol === '01810.HK' || target.company.includes('小米')) {
    sources.unshift(
      {
        title: '小米集团投资者关系',
        url: 'https://ir.mi.com/zh-hans/',
        note: '用于补充小米年报、中报、业绩公告、演示材料和管理层口径。',
      },
      {
        title: '小米集团财务报告',
        url: 'https://ir.mi.com/zh-hans/financial-information/financial-reports',
        note: '用于补充分部收入、智能手机/IoT/互联网服务/汽车业务表现与现金流说明。',
      },
    );
  }

  return sources;
}

function buildFallbackEvidenceSection(target, result) {
  const hasSearchEvidence = Array.isArray(result?.sources)
    && result.sources.some((source) => source.kind === 'search' && source.ok !== false);
  if (hasSearchEvidence) return '';

  const sources = getEvidenceFallbackSources(target);
  if (!sources.length) return '';

  return [
    '',
    '## 公告、年报、研报候选源',
    '| 来源 | 链接 | 用途 |',
    '| --- | --- | --- |',
    ...sources.map((source) => `| ${source.title} | ${source.url} | ${source.note} |`),
    '',
    '说明：当前运行环境没有可用的 `ddgs` 搜索源，报告已补入可追溯的公告、年报、IR 与研报检索入口；涉及资本开支、分部利润、管理层资本配置的结论仍需以上述正式披露继续核验。',
  ].join('\n');
}

function firstAnnualRow(rows = []) {
  return rows.find((row) => {
    const text = `${row.REPORT_TYPE || ''} ${row.REPORT_DATA_TYPE || ''} ${row.REPORT_TYPE_DETAILS || ''}`;
    return text.includes('FY') || text.includes('年报');
  }) || rows[0] || null;
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function enrichCashFlowMetrics(result, evidence) {
  const metrics = result?.metrics || {};
  if (metrics.operating_cash_flow !== null && metrics.operating_cash_flow !== undefined) return null;

  const indicator = firstAnnualRow(evidence?.financials?.indicators || []);
  if (!indicator) return null;

  const perOperatingCash = toFiniteNumber(indicator.PER_NETCASH_OPERATE);
  const holderProfit = toFiniteNumber(indicator.HOLDER_PROFIT ?? indicator.HOLDER_PROFITACTUAL);
  const eps = toFiniteNumber(indicator.BASIC_EPS);
  if (perOperatingCash === null || holderProfit === null || !eps) return null;

  const inferredShares = holderProfit / eps;
  if (!Number.isFinite(inferredShares) || inferredShares <= 0) return null;

  const operatingCashFlow = perOperatingCash * inferredShares;
  metrics.operating_cash_flow = operatingCashFlow;
  metrics.operating_cash_flow_inferred = true;
  metrics.operating_cash_flow_inference_note = '由 PER_NETCASH_OPERATE × (HOLDER_PROFIT / BASIC_EPS) 反推，需以年报现金流量表最终核验';
  result.metrics = metrics;
  result.data_gaps = (result.data_gaps || []).filter((gap) => !String(gap).includes('经营现金流总额'));

  return {
    inferredShares,
    operatingCashFlow,
    perOperatingCash,
    note: metrics.operating_cash_flow_inference_note,
  };
}

function buildDataCompletionSection(result, target) {
  const metrics = result?.metrics || {};
  const sources = Array.isArray(result?.sources) ? result.sources : [];
  const gaps = Array.isArray(result?.data_gaps) ? result.data_gaps : [];
  const fallbackSources = getEvidenceFallbackSources(target);
  const sourceOk = (kind, extra = {}) => sources.some((source) => (
    source.kind === kind
    && source.ok !== false
    && Object.entries(extra).every(([key, value]) => source[key] === value)
  ));
  const gapText = gaps.join('；') || '无';
  const rows = [
    ['最新价格', sourceOk('market_data') ? '已补全' : '仍缺失', `行情源：${metrics.latest_date || '未知日期'}，价格 ${formatMaybeNumber(metrics.latest_price)}`],
    ['EPS / PE', metrics.eps ? '已补全' : '仍缺失', `EPS ${formatMaybeNumber(metrics.eps)}，PE ${formatMaybeNumber(metrics.pe)}`],
    ['BVPS / PB', metrics.bvps ? '已补全' : '仍缺失', `BVPS ${formatMaybeNumber(metrics.bvps)}，PB ${formatMaybeNumber(metrics.pb)}`],
    ['收入', metrics.revenue ? '已补全' : '仍缺失', `收入 ${metrics.revenue ? formatMaybeNumber(metrics.revenue / 100000000, 2) + '亿' : '缺失'}`],
    ['经营现金流', metrics.operating_cash_flow ? (metrics.operating_cash_flow_inferred ? '估算补全' : '已补全') : (metrics.operating_cash_flow_per_share ? '部分补全' : '仍缺失'), metrics.operating_cash_flow ? `总额 ${formatMaybeNumber(metrics.operating_cash_flow, 0)}，每股 proxy ${formatMaybeNumber(metrics.operating_cash_flow_per_share)}${metrics.operating_cash_flow_inferred ? '；注：由每股经营现金流和 EPS/利润反推' : ''}` : `总额缺失；每股 proxy ${formatMaybeNumber(metrics.operating_cash_flow_per_share)} 已取得，仍需年报现金流量表核验总额`],
    ['资本开支', metrics.capex ? '已补全' : '仍缺失', metrics.capex ? `资本开支 ${formatMaybeNumber(metrics.capex, 0)}` : '当前数据源未返回可验证 capex，需从年报现金流量表“购建固定资产/无形资产”等项目补验'],
    ['外部证据', sourceOk('search') ? '已补全' : '已接入候选源', sourceOk('search') ? '已取得搜索证据' : `已补入 ${fallbackSources.length} 个公告/年报/IR/研报候选源，需人工或后续自动解析核验`],
  ];

  return [
    '',
    '## 数据逐项补全记录',
    '| 数据项 | 补全状态 | 结果 |',
    '| --- | --- | --- |',
    ...rows.map(([item, status, detail]) => `| ${item} | ${status} | ${detail} |`),
    '',
    `剩余缺口：${gapText}`,
  ].join('\n');
}

async function runValueInvestingCommittee(prompt) {
  const skillCandidates = [
    process.env.VALUE_INVESTING_SKILL_DIR,
    path.resolve(process.cwd(), 'skills', 'value-investing-committee'),
    path.join(os.homedir(), 'agent-skills', 'value-investing-committee'),
    path.join(os.homedir(), '.agents', 'skills', 'value-investing-committee'),
    path.join(os.homedir(), '.codex', 'skills', 'value-investing-committee'),
  ].filter(Boolean);
  const skillDir = skillCandidates.find((candidate) => (
    fs.existsSync(path.join(candidate, 'scripts', 'run_committee.py'))
  ));
  if (!skillDir) {
    throw new Error(`Value investing skill not found. Checked: ${skillCandidates.join(', ')}`);
  }
  const scriptPath = path.join(skillDir, 'scripts', 'run_committee.py');
  const localPython = path.resolve(process.cwd(), '.venv-ddgs/bin/python');
  const pythonBin = process.env.VALUE_INVESTING_PYTHON || (fs.existsSync(localPython) ? localPython : 'python3');

  const target = parseValueInvestingTarget(prompt);
  const executeCommittee = async (maxSearchResults) => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'value-investing-committee-'));
    await execFileAsync(pythonBin, [
      scriptPath,
      '--company',
      target.company,
      '--symbol',
      target.symbol,
      '--market',
      target.market,
      '--out',
      outDir,
      '--max-search-results',
      String(maxSearchResults),
    ], {
      cwd: skillDir,
      timeout: 120_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    return outDir;
  };

  let outDir;
  let searchFallback = false;
  try {
    outDir = await executeCommittee(5);
  } catch (searchError) {
    searchFallback = true;
    const detail = searchError instanceof Error ? searchError.message : String(searchError);
    console.warn(`[value-investing] Search-enabled execution failed, retrying without search: ${detail}`);
    try {
      outDir = await executeCommittee(0);
    } catch (fallbackError) {
      const fallbackDetail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error('[value-investing] Fallback execution failed:', fallbackError);
      throw new Error(`价值分析生成失败，搜索降级重试仍未成功：${fallbackDetail}`);
    }
  }

  const reportPath = path.join(outDir, 'report.md');
  const resultPath = path.join(outDir, 'result.json');
  const evidencePath = path.join(outDir, 'evidence.json');
  const result = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')) : null;
  const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, 'utf8')) : null;
  const cashFlowEnrichment = result ? enrichCashFlowMetrics(result, evidence) : null;
  if (!fs.existsSync(reportPath)) throw new Error('价值分析未生成报告文件');
  const report = fs.readFileSync(reportPath, 'utf8');
  const supplementalSections = result
    ? `${buildDataCompletionSection(result, target)}${cashFlowEnrichment ? `\n\n## 经营现金流估算说明\n- 估算股份数：${formatMaybeNumber(cashFlowEnrichment.inferredShares, 0)}\n- 每股经营现金流：${formatMaybeNumber(cashFlowEnrichment.perOperatingCash)}\n- 估算经营现金流总额：${formatMaybeNumber(cashFlowEnrichment.operatingCashFlow, 0)}\n- 说明：${cashFlowEnrichment.note}` : ''}\n${buildFallbackEvidenceSection(target, result)}`
    : '';
  return {
    ...target,
    report: supplementalSections ? `${report}\n${supplementalSections}` : report,
    result,
    outputDir: outDir,
    execution: {
      searchEnabled: !searchFallback,
      searchFallback,
    },
  };
}

function toTsCode(code) {
  const normalized = String(code).trim().toUpperCase();
  if (normalized.includes('.')) return normalized;
  if (normalized.startsWith('6') || normalized.startsWith('688') || normalized.startsWith('689')) return `${normalized}.SH`;
  return `${normalized}.SZ`;
}

function toLocalCode(tsCode) {
  return String(tsCode).split('.')[0];
}

async function tushare(apiName, params = {}, fields = '') {
  if (!TUSHARE_TOKEN) throw new Error('TUSHARE_TOKEN is not configured');
  const cacheKey = JSON.stringify({ apiName, params, fields });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  const response = await fetch(TUSHARE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_name: apiName, token: TUSHARE_TOKEN, params, fields }),
  });
  if (!response.ok) throw new Error(`Tushare HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== 0) throw new Error(payload.msg || `Tushare code ${payload.code}`);
  const items = payload.data?.items || [];
  const dataFields = payload.data?.fields || [];
  const data = items.map((row) => Object.fromEntries(dataFields.map((field, index) => [field, row[index]])));
  cache.set(cacheKey, { time: Date.now(), data });
  return data;
}

async function getLatestTradeDate() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const tradeDays = await tushare('trade_cal', { exchange: 'SSE', end_date: today, is_open: '1' }, 'cal_date,is_open');
  return tradeDays.map((row) => String(row.cal_date)).sort().at(-1) || today;
}

async function getRecentTradeDates(count) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const start = new Date();
  start.setDate(start.getDate() - Math.max(20, count * 3));
  const startDate = start.toISOString().slice(0, 10).replace(/-/g, '');
  const tradeDays = await tushare('trade_cal', { exchange: 'SSE', start_date: startDate, end_date: today, is_open: '1' }, 'cal_date,is_open');
  return tradeDays.map((row) => String(row.cal_date)).sort().slice(-count);
}

function dateBefore(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

async function getQuote(tsCode, nameMap) {
  const dailyRows = await tushare('daily', { ts_code: tsCode }, 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg');
  const latestDaily = dailyRows.sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)))[0];
  if (!latestDaily) {
    return {
      code: toLocalCode(tsCode),
      name: nameMap.get(tsCode) || toLocalCode(tsCode),
      price: 0,
      change: 0,
      pctChange: 0,
      speed: 0,
      turnoverRate: 0,
      high: 0,
      low: 0,
    };
  }
  const basicRows = await tushare('daily_basic', { ts_code: tsCode, trade_date: latestDaily.trade_date }, 'ts_code,turnover_rate');
  const basic = basicRows[0] || {};
  return {
    code: toLocalCode(tsCode),
    name: nameMap.get(tsCode) || toLocalCode(tsCode),
    price: Number(latestDaily.close || 0),
    change: Number(latestDaily.change || 0),
    pctChange: Number(latestDaily.pct_chg || 0),
    speed: 0,
    turnoverRate: Number(basic.turnover_rate || 0),
    high: Number(latestDaily.high || 0),
    low: Number(latestDaily.low || 0),
  };
}

async function getTushareQuotes(codes) {
  const tsCodes = codes.map(toTsCode);
  const stockRows = await tushare('stock_basic', { list_status: 'L' }, 'ts_code,name');
  const nameMap = new Map(stockRows.map((row) => [row.ts_code, row.name]));
  return Promise.all(tsCodes.map((tsCode) => getQuote(tsCode, nameMap)));
}

async function retryEastmoney(operation, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function getQuotes(codes) {
  try {
    const quotes = await retryEastmoney(() => getEastmoneyQuotes(codes));
    if (quotes.length > 0) return quotes;
  } catch (error) {
    console.warn(`Eastmoney quotes fallback: ${error instanceof Error ? error.message : error}`);
  }
  return getTushareQuotes(codes);
}

async function getMarketIndices() {
  try {
    const indices = await retryEastmoney(() => getEastmoneyIndices(), 2);
    return { indices, source: '东方财富', isFallback: false, updatedAt: new Date().toISOString() };
  } catch (error) {
    console.warn(`Eastmoney indices fallback: ${error instanceof Error ? error.message : error}`);
  }
  const definitions = [
    { code: '000001.SH', name: '上证指数' },
    { code: '399001.SZ', name: '深证成指' },
    { code: '000680.SH', name: '科创综指' },
    { code: '000300.SH', name: '沪深300' },
    { code: '399006.SZ', name: '创业板指' },
    { code: '000016.SH', name: '上证50' },
    { code: '000905.SH', name: '中证500' },
  ];
  const indices = await Promise.all(definitions.map(async (definition) => {
    const rows = await tushare('index_daily', { ts_code: definition.code }, 'ts_code,trade_date,close,change,pct_chg,amount');
    const latest = rows.sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)))[0];
    if (!latest) throw new Error(`Tushare index unavailable: ${definition.code}`);
    return {
      code: definition.code,
      name: definition.name,
      value: Number(latest.close || 0),
      change: Number(latest.change || 0),
      changePercent: Number(latest.pct_chg || 0),
      amount: Number(latest.amount || 0) * 1000,
      source: 'Tushare',
      tradeDate: latest.trade_date,
    };
  }));
  return { indices, source: 'Tushare（日线降级）', isFallback: true, updatedAt: new Date().toISOString() };
}

async function getStockDetail(code) {
  const tsCode = toTsCode(code);
  const quote = (await getQuotes([tsCode]))[0];
  const basicRows = await tushare('stock_basic', { ts_code: tsCode }, 'ts_code,name,market,industry,area,list_status');
  const basic = basicRows[0] || {};
  return {
    代码: toLocalCode(tsCode),
    名称: quote?.name || basic.name || toLocalCode(tsCode),
    现价: quote?.price || 0,
    涨跌: quote?.change || 0,
    涨跌幅: quote?.pctChange || 0,
    市场标识: [basic.market, basic.industry, basic.area].filter(Boolean).slice(0, 3),
    行情说明: `${quote?.source || 'Tushare'}最新行情${basic.list_status ? ` · ${basic.list_status}` : ''}`,
  };
}

async function getTushareChart(code, period = '1min') {
  const tsCode = toTsCode(code);
  const rows = await getKlineRows(tsCode, period);
  const sortedRows = [...rows].sort((a, b) => String(a.trade_time || a.trade_date).localeCompare(String(b.trade_time || b.trade_date)));
  return sortedRows.slice(-120).map((row) => ({
    time: String(row.trade_time || row.trade_date).match(/\d{2}:\d{2}/)?.[0] || String(row.trade_date || row.trade_time).slice(-4).replace(/(\d{2})(\d{2})/, '$1-$2'),
    price: Number(row.close || 0),
    open: Number(row.open || 0),
    close: Number(row.close || 0),
    high: Number(row.high || 0),
    low: Number(row.low || 0),
    pctChange: Number(row.pct_chg || 0),
    amplitude: Number(row.amplitude || 0),
    vol: Number(row.vol || 0),
    amount: Number(row.amount || 0),
  })).filter((row) => row.price > 0);
}

async function getChart(code, period = '1min') {
  try {
    const rows = await getEastmoneyKline(code, period, 180);
    const chart = rows.slice(-120).map((row) => ({
      time: String(row.trade_time || row.trade_date).match(/\d{2}:\d{2}/)?.[0]
        || String(row.trade_date || row.trade_time).slice(-4).replace(/(\d{2})(\d{2})/, '$1-$2'),
      price: Number(row.close || 0),
      open: Number(row.open || 0),
      close: Number(row.close || 0),
      high: Number(row.high || 0),
      low: Number(row.low || 0),
      pctChange: Number(row.pct_chg || 0),
      amplitude: Number(row.amplitude || 0),
      vol: Number(row.vol || 0),
      amount: Number(row.amount || 0),
    })).filter((row) => row.price > 0);
    if (chart.length > 0) return chart;
  } catch (error) {
    console.warn(`Eastmoney chart fallback: ${error instanceof Error ? error.message : error}`);
  }
  return getTushareChart(code, period);
}

async function getTushareMoneyflow(code) {
  const tsCode = toTsCode(code);
  const rows = await tushare('moneyflow', { ts_code: tsCode }, 'trade_date,buy_lg_amount,buy_elg_amount,sell_lg_amount,sell_elg_amount,buy_sm_amount,buy_md_amount,sell_sm_amount,sell_md_amount');
  rows.sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)));
  const row = rows[0] || {};
  const mainIn = Number(row.buy_lg_amount || 0) + Number(row.buy_elg_amount || 0);
  const mainOut = Number(row.sell_lg_amount || 0) + Number(row.sell_elg_amount || 0);
  const retailIn = Number(row.buy_sm_amount || 0) + Number(row.buy_md_amount || 0);
  const retailOut = Number(row.sell_sm_amount || 0) + Number(row.sell_md_amount || 0);
  const total = mainIn + mainOut + retailIn + retailOut || 1;
  return [
    { name: '主力流入', value: Number((mainIn / total * 100).toFixed(1)), color: '#FF4D4F', label: '主力流入' },
    { name: '主力流出', value: Number((mainOut / total * 100).toFixed(1)), color: '#52C41A', label: '主力流出' },
    { name: '散户流入', value: Number((retailIn / total * 100).toFixed(1)), color: '#FFAA00', label: '散户流入' },
    { name: '散户流出', value: Number((retailOut / total * 100).toFixed(1)), color: '#8C8F98', label: '散户流出' },
  ];
}

function flowShare(value, total) {
  return Number((Math.abs(value) / total * 100).toFixed(1));
}

async function getMoneyflow(code) {
  try {
    const flow = await getEastmoneyMoneyflow(code);
    const mainIn = Math.max(flow.main, 0);
    const mainOut = Math.abs(Math.min(flow.main, 0));
    const retailNet = flow.medium + flow.small;
    const retailIn = Math.max(retailNet, 0);
    const retailOut = Math.abs(Math.min(retailNet, 0));
    const total = mainIn + mainOut + retailIn + retailOut || 1;
    return [
      { name: '主力流入', value: flowShare(mainIn, total), color: '#FF4D4F', label: '主力流入' },
      { name: '主力流出', value: flowShare(mainOut, total), color: '#52C41A', label: '主力流出' },
      { name: '散户流入', value: flowShare(retailIn, total), color: '#FFAA00', label: '散户流入' },
      { name: '散户流出', value: flowShare(retailOut, total), color: '#8C8F98', label: '散户流出' },
    ];
  } catch (error) {
    console.warn(`Eastmoney moneyflow fallback: ${error instanceof Error ? error.message : error}`);
  }
  return getTushareMoneyflow(code);
}

async function getLatestDailyByCode(tsCode) {
  const rows = await safeTushare('daily', { ts_code: tsCode }, 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,amount');
  return rows.sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)))[0];
}

async function getMainNetFlow(tsCode, tradeDate) {
  const rows = await safeTushare('moneyflow', { ts_code: tsCode, trade_date: tradeDate }, 'trade_date,buy_lg_amount,buy_elg_amount,sell_lg_amount,sell_elg_amount');
  const row = rows[0] || {};
  return (Number(row.buy_lg_amount || 0) + Number(row.buy_elg_amount || 0) - Number(row.sell_lg_amount || 0) - Number(row.sell_elg_amount || 0)) * 10_000;
}

function fallbackEvidence(stock) {
  const flowDirection = Number(stock.主力净流入 || 0) >= 0 ? '净流入' : '净流出';
  return [
    {
      title: `主力资金${flowDirection}，量比${Number(stock.量比 || 0).toFixed(2)}`,
      source: stock.信息来源 || '行情与资金数据', category: '资金炒作', confidence: 5,
      publishedAt: stock.行情时间 || '',
    },
    {
      title: '短线交易拥挤或市场情绪扩散',
      source: '量价行为推断', category: '市场情绪', confidence: 4,
      publishedAt: stock.行情时间 || '',
    },
  ];
}

async function getAnnouncementEvidence(tsCode, tradeDate) {
  const endDate = String(tradeDate || '').replace(/-/g, '');
  const rows = await safeTushare('anns', { ts_code: tsCode, start_date: dateBefore(14), end_date: endDate }, 'ts_code,ann_date,title,url');
  return rows.slice(0, 2).map((row) => ({
    title: row.title || '公司公告', source: 'Tushare / 交易所公告', category: '公司公告',
    confidence: 9, publishedAt: row.ann_date || '', url: row.url,
  }));
}

async function attachAbnormalEvidence(stock, tradeDate, hotReason = '') {
  const evidence = [];
  if (hotReason) evidence.push({
    title: hotReason, source: '同花顺强势股题材归因', category: '市场情绪', confidence: 7,
    publishedAt: tradeDate,
  });
  const announcements = await getAnnouncementEvidence(toTsCode(stock.证券代码), tradeDate);
  evidence.push(...announcements);
  for (const item of fallbackEvidence(stock)) {
    if (evidence.length >= 3) break;
    evidence.push(item);
  }
  return {
    ...stock,
    直接诱因: evidence[0]?.title || '纯资金情绪炒作，无基本面 / 政策催化',
    诱因分类: evidence[0]?.category || '资金炒作',
    证据: evidence,
  };
}

async function enrichAbnormalRows(dailyRows, tradeDate) {
  const stockBasics = await safeTushare('stock_basic', { list_status: 'L' }, 'ts_code,name,industry');
  const basicMap = new Map(stockBasics.map((row) => [row.ts_code, row]));
  const basicRows = await safeTushare('daily_basic', { trade_date: tradeDate }, 'ts_code,turnover_rate,volume_ratio');
  const dailyBasicMap = new Map(basicRows.map((row) => [row.ts_code, row]));

  return Promise.all(dailyRows.map(async (row, index) => {
    const basic = basicMap.get(row.ts_code) || {};
    const dailyBasic = dailyBasicMap.get(row.ts_code) || {};
    const stock = {
      序号: index + 1,
      证券代码: toLocalCode(row.ts_code),
      证券名称: basic.name || row.name || toLocalCode(row.ts_code),
      现价: Number(row.close || 0),
      涨幅: Number(row.pct_chg || 0),
      涨跌: Number(row.change || 0),
      涨速: 0,
      换手: Number(dailyBasic.turnover_rate || 0),
      最高: Number(row.high || 0),
      最低: Number(row.low || 0),
      今开: Number(row.open || 0),
      昨收: Number(row.pre_close || 0),
      量比: Number(dailyBasic.volume_ratio || 0),
      所属板块: basic.industry || '未分类行业',
      成交额: Number(row.amount || 0) * 1000,
      主力净流入: await getMainNetFlow(row.ts_code, tradeDate),
      信息来源: 'Tushare daily / daily_basic / moneyflow',
    };
    return attachAbnormalEvidence(stock, tradeDate);
  }));
}

async function getTushareAbnormalMovement(codes) {
  const requestedCodes = codes.map(toTsCode);
  let tradeDate = await getLatestTradeDate();
  let dailyRows = [];

  if (requestedCodes.length > 0) {
    dailyRows = (await Promise.all(requestedCodes.map(getLatestDailyByCode))).filter(Boolean);
    tradeDate = dailyRows.map((row) => String(row.trade_date)).sort().at(-1) || tradeDate;
  } else {
    const probe = await getLatestDailyByCode('000001.SZ');
    tradeDate = String(probe?.trade_date || tradeDate);
    dailyRows = await safeTushare('daily', { trade_date: tradeDate }, 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,amount');
  }

  const topRows = dailyRows
    .filter((row) => row.ts_code && Number.isFinite(Number(row.pct_chg)))
    .sort((a, b) => Math.abs(Number(b.pct_chg || 0)) - Math.abs(Number(a.pct_chg || 0)))
    .slice(0, 8);
  const stocks = await enrichAbnormalRows(topRows, tradeDate);

  return {
    tradeDate,
    source: 'Tushare真实行情接口',
    isRealData: stocks.length > 0,
    stocks,
  };
}

function quoteToAbnormalStock(quote, index, source, industry = '') {
  const stock = {
    序号: index + 1,
    证券代码: quote.code,
    证券名称: quote.name,
    现价: quote.price,
    涨幅: quote.pctChange,
    涨跌: quote.change,
    涨速: quote.speed,
    换手: quote.turnoverRate,
    最高: quote.high,
    最低: quote.low,
    今开: quote.open,
    昨收: quote.preClose,
    量比: quote.volumeRatio,
    所属板块: quote.industry || '未分类行业',
    成交额: quote.amount,
    主力净流入: quote.mainNetFlow,
    行情时间: quote.quoteTime || '',
    信息来源: source,
  };
  return stock;
}

async function getAbnormalMovement(codes) {
  try {
    const probe = await getLatestDailyByCode('000001.SZ');
    const tradeDate = String(probe?.trade_date || await getLatestTradeDate());
    const hotRows = await getThsHotReasons(tradeDate);
    const hotMap = new Map(hotRows.map((row) => [row.code, row]));
    const requestedCodes = codes.length > 0 ? codes : hotRows.map((row) => row.code);
    const quotes = await getTencentQuotes(requestedCodes);
    const basics = await safeTushare('stock_basic', { list_status: 'L' }, 'ts_code,name,industry');
    const basicMap = new Map(basics.map((row) => [toLocalCode(row.ts_code), row]));
    const candidates = quotes
      .filter((quote) => !quote.isStale && Number.isFinite(quote.pctChange))
      .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
      .slice(0, 8);
    const stocks = await Promise.all(candidates.map(async (quote, index) => {
      const basic = basicMap.get(quote.code) || {};
      const stock = quoteToAbnormalStock({
        ...quote,
        mainNetFlow: await getMainNetFlow(toTsCode(quote.code), tradeDate),
      }, index, '腾讯财经实时行情 + Tushare资金流', basic.industry || '未分类行业');
      return attachAbnormalEvidence(stock, tradeDate, hotMap.get(quote.code)?.reason || '');
    }));
    if (stocks.length > 0) {
      return {
        tradeDate,
        source: '腾讯财经实时行情 + 同花顺题材归因 + Tushare资金流/公告',
        isRealData: true,
        stocks,
        dataStatus: { quote: '腾讯财经可用', catalyst: '同花顺/Tushare可用', eastmoney: '已移出主链' },
      };
    }
  } catch (error) {
    console.warn(`Tencent/THS abnormal movement fallback: ${error instanceof Error ? error.message : error}`);
  }
  return getTushareAbnormalMovement(codes);
}

async function getGroupPctChange(filterFn) {
  const rows = await tushare('stock_basic', { list_status: 'L' }, 'ts_code,symbol,name,industry,area,market');
  const members = rows.filter(filterFn).slice(0, 20);
  if (members.length === 0) return { pctChange: 0, count: 0 };
  const quotes = await getQuotes(members.map((row) => row.ts_code));
  const validQuotes = quotes.filter((quote) => Number.isFinite(quote.pctChange));
  if (validQuotes.length === 0) return { pctChange: 0, count: 0 };
  const pctChange = validQuotes.reduce((sum, quote) => sum + quote.pctChange, 0) / validQuotes.length;
  return { pctChange: Number(pctChange.toFixed(2)), count: validQuotes.length };
}

async function getRelatedBoards(code) {
  const tsCode = toTsCode(code);
  const basicRows = await tushare('stock_basic', { ts_code: tsCode }, 'ts_code,industry,area,market');
  const basic = basicRows[0] || {};
  let concepts = [];

  try {
    const conceptRows = await tushare('ths_member', { ts_code: tsCode }, 'ts_code,con_code,con_name');
    concepts = conceptRows.map((row) => ({ id: row.con_code || row.con_name, name: row.con_name })).filter((row) => row.id && row.name);
  } catch {
    concepts = [];
  }

  if (concepts.length === 0 && basic.industry) {
    concepts = [{ id: `concept:${basic.industry}`, name: basic.industry }];
  }

  const quote = (await getQuotes([tsCode]))[0];
  const [areaStats, industryStats, marketStats] = await Promise.all([
    basic.area ? getGroupPctChange((row) => row.area === basic.area) : Promise.resolve({ pctChange: 0, count: 0 }),
    basic.industry ? getGroupPctChange((row) => row.industry === basic.industry) : Promise.resolve({ pctChange: 0, count: 0 }),
    basic.market ? getGroupPctChange((row) => row.market === basic.market) : Promise.resolve({ pctChange: 0, count: 0 }),
  ]);
  const withQuoteFallback = (item) => ({ ...item, pctChange: quote?.pctChange || 0, count: 1 });

  return [
    { category: '地域板块', items: basic.area ? [{ id: `area:${basic.area}`, name: basic.area, ...areaStats }] : [] },
    { category: '概念板块', items: concepts.slice(0, 12).map(withQuoteFallback) },
    { category: '其他', items: [basic.industry && { id: `industry:${basic.industry}`, name: basic.industry, ...industryStats }, basic.market && { id: `market:${basic.market}`, name: basic.market, ...marketStats }].filter(Boolean) },
  ];
}

async function getBoardMembers(code) {
  const tsCode = toTsCode(code);
  const targetRows = await tushare('stock_basic', { ts_code: tsCode }, 'ts_code,name,industry');
  const target = targetRows[0];
  if (!target?.industry) return [];
  const rows = await tushare('stock_basic', { list_status: 'L' }, 'ts_code,symbol,name,industry');
  const members = rows.filter((row) => row.industry === target.industry).slice(0, 30);
  const memberCodes = members.map((row) => row.ts_code).filter(Boolean);
  const quotes = await getQuotes(memberCodes);
  const quoteMap = new Map(quotes.map((quote) => [toTsCode(quote.code), quote]));
  return members.map((row) => {
    const quote = quoteMap.get(row.ts_code);
    return {
      code: toLocalCode(row.ts_code),
      name: row.name,
      boardName: target.industry,
      price: quote?.price || 0,
      pctChange: quote?.pctChange || 0,
    };
  });
}

function limitTypeOf(row) {
  return String(row.limit || row.limit_type || row.limit_status || '').toUpperCase();
}

async function getLimitRows(tradeDate) {
  const fields = 'trade_date,ts_code,name,industry,close,pct_chg,first_time,last_time,open_times,limit_times,limit,limit_type';
  let rows = await safeTushare('limit_list_d', { trade_date: tradeDate, limit_type: 'U' }, fields);
  if (rows.length === 0) rows = await safeTushare('limit_list_d', { trade_date: tradeDate }, fields);
  return rows.filter((row) => {
    const type = limitTypeOf(row);
    return !type || type === 'U' || type === 'UP' || type === '涨停';
  });
}

async function isLimitUpOnDate(tsCode, tradeDate) {
  const [dailyRows, limitRows] = await Promise.all([
    safeTushare('daily', { ts_code: tsCode, trade_date: tradeDate }, 'ts_code,trade_date,close'),
    safeTushare('stk_limit', { ts_code: tsCode, trade_date: tradeDate }, 'ts_code,trade_date,up_limit'),
  ]);
  const close = Number(dailyRows[0]?.close || 0);
  const upLimit = Number(limitRows[0]?.up_limit || 0);
  return close > 0 && upLimit > 0 && close >= upLimit * 0.999;
}

async function getLimitStreak(tsCode, tradeDates) {
  let streak = 0;
  for (const tradeDate of [...tradeDates].reverse()) {
    if (await isLimitUpOnDate(tsCode, tradeDate)) streak += 1;
    else break;
  }
  return Math.max(streak, 1);
}

function normalizeTime(value) {
  const raw = String(value || '');
  if (!raw) return '--';
  const digits = raw.replace(/\D/g, '').padStart(6, '0');
  if (digits.length >= 6) return digits.slice(-6).replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');
  return raw;
}

function heatScore(stock, maxStreak) {
  const streakScore = maxStreak ? stock.连板数 / maxStreak * 50 : 0;
  const openScore = Math.max(0, 25 - stock.开板次数 * 4);
  const pctScore = Math.min(25, Math.abs(stock.涨幅) * 1.5);
  return Number(Math.min(99, streakScore + openScore + pctScore).toFixed(2));
}

async function getTushareHeatData() {
  const tradeDates = await getRecentTradeDates(14);
  const limitRowsByDate = await Promise.all(tradeDates.map((tradeDate) => getLimitRows(tradeDate)));
  const datedLimitRows = tradeDates
    .map((tradeDate, index) => ({ tradeDate, rows: limitRowsByDate[index] || [] }))
    .filter((item) => item.rows.length > 0);
  const effectiveTradeDates = datedLimitRows.map((item) => item.tradeDate);
  const effectiveLimitRows = datedLimitRows.map((item) => item.rows);
  const latestDate = effectiveTradeDates.at(-1) || tradeDates.at(-1) || await getLatestTradeDate();
  const limitSetByDate = effectiveLimitRows.map((rows) => new Set(rows.map((row) => row.ts_code).filter(Boolean)));
  const streakFor = (tsCode, endIndex) => {
    let streak = 0;
    for (let index = endIndex; index >= 0; index -= 1) {
      if (limitSetByDate[index].has(tsCode)) streak += 1;
      else break;
    }
    return Math.max(streak, 1);
  };
  const latestRows = effectiveLimitRows.at(-1) || [];
  const latestCodes = latestRows.slice(0, 80).map((row) => row.ts_code).filter(Boolean);
  const streakPairs = latestCodes.map((tsCode) => [tsCode, streakFor(tsCode, effectiveTradeDates.length - 1)]);
  const streakMap = new Map(streakPairs);
  const maxStreak = Math.max(...streakPairs.map(([, streak]) => Number(streak)), 1);

  const heatStocks = latestRows.slice(0, 80).map((row) => {
    const streak = Number(streakMap.get(row.ts_code) || 1);
    const stock = {
      代码: toLocalCode(row.ts_code),
      名称: row.name || toLocalCode(row.ts_code),
      现价: Number(row.close || 0),
      涨幅: Number(row.pct_chg || 0),
      首次涨停时间: normalizeTime(row.first_time || row.last_time),
      开板次数: Number(row.open_times || 0),
      明涨停概率: 0,
      连板数: streak,
      题材: [row.industry || 'Tushare涨停'].filter(Boolean),
    };
    stock.明涨停概率 = heatScore(stock, maxStreak);
    return stock;
  }).sort((a, b) => b.连板数 - a.连板数 || b.涨幅 - a.涨幅);

  const historyRows = await Promise.all(effectiveTradeDates.map(async (tradeDate, dateIndex) => {
    const rows = effectiveLimitRows[dateIndex] || [];
    const downRows = await safeTushare('limit_list_d', { trade_date: tradeDate, limit_type: 'D' }, 'trade_date,ts_code,limit,limit_type');
    const openRows = rows.filter((row) => Number(row.open_times || 0) > 0);
    const sampleCodes = rows.map((row) => row.ts_code).filter(Boolean);
    const dayStreaks = sampleCodes.map((tsCode) => streakFor(tsCode, dateIndex));
    const 连板数 = dayStreaks.filter((streak) => streak >= 2).length;
    const 非一字连板数 = rows.filter((row, index) => Number(row.open_times || 0) > 0 && Number(dayStreaks[index] || 1) >= 2).length;
    const 涨停家数 = rows.length;
    const 炸板率 = 涨停家数 ? Number((openRows.length / 涨停家数 * 100).toFixed(2)) : 0;
    const 成功率 = Number((100 - 炸板率).toFixed(2));
    const 热度 = Math.min(100, Math.round((涨停家数 / 80) * 50 + (Math.max(...dayStreaks, 0) / 10) * 30 + (成功率 / 100) * 20));
    return {
      date: String(tradeDate).slice(4).replace(/(\d{2})(\d{2})/, '$1-$2'),
      连板数,
      非一字连板数,
      成功率,
      炸板率,
      最高板: Math.max(...dayStreaks, 0),
      涨停家数,
      跌停家数: downRows.length,
      热度,
    };
  }));

  const industryMap = new Map();
  for (const stock of heatStocks) {
    const name = stock.题材[0] || '其他';
    const item = industryMap.get(name) || { 名称: name, 涨幅: 0, 最高连板: 0, 上涨家数: 0, 涨停家数: 0, 下跌家数: 0, 跌停家数: 0, 描述: '' };
    item.涨幅 += stock.涨幅;
    item.最高连板 = Math.max(item.最高连板, stock.连板数);
    item.上涨家数 += stock.涨幅 >= 0 ? 1 : 0;
    item.下跌家数 += stock.涨幅 < 0 ? 1 : 0;
    item.涨停家数 += 1;
    item.描述 = `${name}方向今日涨停${item.涨停家数}家，最高${item.最高连板}连板。数据来自 Tushare 涨跌停与行情接口。`;
    industryMap.set(name, item);
  }
  const subjectBlocks = [...industryMap.values()]
    .map((item) => ({ ...item, 涨幅: Number((item.涨幅 / Math.max(1, item.涨停家数)).toFixed(2)) }))
    .sort((a, b) => b.涨停家数 - a.涨停家数)
    .slice(0, 8);

  const selectedIndustry = heatStocks[0]?.题材[0];
  const similarStocks = heatStocks
    .filter((stock) => stock.题材[0] === selectedIndustry && stock.代码 !== heatStocks[0]?.代码)
    .slice(0, 8)
    .map((stock, index) => ({
      代码: stock.代码,
      名称: stock.名称,
      现价: stock.现价,
      涨幅: stock.涨幅,
      题材标签: stock.题材,
      相似度: Math.max(60, 96 - index * 5),
      行业地位: `${stock.题材[0]}涨停股，${stock.连板数}连板，热度由 Tushare 行情计算。`,
    }));

  return {
    tradeDate: latestDate,
    heatStocks,
    sentimentHistory: historyRows,
    subjectBlocks,
    similarStocks,
    source: {
      provider: 'tushare',
      label: 'Tushare（降级）',
      isFallback: true,
      detail: '涨跌停、连板与行情来自 Tushare；热度和明涨停概率为本地模型计算。',
      updatedAt: new Date().toISOString(),
    },
  };
}

async function getHeatData() {
  try {
    const recentSessions = [];
    for (let daysAgo = 0; daysAgo < 35 && recentSessions.length < 15; daysAgo += 1) {
      const date = dateBefore(daysAgo);
      const limitUpPool = await getEastmoneyLimitUpPool(date);
      if (limitUpPool.length === 0) continue;
      const brokenBoardPool = await getEastmoneyBrokenBoardPool(date);
      recentSessions.push({ date, limitUpPool, brokenBoardPool });
    }
    const latestSession = recentSessions[0];
    const tradeDate = latestSession?.date || '';
    const leaders = latestSession?.limitUpPool || [];
    if (leaders.length === 0) throw new Error('Eastmoney returned no limit-up pool');

    const maxStreak = Math.max(...leaders.map((stock) => stock.streak), 1);
    const sentimentHistory = [...recentSessions].reverse().map((session) => {
      const limitUpCount = session.limitUpPool.length;
      const brokenCount = session.brokenBoardPool.length;
      const attemptedCount = limitUpCount + brokenCount;
      const highestStreak = Math.max(...session.limitUpPool.map((stock) => stock.streak), 1);
      const nonOneWordCount = session.limitUpPool.filter((stock) => (
        stock.openCount > 0 || (stock.firstLimitTime !== '--' && stock.firstLimitTime > '09:30:00')
      )).length;
      const successRate = attemptedCount ? limitUpCount / attemptedCount * 100 : 0;
      const brokenRate = attemptedCount ? brokenCount / attemptedCount * 100 : 0;
      return {
        date: String(session.date).slice(4).replace(/(\d{2})(\d{2})/, '$1-$2'),
        连板数: session.limitUpPool.filter((stock) => stock.streak >= 2).length,
        非一字连板数: session.limitUpPool.filter((stock) => (
          stock.streak >= 2
          && (stock.openCount > 0 || (stock.firstLimitTime !== '--' && stock.firstLimitTime > '09:30:00'))
        )).length,
        成功率: Number(successRate.toFixed(2)),
        炸板率: Number(brokenRate.toFixed(2)),
        最高板: highestStreak,
        涨停家数: limitUpCount,
        跌停家数: 0,
        热度: Math.min(100, Math.round(
          limitUpCount / 80 * 45
          + highestStreak / 10 * 30
          + successRate / 100 * 25,
        )),
        非一字涨停数: nonOneWordCount,
      };
    });
    const heatStocks = leaders.map((stock) => ({
      代码: stock.code,
      名称: stock.name,
      现价: stock.price,
      涨幅: stock.pctChange,
      首次涨停时间: stock.firstLimitTime,
      开板次数: stock.openCount,
      明涨停概率: heatScore({
        连板数: stock.streak,
        开板次数: stock.openCount,
        涨幅: stock.pctChange,
      }, maxStreak),
      连板数: stock.streak,
      题材: [stock.industry],
    }));
    const industryMap = new Map();
    for (const stock of heatStocks) {
      const name = stock.题材[0];
      const item = industryMap.get(name) || {
        名称: name,
        涨幅: 0,
        最高连板: 1,
        上涨家数: 0,
        涨停家数: 0,
        下跌家数: 0,
        跌停家数: 0,
        描述: '',
      };
      item.涨幅 += stock.涨幅;
      item.最高连板 = Math.max(item.最高连板, stock.连板数);
      item.上涨家数 += 1;
      item.涨停家数 += 1;
      item.描述 = `${name}方向涨停${item.涨停家数}家，最高${item.最高连板}连板。原始数据来自东方财富涨停池。`;
      industryMap.set(name, item);
    }
    const subjectBlocks = [...industryMap.values()]
      .map((item) => ({ ...item, 涨幅: Number((item.涨幅 / item.涨停家数).toFixed(2)) }))
      .sort((a, b) => b.涨停家数 - a.涨停家数)
      .slice(0, 8);
    const selectedIndustry = heatStocks[0]?.题材[0];
    const similarStocks = heatStocks
      .filter((stock) => stock.题材[0] === selectedIndustry && stock.代码 !== heatStocks[0]?.代码)
      .slice(0, 8)
      .map((stock, index) => ({
        代码: stock.代码,
        名称: stock.名称,
        现价: stock.现价,
        涨幅: stock.涨幅,
        题材标签: stock.题材,
        相似度: Math.max(60, 96 - index * 5),
        行业地位: `${stock.题材[0]}涨停股，${stock.连板数}连板。原始数据来自东方财富涨停池。`,
      }));
    return {
      tradeDate,
      heatStocks,
      sentimentHistory,
      subjectBlocks,
      similarStocks,
      source: {
        provider: 'eastmoney',
        label: '东方财富',
        isFallback: false,
        detail: '最近15个交易日的涨停、炸板、封板时间、开板次数、连板数和行业来自东方财富；热度和明涨停概率为本地模型计算。',
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.warn(`Eastmoney heat fallback: ${error instanceof Error ? error.message : error}`);
  }
  return getTushareHeatData();
}

function parseStockSelectionRules(prompt) {
  const text = String(prompt || '');
  const numberAfter = (patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
    return null;
  };
  const peMax = numberAfter([/PE(?:TTM)?\s*(?:低于|小于|不高于|<|≤)\s*(\d+(?:\.\d+)?)/i, /市盈率\s*(?:低于|小于|不高于|<|≤)\s*(\d+(?:\.\d+)?)/]);
  const pbMax = numberAfter([/PB\s*(?:低于|小于|不高于|<|≤)\s*(\d+(?:\.\d+)?)/i, /市净率\s*(?:低于|小于|不高于|<|≤)\s*(\d+(?:\.\d+)?)/])
    ?? (text.includes('破净') ? 1 : null);
  const turnoverRateMin = numberAfter([/换手率\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)%?/]);
  const volumeRatioMin = numberAfter([/量比\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)/]);
  const totalMvMinYi = numberAfter([/总市值\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)\s*亿/]);
  const totalMvMaxYi = numberAfter([/总市值\s*(?:低于|小于|不高于|<|≤)\s*(\d+(?:\.\d+)?)\s*亿/]);
  const circMvMinYi = numberAfter([/流通市值\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)\s*亿/]);
  const circMvMaxYi = numberAfter([/流通市值\s*(?:低于|小于|不高于|<|≤)\s*(\d+(?:\.\d+)?)\s*亿/]);
  const revenueGrowthMin = numberAfter([/营收(?:同比)?(?:增长|增速)?\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)%?/])
    ?? (text.includes('高成长') ? 20 : null);
  const roeMin = numberAfter([/ROE\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)%?/i, /净资产收益率\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)%?/]);
  const industryKeywords = ['半导体', '消费电子', '电子', '新能源', '医药', '银行', '证券', '汽车', '通信', '计算机']
    .filter((keyword) => text.includes(keyword));
  const fundFlowMatch = text.match(/近\s*(\d+)\s*(?:个)?(?:交易)?日[^，,；;]*主力资金[^，,；;]*(?:净)?流入/);
  const mainNetInflowDays = fundFlowMatch ? Number(fundFlowMatch[1]) : null;
  const unsupportedConditions = [
    [/(成交额放大|放量)/, '成交额放大条件'],
    [/(均线|突破|RSI|MACD|超跌)/i, '技术形态条件'],
    [/(利润增长|净利润增长|毛利率)/, '利润或毛利率条件'],
  ].filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  if (pbMax === null && /(?:\bPB\b|市净率)/i.test(text)) unsupportedConditions.push('PB/市净率条件（未识别阈值）');
  if (turnoverRateMin === null && text.includes('换手率')) unsupportedConditions.push('换手率条件（未识别阈值）');
  if (volumeRatioMin === null && text.includes('量比')) unsupportedConditions.push('量比条件（未识别阈值）');
  if (totalMvMinYi === null && totalMvMaxYi === null && text.includes('总市值')) unsupportedConditions.push('总市值条件（未识别阈值或单位）');
  if (circMvMinYi === null && circMvMaxYi === null && text.includes('流通市值')) unsupportedConditions.push('流通市值条件（未识别阈值或单位）');
  return {
    peMax,
    pbMax,
    turnoverRateMin,
    volumeRatioMin,
    totalMvMinYi,
    totalMvMaxYi,
    circMvMinYi,
    circMvMaxYi,
    revenueGrowthMin,
    roeMin,
    industryKeywords,
    mainNetInflowDays,
    unsupportedConditions,
  };
}

function stockSelectionIndustryTerms(keywords) {
  const aliases = {
    电子: ['电子', '元器件', '半导体', '电器仪表', '通信设备', 'IT设备'],
    医药: ['医药', '医疗保健', '生物制药', '化学制药'],
    汽车: ['汽车', '汽车配件'],
    证券: ['证券', '多元金融'],
    新能源: ['新能源', '电气设备', '电源设备'],
  };
  return [...new Set(keywords.flatMap((keyword) => aliases[keyword] || [keyword]))];
}

function formatSelectionNumber(value, digits = 2) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '--';
}

async function getEastmoneyFinancialIndicator(code) {
  const url = new URL('https://datacenter.eastmoney.com/securities/api/data/v1/get');
  const params = {
    reportName: 'RPT_F10_FINANCE_MAINFINADATA',
    columns: 'ALL',
    filter: `(SECUCODE="${toTsCode(code)}")`,
    pageNumber: '1',
    pageSize: '8',
    sortTypes: '-1',
    sortColumns: 'REPORT_DATE',
    source: 'HSF10',
    client: 'PC',
  };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Referer: 'https://emweb.securities.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) throw new Error(`Eastmoney F10 HTTP ${response.status}`);
    const payload = await response.json();
    return payload?.result?.data?.[0] || null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getEastmoneyDailyFundFlow(code, days) {
  const localCode = toLocalCode(code);
  const market = localCode.startsWith('6') ? 1 : 0;
  const url = new URL('https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get');
  url.searchParams.set('secid', `${market}.${localCode}`);
  url.searchParams.set('fields1', 'f1,f2,f3,f7');
  url.searchParams.set('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65');
  url.searchParams.set('lmt', String(Math.max(days, 5)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Referer: 'https://quote.eastmoney.com/',
        Origin: 'https://quote.eastmoney.com',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    if (!response.ok) throw new Error(`Eastmoney fund flow HTTP ${response.status}`);
    const payload = await response.json();
    const rows = payload?.data?.klines || [];
    if (rows.length < days) throw new Error(`Eastmoney fund flow rows insufficient: ${rows.length}/${days}`);
    return {
      amount: rows.slice(-days).reduce((sum, line) => {
        const mainNet = Number(String(line).split(',')[1]);
        return sum + (Number.isFinite(mainNet) ? mainNet : 0);
      }, 0),
      source: '东方财富',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getTushareDailyFundFlow(code, days) {
  const rows = await safeTushare(
    'moneyflow',
    { ts_code: toTsCode(code) },
    'ts_code,trade_date,buy_lg_amount,buy_elg_amount,sell_lg_amount,sell_elg_amount',
  );
  const recentRows = rows
    .sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)))
    .slice(0, days);
  if (recentRows.length < days) throw new Error(`Tushare moneyflow rows insufficient: ${recentRows.length}/${days}`);
  return {
    amount: recentRows.reduce((sum, row) => sum + (
      Number(row.buy_lg_amount || 0)
      + Number(row.buy_elg_amount || 0)
      - Number(row.sell_lg_amount || 0)
      - Number(row.sell_elg_amount || 0)
    ) * 10_000, 0),
    source: 'Tushare',
  };
}

async function getRecentMainNetFlow(code, days) {
  try {
    return await getEastmoneyDailyFundFlow(code, days);
  } catch (eastmoneyError) {
    try {
      return await getTushareDailyFundFlow(code, days);
    } catch (tushareError) {
      const eastmoneyDetail = eastmoneyError instanceof Error ? eastmoneyError.message : String(eastmoneyError);
      const tushareDetail = tushareError instanceof Error ? tushareError.message : String(tushareError);
      throw new Error(`东方财富：${eastmoneyDetail}；Tushare：${tushareDetail}`);
    }
  }
}

async function getTushareSelectionMarketRows() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const calendarTradeDate = await getLatestTradeDate();
      const probeRows = await tushare('daily_basic', { ts_code: '000001.SZ' }, 'ts_code,trade_date');
      const latestDataTradeDate = probeRows
        .map((row) => String(row.trade_date || ''))
        .filter(Boolean)
        .sort()
        .at(-1);
      const candidateDates = [...new Set([calendarTradeDate, latestDataTradeDate].filter(Boolean))];
      const basicRows = await tushare('stock_basic', { list_status: 'L' }, 'ts_code,name,industry,list_status');
      let valuationRows = [];
      for (const tradeDate of candidateDates) {
        valuationRows = await tushare(
          'daily_basic',
          { trade_date: tradeDate },
          'ts_code,trade_date,close,turnover_rate,volume_ratio,pe,pe_ttm,pb,total_mv,circ_mv',
        );
        if (valuationRows.length >= 3000) break;
      }
      if (valuationRows.length < 3000) throw new Error(`Tushare daily_basic rows insufficient: ${valuationRows.length}`);
      const basicMap = new Map(basicRows.map((row) => [row.ts_code, row]));
      return valuationRows.map((row) => {
        const basic = basicMap.get(row.ts_code) || {};
        return {
          code: toLocalCode(row.ts_code),
          name: basic.name || toLocalCode(row.ts_code),
          price: Number(row.close || 0),
          pctChange: 0,
          turnoverRate: Number(row.turnover_rate || 0),
          volumeRatio: Number(row.volume_ratio || 0),
          industry: basic.industry || '',
          pe: Number(row.pe_ttm || row.pe || 0),
          pb: Number(row.pb || 0),
          totalMv: Number(row.total_mv || 0) * 10_000,
          circMv: Number(row.circ_mv || 0) * 10_000,
          source: 'Tushare',
        };
      });
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

function readStockSelectionSnapshot() {
  try {
    const snapshot = JSON.parse(fs.readFileSync(STOCK_SELECTION_SNAPSHOT_PATH, 'utf8'));
    const age = Date.now() - new Date(snapshot.updatedAt).getTime();
    if (!Array.isArray(snapshot.rows) || snapshot.rows.length < 3000 || age > STOCK_SELECTION_SNAPSHOT_MAX_AGE) return null;
    return snapshot;
  } catch {
    return null;
  }
}

function writeStockSelectionSnapshot(rows) {
  const snapshot = { updatedAt: new Date().toISOString(), rows };
  const tempPath = `${STOCK_SELECTION_SNAPSHOT_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot));
  fs.renameSync(tempPath, STOCK_SELECTION_SNAPSHOT_PATH);
  return snapshot.updatedAt;
}

async function getStockSelection(prompt) {
  const rules = parseStockSelectionRulesCore(prompt);
  const industryTerms = stockSelectionIndustryTerms(rules.industryKeywords);
  const marketRows = [];
  let marketSnapshotUpdatedAt = new Date().toISOString();
  let usedPersistedSnapshot = false;
  for (let startPage = 1; startPage <= 12; startPage += 3) {
    const pages = await Promise.allSettled(
      Array.from({ length: 3 }, (_, index) => getEastmoneyMarketQuotes(500, 'f12', startPage + index)),
    );
    const batch = pages.flatMap((page) => page.status === 'fulfilled' ? page.value : []);
    marketRows.push(...batch);
  }
  let usedTushareMarketFallback = false;
  if (marketRows.length < 3000) {
    try {
      const tushareRows = await getTushareSelectionMarketRows();
      const merged = new Map(tushareRows.map((row) => [row.code, row]));
      marketRows.forEach((row) => merged.set(row.code, row));
      marketRows.splice(0, marketRows.length, ...merged.values());
      usedTushareMarketFallback = true;
    } catch (error) {
      console.warn(`Tushare stock selection fallback: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (marketRows.length >= 3000) {
    try {
      marketSnapshotUpdatedAt = writeStockSelectionSnapshot(marketRows);
    } catch (error) {
      console.warn(`Stock selection snapshot write failed: ${error instanceof Error ? error.message : error}`);
    }
  } else {
    const snapshot = readStockSelectionSnapshot();
    if (snapshot) {
      const merged = new Map(snapshot.rows.map((row) => [row.code, row]));
      marketRows.forEach((row) => merged.set(row.code, row));
      marketRows.splice(0, marketRows.length, ...merged.values());
      marketSnapshotUpdatedAt = snapshot.updatedAt;
      usedPersistedSnapshot = true;
    }
  }
  if (marketRows.length === 0) throw new Error('实时全市场行情与最近成功快照均不可用，请稍后重试');

  let candidates = filterStockSelectionCandidates(marketRows, rules, industryTerms);
  candidates.sort((a, b) => (a.pe || Number.MAX_VALUE) - (b.pe || Number.MAX_VALUE));

  const needsFinancials = rules.revenueGrowthMin !== null || rules.roeMin !== null;
  let enriched = candidates.slice(0, needsFinancials ? 60 : 20).map((row) => ({ ...row, revenueGrowth: null, roe: null }));
  if (needsFinancials) {
    enriched = await Promise.all(enriched.map(async (row) => {
      let latest = null;
      try {
        latest = await getEastmoneyFinancialIndicator(row.code);
      } catch {
        const indicatorRows = await safeTushare(
          'fina_indicator',
          { ts_code: toTsCode(row.code) },
          'ts_code,end_date,ann_date,roe,q_sales_yoy,tr_yoy',
        );
        latest = indicatorRows.sort((a, b) => String(b.end_date || b.ann_date).localeCompare(String(a.end_date || a.ann_date)))[0] || null;
      }
      return {
        ...row,
        revenueGrowth: toFiniteNumber(latest?.TOTALOPERATEREVETZ ?? latest?.OI_YOYRATIO_PK ?? latest?.DJD_TOI_YOY ?? latest?.q_sales_yoy ?? latest?.tr_yoy),
        roe: toFiniteNumber(latest?.ROEJQ ?? latest?.ROEKCJQ ?? latest?.roe),
      };
    }));
  }

  const financialMatches = enriched.filter((row) => (
    (rules.revenueGrowthMin === null || (row.revenueGrowth !== null && row.revenueGrowth > rules.revenueGrowthMin))
    && (rules.roeMin === null || (row.roe !== null && row.roe > rules.roeMin))
  ));
  const fundFlowFailures = [];
  let fullyEnriched = financialMatches;
  if (rules.mainNetInflowDays !== null) {
    fullyEnriched = [];
    for (const [index, row] of financialMatches.entries()) {
      try {
        const fundFlow = await getRecentMainNetFlow(row.code, rules.mainNetInflowDays);
        fullyEnriched.push({ ...row, mainNetAmount: fundFlow.amount, fundFlowSource: fundFlow.source });
      } catch (error) {
        fundFlowFailures.push(`${row.code} ${row.name}：${error instanceof Error ? error.message : String(error)}`);
      }
      if (index < financialMatches.length - 1) await new Promise((resolve) => setTimeout(resolve, 1_050));
    }
  }
  const selected = fullyEnriched.filter((row) => (
    rules.mainNetInflowDays === null || (row.mainNetAmount !== null && row.mainNetAmount > 0)
  )).slice(0, 10);
  const generatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  const scope = rules.industryKeywords.length ? `${rules.industryKeywords.join('、')}行业` : '全市场';
  const parsedRows = [
    rules.peMax !== null ? `| PE低于${rules.peMax} | PE_TTM 小于阈值且为正 | pe_ttm / pe | < ${rules.peMax} |` : null,
    rules.pbMax !== null ? `| PB低于${rules.pbMax} | PB 小于阈值且为正 | pb | < ${rules.pbMax} |` : null,
    rules.turnoverRateMin !== null ? `| 换手率高于${rules.turnoverRateMin}% | 当日换手率 | turnover_rate | > ${rules.turnoverRateMin}% |` : null,
    rules.volumeRatioMin !== null ? `| 量比高于${rules.volumeRatioMin} | 当日量比 | volume_ratio | > ${rules.volumeRatioMin} |` : null,
    rules.totalMvMinYi !== null || rules.totalMvMaxYi !== null ? `| 总市值范围 | 实时总市值 | total_mv | ${rules.totalMvMinYi !== null ? `> ${rules.totalMvMinYi}亿` : ''}${rules.totalMvMinYi !== null && rules.totalMvMaxYi !== null ? ' 且 ' : ''}${rules.totalMvMaxYi !== null ? `< ${rules.totalMvMaxYi}亿` : ''} |` : null,
    rules.circMvMinYi !== null || rules.circMvMaxYi !== null ? `| 流通市值范围 | 实时流通市值 | circ_mv | ${rules.circMvMinYi !== null ? `> ${rules.circMvMinYi}亿` : ''}${rules.circMvMinYi !== null && rules.circMvMaxYi !== null ? ' 且 ' : ''}${rules.circMvMaxYi !== null ? `< ${rules.circMvMaxYi}亿` : ''} |` : null,
    rules.revenueGrowthMin !== null ? `| ${textIncludes(prompt, '高成长') ? '高成长' : '营收增长'} | 最新财报营收同比增长 | TOTALOPERATEREVETZ / q_sales_yoy | > ${rules.revenueGrowthMin}% |` : null,
    rules.roeMin !== null ? `| ROE高于${rules.roeMin}% | 最新财报净资产收益率 | roe | > ${rules.roeMin}% |` : null,
    rules.industryKeywords.length ? `| ${rules.industryKeywords.join('、')}股 | 行业分类同义映射 | industry | ${industryTerms.join(' / ')} |` : null,
    rules.mainNetInflowDays !== null ? `| 近${rules.mainNetInflowDays}日主力资金净流入 | 最近${rules.mainNetInflowDays}个交易日主力净额累计 | main_net_amount | > 0 |` : null,
  ].filter(Boolean);
  const factorRows = [
    rules.peMax !== null ? `1. 估值：\`pe_ttm/pe > 0 且 < ${rules.peMax}\`` : null,
    rules.pbMax !== null ? `2. 估值：\`pb > 0 且 < ${rules.pbMax}\`` : null,
    rules.turnoverRateMin !== null ? `3. 交易活跃度：\`turnover_rate > ${rules.turnoverRateMin}%\`` : null,
    rules.volumeRatioMin !== null ? `4. 交易活跃度：\`volume_ratio > ${rules.volumeRatioMin}\`` : null,
    rules.totalMvMinYi !== null || rules.totalMvMaxYi !== null ? `5. 总市值：${rules.totalMvMinYi !== null ? `\`> ${rules.totalMvMinYi}亿\`` : ''}${rules.totalMvMinYi !== null && rules.totalMvMaxYi !== null ? '，' : ''}${rules.totalMvMaxYi !== null ? `\`< ${rules.totalMvMaxYi}亿\`` : ''}` : null,
    rules.circMvMinYi !== null || rules.circMvMaxYi !== null ? `6. 流通市值：${rules.circMvMinYi !== null ? `\`> ${rules.circMvMinYi}亿\`` : ''}${rules.circMvMinYi !== null && rules.circMvMaxYi !== null ? '，' : ''}${rules.circMvMaxYi !== null ? `\`< ${rules.circMvMaxYi}亿\`` : ''}` : null,
    rules.revenueGrowthMin !== null ? `2. 成长：最新财报营收同比增长\`> ${rules.revenueGrowthMin}%\`` : null,
    rules.roeMin !== null ? `3. 盈利能力：最新财报\`roe > ${rules.roeMin}%\`` : null,
    rules.industryKeywords.length ? `4. 范围：行业分类匹配“${industryTerms.join('”或“')}”` : null,
    rules.mainNetInflowDays !== null ? `5. 资金：近${rules.mainNetInflowDays}个交易日主力净流入累计\`> 0\`` : null,
    '6. 默认风控过滤：剔除 ST/*ST、退市标的及无有效行情标的。',
  ].filter(Boolean);
  const stockRows = selected.length
    ? selected.map((row) => {
      const indicators = [
        `PE ${formatSelectionNumber(row.pe)}`,
        rules.pbMax !== null ? `PB ${formatSelectionNumber(row.pb)}` : null,
        rules.turnoverRateMin !== null ? `换手率 ${formatSelectionNumber(row.turnoverRate)}%` : null,
        rules.volumeRatioMin !== null ? `量比 ${formatSelectionNumber(row.volumeRatio)}` : null,
        rules.totalMvMinYi !== null || rules.totalMvMaxYi !== null ? `总市值 ${(row.totalMv / 100_000_000).toFixed(2)}亿` : null,
        rules.circMvMinYi !== null || rules.circMvMaxYi !== null ? `流通市值 ${(row.circMv / 100_000_000).toFixed(2)}亿` : null,
        row.revenueGrowth !== null ? `营收同比 ${formatSelectionNumber(row.revenueGrowth)}%` : null,
        row.roe !== null ? `ROE ${formatSelectionNumber(row.roe)}%` : null,
        rules.mainNetInflowDays !== null && row.mainNetAmount !== null
          ? `近${rules.mainNetInflowDays}日主力净流入 ${(row.mainNetAmount / 100_000_000).toFixed(2)}亿（${row.fundFlowSource}）`
          : null,
        `涨跌幅 ${formatSelectionNumber(row.pctChange)}%`,
      ].filter(Boolean).join('；');
      return `| ${toTsCode(row.code)} | ${row.name} | ${row.industry || '未分类'} | ${indicators} | 满足当前量化条件 |`;
    })
    : ['| -- | 当前条件下暂无匹配标的 | -- | 严格条件下无完整数据命中 | 未放宽用户阈值 |'];
  const fundFlowSources = [...new Set(fullyEnriched.map((row) => row.fundFlowSource).filter(Boolean))];
  const missingItems = [
    ...rules.unsupportedConditions.map((condition) => `- 未执行：${condition}，当前解析器尚未支持。`),
    ...fundFlowFailures.map((failure) => `- 资金数据缺失：${failure}`),
  ];
  const content = [
    '# A股自然语言量化选股报告',
    '',
    `- 生成时间：${generatedAt}`,
    `- 报告范围：${scope}`,
    `- 数据来源：${usedTushareMarketFallback ? '东方财富 + Tushare全市场行情与估值；' : '东方财富全市场行情与估值；'}东方财富F10财务指标，Tushare作为财务降级源${rules.mainNetInflowDays !== null ? `；近${rules.mainNetInflowDays}日主力资金来自${fundFlowSources.join(' + ') || '未取得数据'}` : ''}`,
    `- 行情快照：${new Date(marketSnapshotUpdatedAt).toLocaleString('zh-CN', { hour12: false })}${usedPersistedSnapshot ? '（数据源波动，使用最近成功快照）' : ''}`,
    '',
    '## 用户需求解析',
    '| 原始语义 | 量化解释 | Tushare字段 | 条件 |',
    '| --- | --- | --- | --- |',
    ...(parsedRows.length ? parsedRows : ['| 标的筛选 | 当前未识别明确阈值 | -- | 仅执行默认风控过滤 |']),
    '',
    '## 生效筛选因子',
    ...factorRows,
    '',
    '## 最终股票列表',
    '| 标的代码 | 标的名称 | 所属行业 | 核心匹配指标 | 入选/推荐原因 |',
    '| --- | --- | --- | --- | --- |',
    ...stockRows,
    '',
    '## 分析总结与推荐原因',
    `- 共扫描 ${marketRows.length} 只实时行情标的，严格匹配 ${selected.length} 只。`,
    '- 入选仅表示当前数据字段满足用户给定条件，不代表未来收益。',
    '',
    '## 风险提示',
    '本内容仅为量化选股数据筛选结果，不构成任何投资建议。',
    ...missingItems.map((item) => item.replace(/^- /, '- 数据完整性提示：')),
  ].join('\n');
  return { success: true, content, selectedStocks: selected, parsedRules: rules };
}

async function getTushareQuickInsightRows() {
  const probeRows = await tushare('daily', { ts_code: '000001.SZ' }, 'ts_code,trade_date');
  const tradeDate = probeRows.map((row) => String(row.trade_date || '')).filter(Boolean).sort().at(-1);
  if (!tradeDate) throw new Error('Tushare最新交易日不可用');
  const [dailyRows, basicRows, moneyflowRows] = await Promise.all([
    tushare('daily', { trade_date: tradeDate }, 'ts_code,trade_date,close,pct_chg,amount'),
    tushare('stock_basic', { list_status: 'L' }, 'ts_code,name,industry'),
    safeTushare('moneyflow', { trade_date: tradeDate }, 'ts_code,buy_lg_amount,buy_elg_amount,sell_lg_amount,sell_elg_amount'),
  ]);
  if (dailyRows.length < 1000) throw new Error(`Tushare全市场行情不足：${dailyRows.length}`);
  const basicMap = new Map(basicRows.map((row) => [row.ts_code, row]));
  const flowMap = new Map(moneyflowRows.map((row) => [row.ts_code, row]));
  return {
    tradeDate,
    rows: dailyRows.map((row) => {
      const basic = basicMap.get(row.ts_code) || {};
      const flow = flowMap.get(row.ts_code) || {};
      const mainNetFlow = (
        Number(flow.buy_lg_amount || 0) + Number(flow.buy_elg_amount || 0)
        - Number(flow.sell_lg_amount || 0) - Number(flow.sell_elg_amount || 0)
      ) * 1000;
      return {
        code: toLocalCode(row.ts_code),
        name: basic.name || toLocalCode(row.ts_code),
        price: Number(row.close || 0),
        pctChange: Number(row.pct_chg || 0),
        amount: Number(row.amount || 0) * 1000,
        mainNetFlow,
        industry: basic.industry || '',
      };
    }),
  };
}

async function getMarketQuickInsights() {
  let rows = [];
  for (let attempt = 0; attempt < 2 && rows.length < 1000; attempt += 1) {
    const pages = await Promise.allSettled(
      Array.from({ length: 12 }, (_, index) => getEastmoneyMarketQuotes(500, 'f12', index + 1)),
    );
    rows = [...new Map(
      pages
        .flatMap((page) => page.status === 'fulfilled' ? page.value : [])
        .filter((row) => row.code && row.price > 0)
        .map((row) => [row.code, row]),
    ).values()];
  }
  let source = '东方财富全市场实时行情';
  let tradeDate = '';
  if (rows.length < 1000) {
    try {
      const fallback = await getTushareQuickInsightRows();
      rows = fallback.rows;
      tradeDate = fallback.tradeDate;
      source = `Tushare最新交易日行情（${tradeDate}，东方财富实时接口暂不可用）`;
    } catch (error) {
      const snapshot = readStockSelectionSnapshot();
      if (!snapshot) throw error;
      rows = snapshot.rows;
      source = `最近成功全市场行情快照（${new Date(snapshot.updatedAt).toLocaleString('zh-CN', { hour12: false })}）`;
    }
  }

  const boardMap = new Map();
  for (const row of rows) {
    const boardName = row.industry || '未分类';
    const board = boardMap.get(boardName) || { name: boardName, changeSum: 0, totalAmount: 0, mainNetFlow: 0, stockCount: 0 };
    board.changeSum += Number(row.pctChange || 0);
    board.totalAmount += Number(row.amount || 0);
    board.mainNetFlow += Number(row.mainNetFlow || 0);
    board.stockCount += 1;
    boardMap.set(boardName, board);
  }
  const topBoards = [...boardMap.values()]
    .filter((board) => board.name !== '未分类' && board.stockCount >= 3)
    .map((board) => ({
      name: board.name,
      avgChange: Number((board.changeSum / board.stockCount).toFixed(2)),
      totalAmount: board.totalAmount,
      mainNetFlow: board.mainNetFlow,
      stockCount: board.stockCount,
    }))
    .sort((a, b) => b.avgChange - a.avgChange)
    .slice(0, 8);
  const activeStocks = rows
    .filter((row) => !String(row.name).includes('ST') && !String(row.name).includes('退'))
    .sort((a, b) => (b.pctChange * Math.log10(Math.max(b.amount, 10))) - (a.pctChange * Math.log10(Math.max(a.amount, 10))))
    .slice(0, 10);

  return {
    source,
    updatedAt: new Date().toISOString(),
    stockCount: rows.length,
    market: {
      riseCount: rows.filter((row) => row.pctChange > 0).length,
      fallCount: rows.filter((row) => row.pctChange < 0).length,
      flatCount: rows.filter((row) => row.pctChange === 0).length,
      totalAmount: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      mainNetFlow: rows.reduce((sum, row) => sum + Number(row.mainNetFlow || 0), 0),
    },
    topBoards,
    activeStocks,
  };
}

function textIncludes(value, keyword) {
  return String(value || '').includes(keyword);
}

function average(rows, key, end, size) {
  const start = Math.max(0, end - size + 1);
  const slice = rows.slice(start, end + 1).filter((row) => Number.isFinite(Number(row[key])));
  if (slice.length < size) return undefined;
  return slice.reduce((sum, row) => sum + Number(row[key]), 0) / slice.length;
}

function enrichKline(rows) {
  const sortedRows = [...rows].sort((a, b) => String(a.trade_date).localeCompare(String(b.trade_date)));
  let ema12 = 0;
  let ema26 = 0;
  let dea = 0;
  return sortedRows.map((row, index) => {
    const close = Number(row.close || 0);
    ema12 = index === 0 ? close : ema12 * 11 / 13 + close * 2 / 13;
    ema26 = index === 0 ? close : ema26 * 25 / 27 + close * 2 / 27;
    const dif = ema12 - ema26;
    dea = index === 0 ? dif : dea * 8 / 10 + dif * 2 / 10;
    const macd = (dif - dea) * 2;
    return {
      date: String(row.trade_date).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      open: Number(row.open || 0),
      high: Number(row.high || 0),
      low: Number(row.low || 0),
      close,
      volume: Number(row.vol || 0),
      amount: Number(row.amount || 0),
      ma5: average(sortedRows, 'close', index, 5),
      ma10: average(sortedRows, 'close', index, 10),
      ma20: average(sortedRows, 'close', index, 20),
      ma60: average(sortedRows, 'close', index, 60),
      volMa5: average(sortedRows, 'vol', index, 5),
      volMa10: average(sortedRows, 'vol', index, 10),
      dif,
      dea,
      macd,
    };
  });
}

function getQuarterlyProfit(incomeRows) {
  const seen = new Set();
  const rows = [...incomeRows]
    .filter((row) => row.end_date && row.n_income_attr_p !== undefined)
    .filter((row) => {
      if (seen.has(row.end_date)) return false;
      seen.add(row.end_date);
      return true;
    })
    .sort((a, b) => String(a.end_date).localeCompare(String(b.end_date)));
  return rows.map((row, index) => {
    const endDate = String(row.end_date);
    const year = endDate.slice(0, 4);
    const month = endDate.slice(4, 6);
    const current = Number(row.n_income_attr_p || 0);
    const previousSameYear = [...rows.slice(0, index)].reverse().find((item) => String(item.end_date).slice(0, 4) === year);
    const quarterProfit = month === '03' || !previousSameYear ? current : current - Number(previousSameYear.n_income_attr_p || 0);
    return {
      date: `${year}Q${Math.max(1, Math.ceil(Number(month) / 3))}`,
      value: Number((quarterProfit / 100000000).toFixed(2)),
    };
  }).slice(-8);
}

async function safeTushare(apiName, params, fields) {
  try {
    return await tushare(apiName, params, fields);
  } catch {
    return [];
  }
}

async function getTushareKlineRows(tsCode, period) {
  const normalized = String(period || '日');
  const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  if (normalized === '周') return safeTushare('weekly', { ts_code: tsCode, start_date: dateBefore(365 * 3), end_date: endDate }, 'ts_code,trade_date,open,high,low,close,vol,amount');
  if (normalized === '月') return safeTushare('monthly', { ts_code: tsCode, start_date: dateBefore(365 * 8), end_date: endDate }, 'ts_code,trade_date,open,high,low,close,vol,amount');
  if (normalized === '季' || normalized === '年') return safeTushare('monthly', { ts_code: tsCode, start_date: dateBefore(365 * 12), end_date: endDate }, 'ts_code,trade_date,open,high,low,close,vol,amount');
  if (['分时', '5日', '1min', '5min', '15min', '30min', '60min'].includes(normalized)) {
    const freq = normalized === '5min' ? '5min' : normalized === '15min' ? '15min' : normalized === '30min' ? '30min' : normalized === '60min' ? '60min' : '1min';
    const dates = normalized === '5日' ? await getRecentTradeDates(5) : [await getLatestTradeDate()];
    const chunks = await Promise.all(dates.map((tradeDate) => safeTushare('stk_mins', { ts_code: tsCode, trade_date: tradeDate, freq }, 'trade_time,open,high,low,close,vol,amount')));
    const rows = chunks.flat();
    if (rows.length > 0) return rows.map((row) => ({ ...row, trade_date: String(row.trade_time).slice(0, 8) }));
  }
  return safeTushare('daily', { ts_code: tsCode, start_date: dateBefore(365), end_date: endDate }, 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount');
}

async function getKlineRows(tsCode, period) {
  try {
    const rows = await getEastmoneyKline(tsCode, period, 360);
    if (rows.length > 0) return rows;
  } catch (error) {
    console.warn(`Eastmoney kline fallback: ${error instanceof Error ? error.message : error}`);
  }
  return getTushareKlineRows(tsCode, period);
}

async function getStockNews(tsCode, name) {
  const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const annRows = await safeTushare('anns', { ts_code: tsCode, start_date: dateBefore(365 * 3), end_date: endDate }, 'ts_code,ann_date,title,url');
  if (annRows.length > 0) return annRows.slice(0, 30).map((row) => ({
    datetime: row.ann_date || row.pub_time || '',
    title: row.title || `${name}相关资讯`,
    source: 'Tushare公告',
    url: row.url,
  }));

  const localCode = toLocalCode(tsCode);
  const majorRows = await safeTushare('major_news', {}, 'pub_time,title,src,url');
  return majorRows
    .filter((row) => String(row.title || '').includes(name) || String(row.title || '').includes(localCode))
    .slice(0, 30)
    .map((row) => ({
      datetime: row.pub_time || '',
      title: row.title || `${name}相关资讯`,
      source: row.src || 'Tushare新闻',
      url: row.url,
    }));
}

async function getFullDetail(code, period = '日') {
  const tsCode = toTsCode(code);
  const localCode = toLocalCode(tsCode);
  const [quote] = await getQuotes([tsCode]);
  const [basicRows, companyRows, dailyRows, klineRows, dailyBasicRows, limitRows, incomeRows, financeRows, holderRows, marginRows, dividendRows, blockRows, moneyflowRows] = await Promise.all([
    safeTushare('stock_basic', { ts_code: tsCode }, 'ts_code,name,market,industry,area,total_share,float_share'),
    safeTushare('stock_company', { ts_code: tsCode }, 'ts_code,chairman,manager,secretary,reg_capital,setup_date,province,city,introduction,website,email,office,employees,main_business,business_scope'),
    safeTushare('daily', { ts_code: tsCode }, 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount'),
    getKlineRows(tsCode, period),
    safeTushare('daily_basic', { ts_code: tsCode }, 'ts_code,trade_date,turnover_rate,volume_ratio,pe,pe_ttm,pb,total_mv,circ_mv'),
    safeTushare('stk_limit', { ts_code: tsCode }, 'ts_code,trade_date,up_limit,down_limit'),
    safeTushare('income', { ts_code: tsCode }, 'ts_code,end_date,total_revenue,n_income_attr_p,non_oper_income'),
    safeTushare('fina_indicator', { ts_code: tsCode }, 'ts_code,end_date,grossprofit_margin,netprofit_margin,roe,debt_to_assets'),
    safeTushare('stk_holdernumber', { ts_code: tsCode }, 'ts_code,end_date,holder_num'),
    safeTushare('margin_detail', { ts_code: tsCode }, 'trade_date,rzye,rqyl,rzmre'),
    safeTushare('dividend', { ts_code: tsCode }, 'end_date,ann_date,div_proc,stk_div,cash_div_tax'),
    safeTushare('block_trade', { ts_code: tsCode }, 'trade_date,price,vol,amount'),
    safeTushare('moneyflow', { ts_code: tsCode }, 'trade_date,buy_lg_amount,buy_elg_amount,sell_lg_amount,sell_elg_amount,buy_sm_amount,buy_md_amount,sell_sm_amount,sell_md_amount'),
  ]);

  const basic = basicRows[0] || {};
  const company = companyRows[0] || {};
  const newsRows = await getStockNews(tsCode, quote?.name || basic.name || localCode);
  const sortedDaily = dailyRows.sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)));
  const latestDaily = sortedDaily[0] || {};
  const latestBasic = dailyBasicRows.sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)))[0] || {};
  const latestLimit = limitRows.sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)))[0] || {};
  const latestIncome = incomeRows.sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0] || {};
  const latestFinance = financeRows.sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0] || {};
  const latestHolder = holderRows.sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0] || {};
  const prevHolder = holderRows.sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[1] || {};
  const row = moneyflowRows.sort((a, b) => String(b.trade_date).localeCompare(String(a.trade_date)))[0] || {};
  const mainIn = Number(row.buy_lg_amount || 0) + Number(row.buy_elg_amount || 0);
  const mainOut = Number(row.sell_lg_amount || 0) + Number(row.sell_elg_amount || 0);
  const retailIn = Number(row.buy_sm_amount || 0) + Number(row.buy_md_amount || 0);
  const retailOut = Number(row.sell_sm_amount || 0) + Number(row.sell_md_amount || 0);
  const flowTotal = mainIn + mainOut + retailIn + retailOut || 1;
  const price = quote?.price || Number(latestDaily.close || 0);

  return {
    profile: {
      code: localCode,
      name: quote?.name || basic.name || localCode,
      price,
      change: quote?.change || Number(latestDaily.change || 0),
      pctChange: quote?.pctChange || Number(latestDaily.pct_chg || 0),
      tags: ['融通', basic.market || 'A股'].filter(Boolean),
      open: Number(latestDaily.open || 0),
      high: Number(latestDaily.high || 0),
      low: Number(latestDaily.low || 0),
      avg: Number(((Number(latestDaily.high || 0) + Number(latestDaily.low || 0) + price) / 3).toFixed(2)),
      upLimit: Number(latestLimit.up_limit || 0),
      downLimit: Number(latestLimit.down_limit || 0),
      volumeRatio: Number(latestBasic.volume_ratio || 0),
      pe: Number(latestBasic.pe || 0),
      amount: Number(latestDaily.amount || 0),
      totalMv: Number(latestBasic.total_mv || 0),
      circMv: Number(latestBasic.circ_mv || 0),
      totalShare: Number(basic.total_share || 0),
      floatShare: Number(basic.float_share || 0),
      quarterlyProfit: getQuarterlyProfit(incomeRows),
    },
    kline: enrichKline((klineRows.length > 0 ? klineRows : sortedDaily).slice(0, 180)).slice(-140),
    finance: {
      revenue: Number(latestIncome.total_revenue || 0) / 100000000,
      netProfit: Number(latestIncome.n_income_attr_p || 0) / 100000000,
      nonRecurring: Number(latestIncome.non_oper_income || 0) / 100000000,
      cashYoY: 0,
      peTtm: Number(latestBasic.pe_ttm || 0),
      pb: Number(latestBasic.pb || 0),
      peg: 0,
      grossMargin: Number(latestFinance.grossprofit_margin || 0),
      netMargin: Number(latestFinance.netprofit_margin || 0),
      roe: Number(latestFinance.roe || 0),
      debtRatio: Number(latestFinance.debt_to_assets || 0),
    },
    company: {
      chairman: company.chairman,
      manager: company.manager,
      secretary: company.secretary,
      regCapital: Number(company.reg_capital || 0),
      setupDate: company.setup_date,
      province: company.province,
      city: company.city,
      introduction: company.introduction,
      website: company.website,
      email: company.email,
      office: company.office,
      employees: Number(company.employees || 0),
      mainBusiness: company.main_business,
      businessScope: company.business_scope,
    },
    riskPrice: {
      cageUpper: Number((price * 1.02).toFixed(2)),
      cageLower: Number((price * 0.98).toFixed(2)),
      auctionUpper: Number(latestLimit.up_limit || price * 1.1),
      auctionLower: Number(latestLimit.down_limit || price * 0.9),
    },
    shareholder: {
      holderCount: Number(latestHolder.holder_num || 0),
      holderChange: prevHolder.holder_num ? Number(((Number(latestHolder.holder_num || 0) - Number(prevHolder.holder_num)) / Number(prevHolder.holder_num) * 100).toFixed(2)) : 0,
      fundHolding: 0,
      institutionHolding: 0,
      institutionRatio: 0,
    },
    margin: marginRows.slice(0, 5).map((item) => ({ date: item.trade_date, label: '融资融券', value: `融资余额${Number(item.rzye || 0).toFixed(0)}`, extra: `融券余量${Number(item.rqyl || 0).toFixed(0)}` })),
    dividend: dividendRows.slice(0, 5).map((item) => ({ date: item.ann_date || item.end_date, label: item.div_proc || '分红', value: `送股${item.stk_div || 0}`, extra: `派息${item.cash_div_tax || 0}` })),
    blockTrade: blockRows.slice(0, 5).map((item) => ({ date: item.trade_date, label: '大宗交易', value: `${item.price || '--'}元`, extra: `${item.amount || '--'}万` })),
    capitalFlow: [
      { name: '主力流入', value: Number((mainIn / flowTotal * 100).toFixed(1)), color: '#ff4444' },
      { name: '主力流出', value: Number((mainOut / flowTotal * 100).toFixed(1)), color: '#22bb66' },
      { name: '散户流入', value: Number((retailIn / flowTotal * 100).toFixed(1)), color: '#8b1f1f' },
      { name: '散户流出', value: Number((retailOut / flowTotal * 100).toFixed(1)), color: '#0f6b3f' },
    ],
    news: newsRows,
  };
}

async function searchTushareStocks(q) {
  const keyword = q.trim().toLowerCase();
  if (!keyword) return [];
  const rows = await tushare('stock_basic', { list_status: 'L' }, 'ts_code,symbol,name');
  return rows
    .filter((row) => String(row.symbol).includes(keyword) || String(row.name).toLowerCase().includes(keyword))
    .slice(0, 30)
    .map((row) => ({ 证券代码: row.symbol, 证券名称: row.name, 现价: 0 }));
}

async function searchStocks(q) {
  const keyword = q.trim();
  if (!keyword) return [];
  try {
    const rows = await searchEastmoneyStocks(keyword);
    if (rows.length > 0) {
      const quotes = await getEastmoneyQuotes(rows.map((row) => row.code));
      const quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
      return rows.map((row) => ({
        证券代码: row.code,
        证券名称: row.name,
        现价: quoteMap.get(row.code)?.price || 0,
      }));
    }
  } catch (error) {
    console.warn(`Eastmoney search fallback: ${error instanceof Error ? error.message : error}`);
  }
  return searchTushareStocks(q);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        marketData: {
          primary: 'eastmoney',
          fallback: 'tushare',
          cache: 'memory',
        },
      });
      return;
    }
    if (url.pathname === '/api/watchlist/quotes') {
      const codes = (url.searchParams.get('codes') || '').split(',').map((code) => code.trim()).filter(Boolean);
      sendJson(res, 200, { data: await getQuotes(codes) });
      return;
    }
    if (url.pathname === '/api/market/indices') {
      sendJson(res, 200, { data: await getMarketIndices() });
      return;
    }
    if (url.pathname === '/api/market/quick-insights') {
      sendJson(res, 200, { data: await getMarketQuickInsights() });
      return;
    }
    if (url.pathname === '/api/heat') {
      sendJson(res, 200, { data: await getHeatData() });
      return;
    }
    if (url.pathname === '/api/abnormal-movement') {
      const codes = (url.searchParams.get('codes') || '').split(',').map((code) => code.trim()).filter(Boolean);
      sendJson(res, 200, { data: await getAbnormalMovement(codes) });
      return;
    }
    if (url.pathname === '/api/value-investing-committee') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }
      const body = await readJsonBody(req);
      sendJson(res, 200, { data: await runValueInvestingCommittee(body.prompt || '') });
      return;
    }
    if (url.pathname === '/api/stock-selection') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }
      const body = await readJsonBody(req);
      sendJson(res, 200, { data: await getStockSelection(body.prompt || '') });
      return;
    }
    if (url.pathname === '/api/general-chat') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }
      const body = await readJsonBody(req);
      sendJson(res, 200, { data: { content: await getGeneralChatAnswer(body.prompt || '', body.skill || '') } });
      return;
    }
    if (url.pathname === '/api/stocks/search') {
      sendJson(res, 200, { data: await searchStocks(url.searchParams.get('q') || '') });
      return;
    }
    const detailMatch = url.pathname.match(/^\/api\/stocks\/([^/]+)\/detail$/);
    if (detailMatch) {
      sendJson(res, 200, { data: await getStockDetail(detailMatch[1]) });
      return;
    }
    const chartMatch = url.pathname.match(/^\/api\/stocks\/([^/]+)\/chart$/);
    if (chartMatch) {
      sendJson(res, 200, { data: await getChart(chartMatch[1], url.searchParams.get('period') || '1min') });
      return;
    }
    const moneyflowMatch = url.pathname.match(/^\/api\/stocks\/([^/]+)\/moneyflow$/);
    if (moneyflowMatch) {
      sendJson(res, 200, { data: await getMoneyflow(moneyflowMatch[1]) });
      return;
    }
    const boardsMatch = url.pathname.match(/^\/api\/stocks\/([^/]+)\/boards$/);
    if (boardsMatch) {
      sendJson(res, 200, { data: await getRelatedBoards(boardsMatch[1]) });
      return;
    }
    const membersMatch = url.pathname.match(/^\/api\/stocks\/([^/]+)\/members$/);
    if (membersMatch) {
      sendJson(res, 200, { data: await getBoardMembers(membersMatch[1]) });
      return;
    }
    const fullDetailMatch = url.pathname.match(/^\/api\/stocks\/([^/]+)\/full-detail$/);
    if (fullDetailMatch) {
      sendJson(res, 200, { data: await getFullDetail(fullDetailMatch[1], url.searchParams.get('period') || '日') });
      return;
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

server.listen(PORT, () => {
  console.log(`Market data proxy listening on http://localhost:${PORT} (Eastmoney primary, Tushare fallback)`);
});
