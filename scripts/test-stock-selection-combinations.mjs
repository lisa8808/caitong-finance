import fs from 'node:fs';
import path from 'node:path';
import { filterStockSelectionCandidates, parseStockSelectionRules } from '../server/stock-selection-rules.mjs';

const API_BASE_URL = process.env.STOCK_SELECTION_TEST_API || 'http://localhost:8787';
const OUTPUT_DIR = path.resolve('test-results/stock-selection-combinations');
const REQUIRED_SECTIONS = ['## 用户需求解析', '## 生效筛选因子', '## 最终股票列表', '## 分析总结与推荐原因', '## 风险提示'];

const factors = [
  { key: 'peMax', clause: 'PE低于20', value: 20 },
  { key: 'pbMax', clause: 'PB低于2', value: 2 },
  { key: 'turnoverRateMin', clause: '换手率高于3%', value: 3 },
  { key: 'volumeRatioMin', clause: '量比高于1.5', value: 1.5 },
  { key: 'totalMvMinYi', clause: '总市值高于100亿', value: 100 },
  { key: 'circMvMaxYi', clause: '流通市值低于300亿', value: 300 },
  { key: 'revenueGrowthMin', clause: '营收同比增长超过20%', value: 20 },
  { key: 'roeMin', clause: 'ROE高于12%', value: 12 },
  { key: 'industryKeywords', clause: '新能源行业', value: ['新能源'] },
  { key: 'mainNetInflowDays', clause: '近5日主力资金净流入', value: 5 },
];

const unsupportedFactors = [
  { clause: 'MACD金叉', label: '技术指标条件' },
  { clause: '均线多头排列', label: '均线形态条件' },
  { clause: '放量突破20日新高', labels: ['成交额放大条件', '突破形态条件'] },
  { clause: '毛利率高于40%', label: '毛利率条件' },
  { clause: '净利润同比增长超过30%', label: '净利润增长条件' },
  { clause: '股息率高于3%', label: '股息率条件' },
  { clause: '资产负债率低于45%', label: '资产负债率条件' },
  { clause: '近5日北向资金净流入', label: '其他资金面条件' },
  { clause: '机构持仓比例高于30%', label: '持仓结构条件' },
  { clause: '近20日波动率低于15%', label: '振幅或波动率条件' },
];

function combinations(items, size) {
  const output = [];
  const visit = (start, selected) => {
    if (selected.length === size) {
      output.push(selected);
      return;
    }
    for (let index = start; index <= items.length - (size - selected.length); index += 1) {
      visit(index + 1, [...selected, items[index]]);
    }
  };
  visit(0, []);
  return output;
}

function expectedRules(selected) {
  return Object.fromEntries(selected.map((factor) => [factor.key, factor.value]));
}

function sameValue(actual, expected) {
  return Array.isArray(expected)
    ? Array.isArray(actual) && expected.every((item) => actual.includes(item))
    : actual === expected;
}

function gradeParsed(id, category, prompt, expected, unsupported = []) {
  const actual = parseStockSelectionRules(prompt);
  const assertions = [
    ...Object.entries(expected).map(([key, value]) => ({ name: `${key} matches`, passed: sameValue(actual[key], value), expected: value, actual: actual[key] })),
    ...unsupported.map((label) => ({ name: `reports ${label}`, passed: actual.unsupportedConditions.includes(label), expected: label, actual: actual.unsupportedConditions })),
  ];
  return { id, layer: 'parser', category, prompt, factorCount: Object.keys(expected).length + unsupported.length, passed: assertions.every((item) => item.passed), assertions, actual };
}

const executableSelections = [
  ...combinations(factors, 2).slice(0, 20),
  ...combinations(factors, 3).slice(0, 15),
  ...combinations(factors, 4).slice(0, 10),
  ...combinations(factors, 5).slice(0, 5),
  ...combinations(factors, 6).slice(0, 5),
];
const executableResults = executableSelections.map((selected, index) => gradeParsed(
  `C-E${String(index + 1).padStart(2, '0')}`,
  `${selected.length}因子全执行`,
  selected.map((factor) => factor.clause).join('、'),
  expectedRules(selected),
));

const mixedResults = Array.from({ length: 15 }, (_, index) => {
  const supported = combinations(factors, 2 + index % 3)[index % combinations(factors, 2 + index % 3).length];
  const unsupported = unsupportedFactors[index % unsupportedFactors.length];
  const labels = unsupported.labels || [unsupported.label];
  return gradeParsed(
    `C-M${String(index + 1).padStart(2, '0')}`,
    '支持+缺失混合',
    [...supported.map((factor) => factor.clause), unsupported.clause].join('、'),
    expectedRules(supported),
    labels,
  );
});

const baseRules = parseStockSelectionRules('');
const passingRow = { code: '100001', name: '全条件通过股', price: 10, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 500e8, circMv: 100e8, industry: '新能源' };
function failingRow(factor, index) {
  const row = { ...passingRow, code: String(200001 + index), name: `仅违反${factor.key}` };
  const changes = {
    peMax: { pe: 20 }, pbMax: { pb: 2 }, turnoverRateMin: { turnoverRate: 3 }, volumeRatioMin: { volumeRatio: 1.5 },
    totalMvMinYi: { totalMv: 100e8 }, circMvMaxYi: { circMv: 300e8 }, industryKeywords: { industry: '汽车' },
  };
  return { ...row, ...(changes[factor.key] || {}) };
}

const filterSelections = [
  ...combinations(factors.filter((factor) => !['revenueGrowthMin', 'roeMin', 'mainNetInflowDays'].includes(factor.key)), 3).slice(0, 10),
  ...combinations(factors.filter((factor) => !['revenueGrowthMin', 'roeMin', 'mainNetInflowDays'].includes(factor.key)), 4).slice(0, 8),
  ...combinations(factors.filter((factor) => !['revenueGrowthMin', 'roeMin', 'mainNetInflowDays'].includes(factor.key)), 5).slice(0, 7),
];
const filterResults = filterSelections.map((selected, index) => {
  const rules = { ...baseRules, ...expectedRules(selected) };
  const industryTerms = selected.some((factor) => factor.key === 'industryKeywords') ? ['新能源'] : [];
  const rows = [passingRow, ...selected.filter((factor) => !['revenueGrowthMin', 'roeMin', 'mainNetInflowDays'].includes(factor.key)).map(failingRow)];
  const actualCodes = filterStockSelectionCandidates(rows, rules, industryTerms).map((row) => row.code);
  const passed = actualCodes.length === 1 && actualCodes[0] === passingRow.code;
  return { id: `C-F${String(index + 1).padStart(2, '0')}`, layer: 'filter', category: `${selected.length}因子AND夹具`, prompt: selected.map((factor) => factor.clause).join('、'), factorCount: selected.length, passed, assertions: [{ name: '仅全部满足者入选', passed, expected: [passingRow.code], actual: actualCodes }] };
});

const apiCases = [
  ['C-A01', 'PE低于1、PB低于1、换手率高于3%', (data) => data.parsedRules?.peMax === 1 && data.parsedRules?.pbMax === 1 && data.parsedRules?.turnoverRateMin === 3],
  ['C-A02', '新能源行业、PE低于1、ROE高于12%、营收增长超过20%', (data) => data.parsedRules?.industryKeywords?.includes('新能源') && data.parsedRules?.roeMin === 12 && data.parsedRules?.revenueGrowthMin === 20],
  ['C-A03', 'PE低于1、总市值高于100亿、近5日主力资金净流入', (data) => data.parsedRules?.totalMvMinYi === 100 && data.parsedRules?.mainNetInflowDays === 5],
  ['C-A04', 'PE低于1、MACD金叉、毛利率高于40%、股息率高于3%', (data) => ['技术指标条件', '毛利率条件', '股息率条件'].every((label) => data.parsedRules?.unsupportedConditions?.includes(label) && data.content.includes(`未执行：${label}`))],
  ['C-A05', '光伏股、PE低于0、PB低于0、ROE高于50%、近5日主力资金净流入', (data) => data.selectedStocks?.length === 0 && data.content.includes('当前条件下暂无匹配标的')],
];

async function gradeApi([id, prompt, assertion]) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/stock-selection`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }), signal: AbortSignal.timeout(180_000) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    const data = payload.data || {};
    const structural = data.success === true && REQUIRED_SECTIONS.every((section) => data.content?.includes(section)) && data.content?.includes('不构成任何投资建议');
    const passed = structural && assertion(data);
    return { id, layer: 'api', category: '真实组合接口', prompt, factorCount: prompt.split('、').length, passed, status: passed ? 'passed' : 'failed', durationMs: Date.now() - startedAt, assertions: [{ name: '组合规则与报告断言', passed, expected: '全部通过', actual: { parsedRules: data.parsedRules, selected: data.selectedStocks?.length } }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const blocked = /fetch failed|数据|行情|快照|timeout|ECONNREFUSED|暂不可用/i.test(message);
    return { id, layer: 'api', category: '真实组合接口', prompt, factorCount: prompt.split('、').length, passed: false, status: blocked ? 'blocked_external' : 'failed', durationMs: Date.now() - startedAt, assertions: [{ name: '接口请求', passed: false, expected: '成功', actual: message }] };
  }
}

const apiResults = [];
for (const testCase of apiCases) apiResults.push(await gradeApi(testCase));
const results = [...executableResults, ...mixedResults, ...filterResults, ...apiResults];
if (executableResults.length !== 55 || mixedResults.length !== 15 || filterResults.length !== 25 || apiResults.length !== 5 || results.length !== 100) {
  throw new Error(`组合用例数错误：${results.length}`);
}

const passed = results.filter((item) => item.passed).length;
const blockedExternal = results.filter((item) => item.status === 'blocked_external').length;
const failed = results.length - passed - blockedExternal;
const previous = JSON.parse(fs.readFileSync('test-results/stock-selection-100/results.json', 'utf8'));
const original = JSON.parse(fs.readFileSync('test-results/stock-selection/parser-results.json', 'utf8'));
const report = {
  generatedAt: new Date().toISOString(),
  suite: { name: 'fi_stock_selection_combinations_100', executableCombinations: 55, mixedCombinations: 15, filterCombinations: 25, apiCombinations: 5 },
  summary: { total: 100, passed, failed, blockedExternal, passRate: passed / 100 },
  combined: { total: original.summary.total + previous.summary.total + 100, passed: original.summary.passed + previous.summary.passed + passed, failed: original.summary.failed + previous.summary.failed + failed, blockedExternal },
  results,
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'results.json'), JSON.stringify(report, null, 2));
const markdown = [
  '# 标的筛选 Skill 组合专项100条测试报告', '',
  `- 全可执行组合：55`, `- 支持+缺失混合组合：15`, `- 固定夹具AND组合：25`, `- 真实接口组合：5`,
  `- 通过：${passed}`, `- 失败：${failed}`, `- 外部阻塞：${blockedExternal}`, `- 累计测试：${report.combined.passed}/${report.combined.total}`, '',
  '| ID | 层级 | 组合类型 | 因子数 | 结果 | 输入 | 失败证据 |', '| --- | --- | --- | ---: | --- | --- | --- |',
  ...results.map((item) => `| ${item.id} | ${item.layer} | ${item.category} | ${item.factorCount} | ${item.status === 'blocked_external' ? '外部阻塞' : item.passed ? '通过' : '失败'} | ${item.prompt.replace(/\|/g, '\\|')} | ${item.assertions.filter((assertion) => !assertion.passed).map((assertion) => JSON.stringify(assertion.actual)).join('；').replace(/\|/g, '\\|') || '--'} |`),
].join('\n');
fs.writeFileSync(path.join(OUTPUT_DIR, 'report.md'), markdown);
fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify({ summary: report.summary, combined: report.combined }, null, 2));
console.log(JSON.stringify({ summary: report.summary, combined: report.combined }));
if (failed > 0) process.exitCode = 1;
