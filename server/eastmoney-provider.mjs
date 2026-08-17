const QUOTE_URL = 'https://push2.eastmoney.com/api/qt';
const HISTORY_URL = 'https://push2his.eastmoney.com/api/qt';
const TOPIC_URL = 'https://push2ex.eastmoney.com';
const EASTMONEY_UT = 'fa5fd1943c7b386f172d6893dbfba10b';
const EASTMONEY_TOPIC_UT = '7eea3edcaed734bea9cbfc24409ed989';
const DEFAULT_TIMEOUT_MS = Number(process.env.EASTMONEY_TIMEOUT_MS || 8000);
const DEFAULT_TTL_MS = Number(process.env.EASTMONEY_CACHE_TTL_MS || 15000);
const cache = new Map();

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function localCode(code) {
  return String(code).trim().toUpperCase().split('.')[0].padStart(6, '0');
}

function marketOf(code) {
  const normalized = String(code).trim().toUpperCase();
  if (normalized.endsWith('.SH')) return 1;
  if (normalized.endsWith('.SZ') || normalized.endsWith('.BJ')) return 0;
  return localCode(normalized).startsWith('6') ? 1 : 0;
}

function secidOf(code) {
  return `${marketOf(code)}.${localCode(code)}`;
}

async function eastmoneyJson(baseUrl, pathname, params, ttl = DEFAULT_TTL_MS) {
  const url = new URL(pathname, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < ttl) return cached.data;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json,text/plain,*/*',
        Referer: 'https://quote.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    if (!response.ok) throw new Error(`Eastmoney HTTP ${response.status}`);
    const data = await response.json();
    if (data?.rc !== undefined && data.rc !== 0) throw new Error(`Eastmoney rc ${data.rc}`);
    cache.set(cacheKey, { time: Date.now(), data });
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeQuote(row) {
  const code = row.f12 || row.f57 || '';
  const name = row.f14 || row.f58 || String(code);
  return {
    code: String(code),
    name,
    price: finite(row.f2),
    change: finite(row.f4),
    pctChange: finite(row.f3),
    speed: finite(row.f22),
    turnoverRate: finite(row.f8),
    high: finite(row.f15),
    low: finite(row.f16),
    open: finite(row.f17),
    preClose: finite(row.f18),
    volumeRatio: finite(row.f10),
    amount: finite(row.f6),
    mainNetFlow: finite(row.f62),
    industry: row.f100 || '',
    pe: finite(row.f9),
    pb: finite(row.f23),
    totalMv: finite(row.f20),
    circMv: finite(row.f21),
    source: '东方财富',
  };
}

export async function getEastmoneyQuotes(codes) {
  const requested = [...new Set(codes.map(localCode).filter(Boolean))];
  if (requested.length === 0) return [];
  const payload = await eastmoneyJson(QUOTE_URL, '/api/qt/ulist.np/get', {
      secids: requested.map(secidOf).join(','),
      fltt: 2,
      invt: 2,
      ut: EASTMONEY_UT,
      fields: 'f2,f3,f4,f6,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f22,f23,f62,f100',
  });
  const quotes = (payload?.data?.diff || []).map(normalizeQuote).filter((quote) => quote.code && quote.price > 0);
  if (quotes.length === 0) throw new Error('Eastmoney quotes unavailable');
  const quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
  return requested.map((code) => quoteMap.get(code)).filter(Boolean);
}

export async function getEastmoneyIndices() {
  const definitions = [
    { secid: '1.000001', code: '000001.SH', name: '上证指数' },
    { secid: '0.399001', code: '399001.SZ', name: '深证成指' },
    { secid: '1.000680', code: '000680.SH', name: '科创综指' },
    { secid: '1.000300', code: '000300.SH', name: '沪深300' },
    { secid: '0.399006', code: '399006.SZ', name: '创业板指' },
    { secid: '1.000016', code: '000016.SH', name: '上证50' },
    { secid: '1.000905', code: '000905.SH', name: '中证500' },
  ];
  const payload = await eastmoneyJson(QUOTE_URL, '/api/qt/ulist.np/get', {
    secids: definitions.map((item) => item.secid).join(','),
    fltt: 2,
    invt: 2,
    ut: EASTMONEY_UT,
    fields: 'f2,f3,f4,f6,f12,f14',
  }, 5000);
  const rows = payload?.data?.diff || [];
  const rowMap = new Map(rows.map((row) => [String(row.f12), row]));
  const indices = definitions.map((definition) => {
    const row = rowMap.get(definition.code.split('.')[0]) || {};
    return {
      code: definition.code,
      name: definition.name,
      value: finite(row.f2),
      change: finite(row.f4),
      changePercent: finite(row.f3),
      amount: finite(row.f6),
      source: '东方财富',
    };
  }).filter((item) => item.value > 0);
  if (indices.length !== definitions.length) throw new Error('Eastmoney indices unavailable');
  return indices;
}

export async function getEastmoneyMarketQuotes(limit = 100, sortField = 'f3', page = 1) {
  const payload = await eastmoneyJson(QUOTE_URL, '/api/qt/clist/get', {
    pn: Math.max(page, 1),
    pz: Math.min(Math.max(limit, 1), 500),
    po: 1,
    np: 1,
    fltt: 2,
    invt: 2,
    fid: sortField,
    fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048',
    fields: 'f2,f3,f4,f6,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f22,f23,f62,f100',
  });
  return (payload?.data?.diff || []).map(normalizeQuote);
}

function normalizeLimitTime(value) {
  const digits = String(value || '').replace(/\D/g, '').padStart(6, '0').slice(-6);
  return digits === '000000' ? '--' : digits.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');
}

export async function getEastmoneyLimitUpPool(date) {
  const payload = await eastmoneyJson(TOPIC_URL, '/getTopicZTPool', {
    ut: EASTMONEY_TOPIC_UT,
    dpt: 'wz.ztzt',
    Pageindex: 0,
    pagesize: 200,
    sort: 'fbt:asc',
    date,
  }, 15000);
  const rows = payload?.data?.pool || [];
  return rows.map((row) => ({
    code: String(row.c || ''),
    name: row.n || String(row.c || ''),
    price: finite(row.p) / 1000,
    pctChange: finite(row.zdp),
    firstLimitTime: normalizeLimitTime(row.fbt),
    lastLimitTime: normalizeLimitTime(row.lbt),
    openCount: finite(row.zbc),
    streak: Math.max(1, finite(row.lbc, 1)),
    industry: row.hybk || '未分类题材',
    amount: finite(row.amount),
    turnoverRate: finite(row.hs),
    floatMarketValue: finite(row.lts),
    sealedAmount: finite(row.fund),
  })).filter((row) => row.code && row.price > 0);
}

export async function getEastmoneyBrokenBoardPool(date) {
  const payload = await eastmoneyJson(TOPIC_URL, '/getTopicZBPool', {
    ut: EASTMONEY_TOPIC_UT,
    dpt: 'wz.ztzt',
    Pageindex: 0,
    pagesize: 200,
    sort: 'fbt:asc',
    date,
  }, 15000);
  return payload?.data?.pool || [];
}

async function getEastmoneySnapshot() {
  const rows = [];
  for (let start = 1; start <= 20; start += 5) {
    const pages = await Promise.allSettled(
      Array.from({ length: 5 }, (_, index) => getEastmoneyMarketQuotes(300, 'f12', start + index)),
    );
    rows.push(...pages.flatMap((page) => page.status === 'fulfilled' ? page.value : []));
  }
  if (rows.length === 0) throw new Error('Eastmoney market snapshot unavailable');
  return rows;
}

function klineType(period) {
  const normalized = String(period || '日');
  if (['分时', '1min'].includes(normalized)) return null;
  if (normalized === '5min') return 5;
  if (normalized === '15min') return 15;
  if (normalized === '30min') return 30;
  if (normalized === '60min') return 60;
  if (normalized === '周') return 102;
  if (normalized === '月') return 103;
  if (normalized === '季') return 103;
  if (normalized === '年') return 103;
  return 101;
}

export async function getEastmoneyKline(code, period = '日', limit = 180) {
  const klt = klineType(period);
  if (klt === null) {
    const payload = await eastmoneyJson(HISTORY_URL, '/api/qt/stock/trends2/get', {
      secid: secidOf(code),
      ndays: period === '5日' ? 5 : 1,
      iscr: 0,
      fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
    }, 5000);
    return (payload?.data?.trends || []).map((item) => {
      const [time, price, , , volume, amount] = String(item).split(',');
      return { trade_time: time, trade_date: time.slice(0, 10).replace(/-/g, ''), close: finite(price), vol: finite(volume), amount: finite(amount) };
    });
  }

  const payload = await eastmoneyJson(HISTORY_URL, '/api/qt/stock/kline/get', {
    secid: secidOf(code),
    klt,
    fqt: 1,
    lmt: limit,
    end: '20500101',
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
  }, 60000);
  return (payload?.data?.klines || []).map((item) => {
    const [date, open, close, high, low, volume, amount, amplitude, pctChange, change, turnoverRate] = String(item).split(',');
    return {
      trade_date: date.replace(/-/g, ''),
      open: finite(open),
      close: finite(close),
      high: finite(high),
      low: finite(low),
      vol: finite(volume),
      amount: finite(amount),
      amplitude: finite(amplitude),
      pct_chg: finite(pctChange),
      change: finite(change),
      turnover_rate: finite(turnoverRate),
    };
  });
}

export async function getEastmoneyMoneyflow(code) {
  const payload = await eastmoneyJson(QUOTE_URL, '/api/qt/stock/get', {
    secid: secidOf(code),
    fields: 'f57,f58,f62,f66,f72,f78,f84',
    fltt: 2,
  }, 15000);
  const row = payload?.data || {};
  const flows = {
    main: finite(row.f62),
    superLarge: finite(row.f66),
    large: finite(row.f72),
    medium: finite(row.f78),
    small: finite(row.f84),
  };
  if (!row.f57) throw new Error('Eastmoney moneyflow returned no stock');
  return flows;
}

export async function searchEastmoneyStocks(query) {
  const keyword = String(query).trim().toLowerCase();
  if (!keyword) return [];
  const quotes = await getEastmoneySnapshot();
  return quotes
    .filter((quote) => quote.code.includes(keyword) || quote.name.toLowerCase().includes(keyword))
    .slice(0, 30)
    .map((quote) => ({
      code: quote.code,
      name: quote.name,
      market: String(marketOf(quote.code)),
    }));
}

export function clearEastmoneyCache() {
  cache.clear();
}
