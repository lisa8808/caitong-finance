const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
const SH_INDEX_CODES = new Set(['000010', '000016', '000300', '000688', '000852', '000905']);

function localCode(value) {
  return String(value || '').replace(/^(sh|sz|bj)/i, '').replace(/\.(SH|SZ|BJ)$/i, '');
}

function marketPrefix(value) {
  const raw = String(value || '').toLowerCase();
  if (/^(sh|sz|bj)\d{6}$/.test(raw)) return raw.slice(0, 2);
  const code = localCode(raw);
  if (code.startsWith('92') || /^(43|83|87)/.test(code)) return 'bj';
  if (SH_INDEX_CODES.has(code) || /^[569]/.test(code)) return 'sh';
  return 'sz';
}

function numberAt(values, index) {
  const value = Number(values[index]);
  return Number.isFinite(value) ? value : 0;
}

export function parseTencentQuotePayload(payload) {
  const rows = [];
  for (const line of String(payload || '').split(';')) {
    const match = line.match(/v_(?:sh|sz|bj)(\d{6})="([^"]*)"/i);
    if (!match) continue;
    const values = match[2].split('~');
    if (values.length < 53 || !values[1]) continue;
    const price = numberAt(values, 3);
    const previousClose = numberAt(values, 4);
    const amountYuan = numberAt(values, 37) * 10_000;
    rows.push({
      code: match[1],
      name: values[1],
      price,
      preClose: previousClose,
      open: numberAt(values, 5),
      change: numberAt(values, 31),
      pctChange: numberAt(values, 32),
      high: numberAt(values, 33),
      low: numberAt(values, 34),
      amount: amountYuan,
      turnoverRate: numberAt(values, 38),
      volumeRatio: numberAt(values, 49),
      quoteTime: values[30] || '',
      isStale: amountYuan === 0 && price > 0 && price === previousClose,
    });
  }
  return rows;
}

export async function getTencentQuotes(codes) {
  const normalized = [...new Set(codes.map(localCode).filter((code) => /^\d{6}$/.test(code)))];
  if (normalized.length === 0) return [];
  const batches = [];
  for (let index = 0; index < normalized.length; index += 80) batches.push(normalized.slice(index, index + 80));
  const results = [];
  for (const batch of batches) {
    const symbols = batch.map((code) => `${marketPrefix(code)}${code}`).join(',');
    const response = await fetch(`https://qt.gtimg.cn/q=${symbols}`, {
      headers: { 'User-Agent': USER_AGENT, Referer: 'https://gu.qq.com/' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`腾讯行情 HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    results.push(...parseTencentQuotePayload(new TextDecoder('gbk').decode(bytes)));
  }
  return results;
}

export async function getThsHotReasons(tradeDate) {
  const date = String(tradeDate || '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  const response = await fetch(
    `http://zx.10jqka.com.cn/event/api/getharden/date/${date}/orderby/date/orderway/desc/charset/GBK/`,
    { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) throw new Error(`同花顺题材归因 HTTP ${response.status}`);
  const payload = await response.json();
  if (Number(payload.errocode || 0) !== 0) throw new Error(payload.errormsg || '同花顺题材归因返回异常');
  return (payload.data || []).map((row) => ({
    code: String(row.code || ''),
    name: row.name || '',
    reason: row.reason || '',
    tradeDate: String(row.date || '').replace(/-/g, ''),
    price: Number(row.close || 0),
    pctChange: Number(row.zhangfu || 0),
    turnoverRate: Number(row.huanshou || 0),
    amount: Number(row.chengjiaoe || 0) * 10_000,
  })).filter((row) => /^\d{6}$/.test(row.code));
}
