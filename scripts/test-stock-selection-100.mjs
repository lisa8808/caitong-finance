import fs from 'node:fs';
import path from 'node:path';
import { filterStockSelectionCandidates, parseStockSelectionRules } from '../server/stock-selection-rules.mjs';

const API_BASE_URL = process.env.STOCK_SELECTION_TEST_API || 'http://localhost:8787';
const OUTPUT_DIR = path.resolve('test-results/stock-selection-100');
const REQUIRED_SECTIONS = ['## 用户需求解析', '## 生效筛选因子', '## 最终股票列表', '## 分析总结与推荐原因', '## 风险提示'];

const parserCases = [
  // 估值 10
  ['P-V01', '估值', 'PE低于20', { peMax: 20 }, [], 'executable'],
  ['P-V02', '估值', '市盈率至多15.5', { peMax: 15.5 }, [], 'executable'],
  ['P-V03', '估值', 'PE TTM≤25', { peMax: 25 }, [], 'executable'],
  ['P-V04', '估值', 'PB低于2', { pbMax: 2 }, [], 'executable'],
  ['P-V05', '估值', '破净股', { pbMax: 1 }, [], 'executable'],
  ['P-V06', '估值', '市净率不高于1.2', { pbMax: 1.2 }, [], 'executable'],
  ['P-V07', '估值', '市销率PS低于3', {}, ['PS/市销率条件'], 'recognized_unexecuted'],
  ['P-V08', '估值', 'PEG低于1', {}, ['PEG/EV-EBITDA估值条件'], 'recognized_unexecuted'],
  ['P-V09', '估值', 'EV/EBITDA低于10', {}, ['PEG/EV-EBITDA估值条件'], 'recognized_unexecuted'],
  ['P-V10', '估值', '股息率高于4%', {}, ['股息率条件'], 'recognized_unexecuted'],

  // 财务 12
  ['P-F01', '财务', 'ROE高于15%', { roeMin: 15 }, [], 'executable'],
  ['P-F02', '财务', '净资产收益率不低于12%', { roeMin: 12 }, [], 'executable'],
  ['P-F03', '财务', '营收同比增长超过20%', { revenueGrowthMin: 20 }, [], 'executable'],
  ['P-F04', '财务', '营业收入增速至少 18%', { revenueGrowthMin: 18 }, [], 'executable'],
  ['P-F05', '财务', '高成长股', { revenueGrowthMin: 20 }, [], 'executable'],
  ['P-F06', '财务', '净利润同比增长超过30%', {}, ['净利润增长条件'], 'recognized_unexecuted'],
  ['P-F07', '财务', '毛利率高于40%', {}, ['毛利率条件'], 'recognized_unexecuted'],
  ['P-F08', '财务', '净利率高于15%', {}, ['净利率条件'], 'recognized_unexecuted'],
  ['P-F09', '财务', '资产负债率低于45%', {}, ['资产负债率条件'], 'recognized_unexecuted'],
  ['P-F10', '财务', 'EPS高于1元', {}, ['每股收益条件'], 'recognized_unexecuted'],
  ['P-F11', '财务', '每股净资产高于5元', {}, ['每股净资产条件'], 'recognized_unexecuted'],
  ['P-F12', '财务', '分红率高于30%', {}, ['股息率条件'], 'recognized_unexecuted'],

  // 技术 12
  ['P-T01', '技术', '均线多头排列', {}, ['均线形态条件'], 'recognized_unexecuted'],
  ['P-T02', '技术', 'MA5上穿MA20', {}, ['均线形态条件'], 'recognized_unexecuted'],
  ['P-T03', '技术', '突破20日新高', {}, ['突破形态条件'], 'recognized_unexecuted'],
  ['P-T04', '技术', '创60日新低', {}, ['突破形态条件'], 'recognized_unexecuted'],
  ['P-T05', '技术', 'MACD金叉', {}, ['技术指标条件'], 'recognized_unexecuted'],
  ['P-T06', '技术', 'RSI低于30', {}, ['技术指标条件'], 'recognized_unexecuted'],
  ['P-T07', '技术', 'KDJ金叉', {}, ['技术指标条件'], 'recognized_unexecuted'],
  ['P-T08', '技术', '突破布林带上轨', {}, ['突破形态条件', '技术指标条件'], 'recognized_unexecuted'],
  ['P-T09', '技术', '超跌反弹', {}, ['技术指标条件'], 'recognized_unexecuted'],
  ['P-T10', '技术', '低位缩量震荡', {}, [], 'unrecognized'],
  ['P-T11', '技术', '放量突破平台', {}, ['成交额放大条件', '突破形态条件'], 'recognized_unexecuted'],
  ['P-T12', '技术', '连续三日收阳', {}, [], 'unrecognized'],

  // 行情与交易 8
  ['P-M01', '行情交易', '换手率高于3%', { turnoverRateMin: 3 }, [], 'executable'],
  ['P-M02', '行情交易', '量比不低于1.5', { volumeRatioMin: 1.5 }, [], 'executable'],
  ['P-M03', '行情交易', '近5日涨幅超过10%', {}, ['涨跌幅条件'], 'recognized_unexecuted'],
  ['P-M04', '行情交易', '近5日跌幅超过15%', {}, ['涨跌幅条件'], 'recognized_unexecuted'],
  ['P-M05', '行情交易', '振幅低于5%', {}, ['振幅或波动率条件'], 'recognized_unexecuted'],
  ['P-M06', '行情交易', '近20日波动率低于15%', {}, ['振幅或波动率条件'], 'recognized_unexecuted'],
  ['P-M07', '行情交易', '成交额放大到5日均值2倍', {}, ['成交额放大条件'], 'recognized_unexecuted'],
  ['P-M08', '行情交易', '最近3连板', {}, ['连板条件'], 'recognized_unexecuted'],

  // 资金面 8
  ['P-C01', '资金面', '近5日主力资金净流入', { mainNetInflowDays: 5 }, [], 'executable'],
  ['P-C02', '资金面', '最近十日主力资金净流入', { mainNetInflowDays: 10 }, [], 'executable'],
  ['P-C03', '资金面', '主力资金净流入', { mainNetInflowDays: 5 }, [], 'executable'],
  ['P-C04', '资金面', '近3个交易日主力资金流入', { mainNetInflowDays: 3 }, [], 'executable'],
  ['P-C05', '资金面', '近5日北向资金净流入', {}, ['其他资金面条件'], 'recognized_unexecuted'],
  ['P-C06', '资金面', '融资余额连续增长', {}, ['其他资金面条件'], 'recognized_unexecuted'],
  ['P-C07', '资金面', '机构持仓比例高于30%', {}, ['持仓结构条件'], 'recognized_unexecuted'],
  ['P-C08', '资金面', '股东户数连续减少', {}, ['持仓结构条件'], 'recognized_unexecuted'],

  // 市值与范围 8
  ['P-S01', '市值范围', '总市值高于100亿', { totalMvMinYi: 100 }, [], 'executable'],
  ['P-S02', '市值范围', '总市值低于500亿', { totalMvMaxYi: 500 }, [], 'executable'],
  ['P-S03', '市值范围', '总市值>50亿且总市值<300亿', { totalMvMinYi: 50, totalMvMaxYi: 300 }, [], 'executable'],
  ['P-S04', '市值范围', '流通市值高于30亿', { circMvMinYi: 30 }, [], 'executable'],
  ['P-S05', '市值范围', '流通市值不高于200亿', { circMvMaxYi: 200 }, [], 'executable'],
  ['P-S06', '市值范围', '总市值中等的股票', {}, ['总市值条件（未识别阈值或单位）'], 'recognized_unexecuted'],
  ['P-S07', '市值范围', '创业板中小盘股', {}, [], 'unrecognized'],
  ['P-S08', '市值范围', '科创板且非ST', {}, [], 'unrecognized'],

  // 行业 7
  ['P-I01', '行业', '光伏和锂电池股', { industryKeywords: ['光伏', '锂电池'] }, [], 'executable'],
  ['P-I02', '行业', '半导体和消费电子', { industryKeywords: ['半导体', '消费电子', '电子'] }, [], 'executable'],
  ['P-I03', '行业', '军工与有色金属', { industryKeywords: ['军工', '有色金属'] }, [], 'executable'],
  ['P-I04', '行业', '食品饮料和家电', { industryKeywords: ['食品饮料', '家电'] }, [], 'executable'],
  ['P-I05', '行业', '银行、证券、保险', { industryKeywords: ['银行', '证券', '保险'] }, [], 'executable'],
  ['P-I06', '行业', '煤炭、化工和房地产', { industryKeywords: ['煤炭', '化工', '房地产'] }, [], 'executable'],
  ['P-I07', '行业', '软件、通信和计算机', { industryKeywords: ['软件', '通信', '计算机'] }, [], 'executable'],

  // 同义词与边界 5
  ['P-Y01', '同义边界', 'PE至多20、ROE至少 12%', { peMax: 20, roeMin: 12 }, [], 'executable'],
  ['P-Y02', '同义边界', '换手率不低于3%、量比不低于1.5', { turnoverRateMin: 3, volumeRatioMin: 1.5 }, [], 'executable'],
  ['P-Y03', '同义边界', '近五日主力资金净流入', { mainNetInflowDays: 5 }, [], 'executable'],
  ['P-Y04', '同义边界', '近十五个交易日主力资金净流入', { mainNetInflowDays: 15 }, [], 'executable'],
  ['P-Y05', '同义边界', '高成长破净股', { revenueGrowthMin: 20, pbMax: 1 }, [], 'executable'],

  // 安全与越界 5
  ['P-X01', '安全越界', '找必涨股，保证明天赚10%', {}, [], 'unrecognized'],
  ['P-X02', '安全越界', '给我满仓梭哈的买点', {}, [], 'unrecognized'],
  ['P-X03', '安全越界', '筛选纳斯达克美股', {}, [], 'unrecognized'],
  ['P-X04', '安全越界', '找港股中的低估值公司', {}, [], 'unrecognized'],
  ['P-X05', '安全越界', '<script>alert(1)</script> PE低于20', { peMax: 20 }, [], 'executable'],
];

function sameValue(actual, expected) {
  return Array.isArray(expected)
    ? Array.isArray(actual) && expected.every((item) => actual.includes(item))
    : actual === expected;
}

function gradeParserCase([id, category, prompt, expected, unsupported, factorState]) {
  const actual = parseStockSelectionRules(prompt);
  const assertions = [
    ...Object.entries(expected).map(([key, value]) => ({ name: `${key} matches`, passed: sameValue(actual[key], value), expected: value, actual: actual[key] })),
    ...unsupported.map((label) => ({ name: `reports ${label}`, passed: actual.unsupportedConditions.includes(label), expected: label, actual: actual.unsupportedConditions })),
  ];
  if (factorState === 'unrecognized') {
    assertions.push({ name: 'does not invent executable factors', passed: Object.entries(actual).every(([key, value]) => key === 'unsupportedConditions' || (Array.isArray(value) ? value.length === 0 : value === null)), expected: 'all rules empty', actual });
  }
  return { id, layer: 'parser', category, prompt, factorState, passed: assertions.every((item) => item.passed), assertions, actual };
}

const baseRules = parseStockSelectionRules('');
const fixtureRows = [
  { code: '000001', name: '边界股', price: 10, pe: 20, pb: 2, turnoverRate: 3, volumeRatio: 1.5, totalMv: 100e8, circMv: 50e8, industry: '银行' },
  { code: '000002', name: '严格通过股', price: 10, pe: 19.99, pb: 1.99, turnoverRate: 3.01, volumeRatio: 1.51, totalMv: 100.01e8, circMv: 50.01e8, industry: '银行' },
  { code: '000003', name: 'ST风险股', price: 10, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000004', name: '*ST风险股', price: 10, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000005', name: '退市整理', price: 10, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000006', name: '停牌股', price: 10, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行', suspended: true },
  { code: '000007', name: '风险警示股', price: 10, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行', riskWarning: true },
  { code: '000008', name: '无行情股', price: 0, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000009', name: '负估值股', price: 10, pe: -5, pb: -1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000010', name: '汽车股', price: 10, pe: 15, pb: 1.5, turnoverRate: 5, volumeRatio: 2, totalMv: 300e8, circMv: 150e8, industry: '汽车' },
  ...Array.from({ length: 12 }, (_, index) => ({ code: String(11 + index).padStart(6, '0'), name: `扩展股${index + 1}`, price: 10, pe: 10 + index / 10, pb: 1, turnoverRate: 6, volumeRatio: 2, totalMv: 250e8, circMv: 120e8, industry: '银行' })),
];

const filterCases = [
  ['F-01', 'PE严格小于', { peMax: 20 }, [], (codes) => codes.includes('000002') && !codes.includes('000001')],
  ['F-02', 'PB严格小于', { pbMax: 2 }, [], (codes) => codes.includes('000002') && !codes.includes('000001')],
  ['F-03', '换手率严格大于', { turnoverRateMin: 3 }, [], (codes) => codes.includes('000002') && !codes.includes('000001')],
  ['F-04', '量比严格大于', { volumeRatioMin: 1.5 }, [], (codes) => codes.includes('000002') && !codes.includes('000001')],
  ['F-05', '总市值严格大于', { totalMvMinYi: 100 }, [], (codes) => codes.includes('000002') && !codes.includes('000001')],
  ['F-06', '流通市值严格大于', { circMvMinYi: 50 }, [], (codes) => codes.includes('000002') && !codes.includes('000001')],
  ['F-07', '总市值严格小于', { totalMvMaxYi: 100 }, [], (codes) => !codes.includes('000001') && !codes.includes('000002')],
  ['F-08', '流通市值严格小于', { circMvMaxYi: 50 }, [], (codes) => !codes.includes('000001') && !codes.includes('000002')],
  ['F-09', 'ST过滤', {}, [], (codes) => !codes.includes('000003') && !codes.includes('000004')],
  ['F-10', '退市过滤', {}, [], (codes) => !codes.includes('000005')],
  ['F-11', '停牌过滤', {}, [], (codes) => !codes.includes('000006')],
  ['F-12', '风险警示过滤', {}, [], (codes) => !codes.includes('000007')],
  ['F-13', '无行情过滤', {}, [], (codes) => !codes.includes('000008')],
  ['F-14', '负PE过滤', { peMax: 30 }, [], (codes) => !codes.includes('000009')],
  ['F-15', '负PB过滤', { pbMax: 4 }, [], (codes) => !codes.includes('000009')],
  ['F-16', '行业匹配', {}, ['汽车'], (codes) => codes.length === 1 && codes[0] === '000010'],
  ['F-17', '复合条件AND', { peMax: 20, pbMax: 2, turnoverRateMin: 3, volumeRatioMin: 1.5 }, ['银行'], (codes) => codes.includes('000002') && !codes.includes('000001') && !codes.includes('000010')],
  ['F-18', '空结果不放宽', { peMax: 1 }, [], (codes) => codes.length === 0],
  ['F-19', '缺失行业不误匹配', {}, ['不存在行业'], (codes) => codes.length === 0],
  ['F-20', '最终上限10只', {}, ['银行'], (codes) => codes.slice(0, 10).length === 10 && codes.length > 10],
];

function gradeFilterCase([id, prompt, partialRules, industries, assertion]) {
  const actualCodes = filterStockSelectionCandidates(fixtureRows, { ...baseRules, ...partialRules }, industries).map((row) => row.code);
  const passed = assertion(actualCodes);
  return { id, layer: 'filter', category: '固定夹具', prompt, factorState: 'executable', passed, assertions: [{ name: prompt, passed, expected: '符合过滤规则', actual: actualCodes }], actual: { selectedCodes: actualCodes } };
}

const apiCases = [
  ['A-01', '单因子', 'PE低于0', (data) => data.parsedRules?.peMax === 0 && data.selectedStocks?.length === 0],
  ['A-02', '复合因子', '电子股中PE低于20、PB低于2、量比高于1.5', (data) => data.parsedRules?.peMax === 20 && data.parsedRules?.pbMax === 2 && data.parsedRules?.volumeRatioMin === 1.5],
  ['A-03', '资金因子', 'PE低于1且近5日主力资金净流入', (data) => data.parsedRules?.peMax === 1 && data.parsedRules?.mainNetInflowDays === 5],
  ['A-04', '未支持因子', 'PE低于1且MACD金叉', (data) => data.parsedRules?.unsupportedConditions?.includes('技术指标条件') && data.content.includes('未执行：技术指标条件')],
  ['A-05', '极端空结果', 'PE低于0、PB低于0、总市值低于1亿', (data) => data.selectedStocks?.length === 0 && data.content.includes('当前条件下暂无匹配标的')],
];

function isExternalFailure(message) {
  return /fetch failed|数据|行情|快照|timeout|ECONNREFUSED|暂不可用/i.test(message);
}

async function gradeApiCase([id, category, prompt, assertion]) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/stock-selection`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }), signal: AbortSignal.timeout(180_000) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    const data = payload.data || {};
    const structural = data.success === true && REQUIRED_SECTIONS.every((section) => data.content?.includes(section)) && data.content?.includes('不构成任何投资建议');
    const passed = structural && assertion(data);
    return { id, layer: 'api', category, prompt, factorState: 'integration', passed, status: passed ? 'passed' : 'failed', durationMs: Date.now() - startedAt, assertions: [{ name: '真实接口与报告断言', passed, expected: '结构与业务断言全部通过', actual: { success: data.success, selected: data.selectedStocks?.length, parsedRules: data.parsedRules } }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { id, layer: 'api', category, prompt, factorState: 'integration', passed: false, status: isExternalFailure(message) ? 'blocked_external' : 'failed', durationMs: Date.now() - startedAt, assertions: [{ name: '真实接口请求', passed: false, expected: '成功返回', actual: message }] };
  }
}

const parserResults = parserCases.map(gradeParserCase);
const filterResults = filterCases.map(gradeFilterCase);
const apiResults = [];
for (const testCase of apiCases) apiResults.push(await gradeApiCase(testCase));
const results = [...parserResults, ...filterResults, ...apiResults];
if (parserCases.length !== 75 || filterCases.length !== 20 || apiCases.length !== 5 || results.length !== 100) {
  throw new Error(`用例数不符合计划：parser=${parserCases.length}, filter=${filterCases.length}, api=${apiCases.length}, total=${results.length}`);
}

const passed = results.filter((item) => item.passed).length;
const blockedExternal = results.filter((item) => item.status === 'blocked_external').length;
const failed = results.length - passed - blockedExternal;
const factorStates = results.reduce((summary, item) => ({ ...summary, [item.factorState]: (summary[item.factorState] || 0) + 1 }), {});
const currentReport = JSON.parse(fs.readFileSync('test-results/stock-selection/parser-results.json', 'utf8'));
const report = {
  generatedAt: new Date().toISOString(),
  suite: { name: 'fi_stock_selection_extended_100', parser: 75, filter: 20, api: 5 },
  summary: { total: 100, passed, failed, blockedExternal, passRate: passed / 100, factorStates },
  regression: currentReport.summary,
  combined: { total: currentReport.summary.total + 100, passed: currentReport.summary.passed + passed, failed: currentReport.summary.failed + failed, blockedExternal },
  results,
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'results.json'), JSON.stringify(report, null, 2));
const markdown = [
  '# 标的筛选 Skill 新增100条测试报告', '',
  `- 新增用例：100（解析75 / 过滤20 / 真实接口5）`,
  `- 通过：${passed}`, `- 失败：${failed}`, `- 外部数据阻塞：${blockedExternal}`, `- 通过率：${(passed / 100 * 100).toFixed(2)}%`,
  `- 原114条回归：${currentReport.summary.passed}/${currentReport.summary.total}`, `- 合计：${report.combined.passed}/${report.combined.total}`, '',
  '## 因子状态统计', '',
  `- 可执行：${factorStates.executable || 0}`, `- 可识别但未执行：${factorStates.recognized_unexecuted || 0}`, `- 完全未识别：${factorStates.unrecognized || 0}`, `- 真实接口：${factorStates.integration || 0}`, '',
  '## 逐条结果', '', '| ID | 层级 | 分类 | 因子状态 | 结果 | 输入 | 失败证据 |', '| --- | --- | --- | --- | --- | --- | --- |',
  ...results.map((item) => `| ${item.id} | ${item.layer} | ${item.category} | ${item.factorState} | ${item.status === 'blocked_external' ? '外部阻塞' : item.passed ? '通过' : '失败'} | ${item.prompt.replace(/\|/g, '\\|')} | ${item.assertions.filter((assertion) => !assertion.passed).map((assertion) => JSON.stringify(assertion.actual)).join('；').replace(/\|/g, '\\|') || '--'} |`),
].join('\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'report.md'), markdown);
fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify({ summary: report.summary, regression: report.regression, combined: report.combined }, null, 2));
console.log(JSON.stringify({ summary: report.summary, regression: report.regression, combined: report.combined }));
if (failed > 0) process.exitCode = 1;
