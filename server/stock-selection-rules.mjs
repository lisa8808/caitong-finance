export function parseStockSelectionRules(prompt) {
  const text = String(prompt || '');
  const chineseNumber = (value) => {
    if (/^\d+$/.test(value)) return Number(value);
    const digits = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    if (value === '十') return 10;
    if (value.startsWith('十')) return 10 + (digits[value[1]] || 0);
    if (value.endsWith('十')) return (digits[value[0]] || 0) * 10;
    if (value.includes('十')) return (digits[value[0]] || 0) * 10 + (digits[value[2]] || 0);
    return digits[value] || null;
  };
  const numberAfter = (patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
    return null;
  };
  const peMax = numberAfter([/PE(?:\s*TTM)?\s*(?:低于|小于|不高于|至多|<|≤)\s*(\d+(?:\.\d+)?)/i, /市盈率\s*(?:低于|小于|不高于|至多|<|≤)\s*(\d+(?:\.\d+)?)/]);
  const pbMax = numberAfter([/PB\s*(?:低于|小于|不高于|至多|<|≤)\s*(\d+(?:\.\d+)?)/i, /市净率\s*(?:低于|小于|不高于|至多|<|≤)\s*(\d+(?:\.\d+)?)/])
    ?? (text.includes('破净') ? 1 : null);
  const turnoverRateMin = numberAfter([/换手率\s*(?:大于|高于|超过|不低于|至少|>|≥)\s*(\d+(?:\.\d+)?)%?/]);
  const volumeRatioMin = numberAfter([/量比\s*(?:大于|高于|超过|不低于|至少|>|≥)\s*(\d+(?:\.\d+)?)/]);
  const totalMvMinYi = numberAfter([/总市值\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)\s*亿/]);
  const totalMvMaxYi = numberAfter([/总市值\s*(?:低于|小于|不高于|<|≤)\s*(\d+(?:\.\d+)?)\s*亿/]);
  const circMvMinYi = numberAfter([/流通市值\s*(?:大于|高于|超过|>|≥)\s*(\d+(?:\.\d+)?)\s*亿/]);
  const circMvMaxYi = numberAfter([/流通市值\s*(?:低于|小于|不高于|<|≤)\s*(\d+(?:\.\d+)?)\s*亿/]);
  const revenueGrowthMin = numberAfter([/(?:营收|营业收入)(?:同比)?(?:增长|增速)?\s*(?:大于|高于|超过|不低于|至少|>|≥)\s*(\d+(?:\.\d+)?)%?/])
    ?? (text.includes('高成长') ? 20 : null);
  const roeMin = numberAfter([/ROE\s*(?:大于|高于|超过|不低于|至少|>|≥)\s*(\d+(?:\.\d+)?)%?/i, /净资产收益率\s*(?:大于|高于|超过|不低于|至少|>|≥)\s*(\d+(?:\.\d+)?)%?/]);
  const industryKeywords = ['半导体', '消费电子', '电子', '新能源', '光伏', '锂电池', '医药', '银行', '证券', '保险', '汽车', '军工', '食品饮料', '家电', '房地产', '有色金属', '煤炭', '化工', '传媒', '软件', '通信', '计算机']
    .filter((keyword) => text.includes(keyword));
  const fundFlowMatch = text.match(/(?:近|最近)\s*([\d一二三四五六七八九十]+)\s*(?:个)?(?:交易)?日[^，,；;]*主力资金[^，,；;]*(?:净)?流入/);
  const mainNetInflowDays = fundFlowMatch
    ? chineseNumber(fundFlowMatch[1])
    : /主力资金[^，,；;]*(?:净)?流入/.test(text) ? 5 : null;
  const unsupportedConditions = [
    [/(成交额放大|放量)/, '成交额放大条件'],
    [/(均线|多头排列|MA\d+)/i, '均线形态条件'],
    [/(突破|新高|新低)/, '突破形态条件'],
    [/(RSI|MACD|KDJ|布林带|BOLL|超跌)/i, '技术指标条件'],
    [/(净利润|利润)(?:同比)?(?:增长|增速)/, '净利润增长条件'],
    [/毛利率/, '毛利率条件'],
    [/净利率/, '净利率条件'],
    [/(资产负债率|负债率)/, '资产负债率条件'],
    [/(股息率|分红率)/, '股息率条件'],
    [/(每股收益|EPS)/i, '每股收益条件'],
    [/(每股净资产|BPS)/i, '每股净资产条件'],
    [/(市销率|\bPS\b)/i, 'PS/市销率条件'],
    [/(PEG|EV\/?EBITDA)/i, 'PEG/EV-EBITDA估值条件'],
    [/(涨幅|跌幅|涨跌幅)/, '涨跌幅条件'],
    [/(振幅|波动率)/, '振幅或波动率条件'],
    [/(连续涨停|连板)/, '连板条件'],
    [/(北向资金|融资余额|融券余量)/, '其他资金面条件'],
    [/(机构持仓|基金持仓|股东户数)/, '持仓结构条件'],
  ].filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  if (pbMax === null && /(?:\bPB\b|市净率)/i.test(text)) unsupportedConditions.push('PB/市净率条件（未识别阈值）');
  if (turnoverRateMin === null && text.includes('换手率')) unsupportedConditions.push('换手率条件（未识别阈值）');
  if (volumeRatioMin === null && text.includes('量比')) unsupportedConditions.push('量比条件（未识别阈值）');
  if (totalMvMinYi === null && totalMvMaxYi === null && text.includes('总市值')) unsupportedConditions.push('总市值条件（未识别阈值或单位）');
  if (circMvMinYi === null && circMvMaxYi === null && text.includes('流通市值')) unsupportedConditions.push('流通市值条件（未识别阈值或单位）');
  return {
    peMax, pbMax, turnoverRateMin, volumeRatioMin, totalMvMinYi, totalMvMaxYi,
    circMvMinYi, circMvMaxYi, revenueGrowthMin, roeMin, industryKeywords,
    mainNetInflowDays, unsupportedConditions,
  };
}

export function filterStockSelectionCandidates(rows, rules, industryTerms = []) {
  return rows.filter((row) => (
    row.price > 0
    && !String(row.name).includes('ST')
    && !String(row.name).includes('退')
    && row.suspended !== true
    && row.isSuspended !== true
    && row.riskWarning !== true
    && (rules.peMax === null || (row.pe > 0 && row.pe < rules.peMax))
    && (rules.pbMax === null || (row.pb > 0 && row.pb < rules.pbMax))
    && (rules.turnoverRateMin === null || row.turnoverRate > rules.turnoverRateMin)
    && (rules.volumeRatioMin === null || row.volumeRatio > rules.volumeRatioMin)
    && (rules.totalMvMinYi === null || row.totalMv > rules.totalMvMinYi * 100_000_000)
    && (rules.totalMvMaxYi === null || row.totalMv < rules.totalMvMaxYi * 100_000_000)
    && (rules.circMvMinYi === null || row.circMv > rules.circMvMinYi * 100_000_000)
    && (rules.circMvMaxYi === null || row.circMv < rules.circMvMaxYi * 100_000_000)
    && (!industryTerms.length || industryTerms.some((keyword) => String(row.industry).includes(keyword)))
  ));
}
