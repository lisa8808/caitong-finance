import fs from 'node:fs';
import path from 'node:path';
import { filterStockSelectionCandidates, parseStockSelectionRules } from '../server/stock-selection-rules.mjs';

const cases = [
  ['PE-01', 'PE低于20的A股', { peMax: 20 }],
  ['PE-02', '市盈率小于15', { peMax: 15 }],
  ['PE-03', 'pettm < 18.5', { peMax: 18.5 }],
  ['PE-04', 'PE不高于30', { peMax: 30 }],
  ['PE-05', 'PE≤12.8', { peMax: 12.8 }],
  ['PE-06', '市盈率<25的银行股', { peMax: 25, industryKeywords: ['银行'] }],
  ['PB-01', 'PB低于2', { pbMax: 2 }],
  ['PB-02', '市净率小于1.5', { pbMax: 1.5 }],
  ['PB-03', '破净股', { pbMax: 1 }],
  ['PB-04', 'pb≤0.9', { pbMax: 0.9 }],
  ['PB-05', 'PB越低越好', {}, ['PB/市净率条件（未识别阈值）']],
  ['TR-01', '换手率高于3%', { turnoverRateMin: 3 }],
  ['TR-02', '换手率超过5.5', { turnoverRateMin: 5.5 }],
  ['TR-03', '换手率>10%', { turnoverRateMin: 10 }],
  ['TR-04', '换手率活跃', {}, ['换手率条件（未识别阈值）']],
  ['VR-01', '量比大于1.5', { volumeRatioMin: 1.5 }],
  ['VR-02', '量比高于2', { volumeRatioMin: 2 }],
  ['VR-03', '量比≥3.2', { volumeRatioMin: 3.2 }],
  ['VR-04', '量比明显放大', {}, ['量比条件（未识别阈值）']],
  ['MV-01', '总市值大于100亿', { totalMvMinYi: 100 }],
  ['MV-02', '总市值低于500亿', { totalMvMaxYi: 500 }],
  ['MV-03', '总市值>50亿且总市值<300亿', { totalMvMinYi: 50, totalMvMaxYi: 300 }],
  ['MV-04', '流通市值高于30亿', { circMvMinYi: 30 }],
  ['MV-05', '流通市值不高于200亿', { circMvMaxYi: 200 }],
  ['MV-06', '总市值中等的股票', {}, ['总市值条件（未识别阈值或单位）']],
  ['FIN-01', '营收同比增长超过20%', { revenueGrowthMin: 20 }],
  ['FIN-02', '营收增速高于35.5%', { revenueGrowthMin: 35.5 }],
  ['FIN-03', '高成长股', { revenueGrowthMin: 20 }],
  ['FIN-04', 'ROE高于12%', { roeMin: 12 }],
  ['FIN-05', '净资产收益率超过15%', { roeMin: 15 }],
  ['FIN-06', '毛利率高于30%', {}, ['毛利率条件']],
  ['IND-01', '筛选半导体股', { industryKeywords: ['半导体'] }],
  ['IND-02', '找新能源行业A股', { industryKeywords: ['新能源'] }],
  ['IND-03', '医药和汽车板块', { industryKeywords: ['医药', '汽车'] }],
  ['IND-04', '消费电子标的', { industryKeywords: ['消费电子', '电子'] }],
  ['IND-05', '通信和计算机股', { industryKeywords: ['通信', '计算机'] }],
  ['FLOW-01', '近5日主力资金净流入', { mainNetInflowDays: 5 }],
  ['FLOW-02', '近3个交易日主力资金流入', { mainNetInflowDays: 3 }],
  ['FLOW-03', '近10交易日主力资金累计净流入', { mainNetInflowDays: 10 }],
  ['FLOW-04', '主力资金净流入的股票', { mainNetInflowDays: 5 }],
  ['TECH-01', '均线多头排列', {}, ['均线形态条件']],
  ['TECH-02', '突破20日新高', {}, ['突破形态条件']],
  ['TECH-03', 'MACD金叉且RSI低于30', {}, ['技术指标条件']],
  ['TECH-04', '近期放量的股票', {}, ['成交额放大条件']],
  ['TECH-05', '净利润增长超过25%', {}, ['净利润增长条件']],
  ['MIX-01', '新能源行业PE低于25、ROE高于12%、营收同比增长超过20%，且近5日主力资金净流入', { peMax: 25, roeMin: 12, revenueGrowthMin: 20, mainNetInflowDays: 5, industryKeywords: ['新能源'] }],
  ['MIX-02', '电子股中PE<20、PB<2、量比>1.5', { peMax: 20, pbMax: 2, volumeRatioMin: 1.5, industryKeywords: ['电子'] }],
  ['MIX-03', '银行股，破净，总市值高于500亿', { pbMax: 1, totalMvMinYi: 500, industryKeywords: ['银行'] }],
  ['MIX-04', '汽车股，流通市值>50亿且流通市值<300亿，换手率>3%', { circMvMinYi: 50, circMvMaxYi: 300, turnoverRateMin: 3, industryKeywords: ['汽车'] }],
  ['MIX-05', '半导体股PE低于30，均线多头且放量', { peMax: 30, industryKeywords: ['半导体'] }, ['均线形态条件', '成交额放大条件']],
  ['SAFE-01', '找必涨股，保证明天赚10%', {}, []],
  ['SAFE-02', '给我一个满仓梭哈的买点', {}, []],
  ['SYN-01', 'PE TTM至多18倍', { peMax: 18 }],
  ['SYN-02', '市盈率至多25', { peMax: 25 }],
  ['SYN-03', 'PB至多1.2', { pbMax: 1.2 }],
  ['SYN-04', '换手率不低于5%', { turnoverRateMin: 5 }],
  ['SYN-05', '换手率至少3%', { turnoverRateMin: 3 }],
  ['SYN-06', '量比不低于1.8', { volumeRatioMin: 1.8 }],
  ['SYN-07', '量比至少2', { volumeRatioMin: 2 }],
  ['SYN-08', '营业收入同比增长至少 12%', { revenueGrowthMin: 12 }],
  ['SYN-09', 'ROE不低于10%', { roeMin: 10 }],
  ['SYN-10', '净资产收益率至少 18%', { roeMin: 18 }],
  ['FLOW-05', '最近5日主力资金净流入', { mainNetInflowDays: 5 }],
  ['FLOW-06', '近五日主力资金净流入', { mainNetInflowDays: 5 }],
  ['FLOW-07', '最近十日主力资金净流入', { mainNetInflowDays: 10 }],
  ['FLOW-08', '近十五个交易日主力资金净流入', { mainNetInflowDays: 15 }],
  ['IND-06', '光伏股', { industryKeywords: ['光伏'] }],
  ['IND-07', '锂电池产业链', { industryKeywords: ['锂电池'] }],
  ['IND-08', '军工和有色金属', { industryKeywords: ['军工', '有色金属'] }],
  ['IND-09', '食品饮料和家电', { industryKeywords: ['食品饮料', '家电'] }],
  ['IND-10', '保险、房地产和煤炭', { industryKeywords: ['保险', '房地产', '煤炭'] }],
  ['IND-11', '化工、传媒和软件', { industryKeywords: ['化工', '传媒', '软件'] }],
  ['EXT-VAL-01', '市销率PS低于3', {}, ['PS/市销率条件']],
  ['EXT-VAL-02', 'PEG低于1', {}, ['PEG/EV-EBITDA估值条件']],
  ['EXT-VAL-03', 'EV/EBITDA低于10', {}, ['PEG/EV-EBITDA估值条件']],
  ['EXT-FIN-01', '净利润同比增长超过30%', {}, ['净利润增长条件']],
  ['EXT-FIN-02', '毛利率高于40%', {}, ['毛利率条件']],
  ['EXT-FIN-03', '净利率高于15%', {}, ['净利率条件']],
  ['EXT-FIN-04', '资产负债率低于40%', {}, ['资产负债率条件']],
  ['EXT-FIN-05', '股息率高于3%', {}, ['股息率条件']],
  ['EXT-FIN-06', '每股收益EPS高于1元', {}, ['每股收益条件']],
  ['EXT-FIN-07', '每股净资产高于5元', {}, ['每股净资产条件']],
  ['EXT-TECH-01', 'MA5穿越MA20，均线多头', {}, ['均线形态条件']],
  ['EXT-TECH-02', '收盘价突破60日新高', {}, ['突破形态条件']],
  ['EXT-TECH-03', 'RSI低于30', {}, ['技术指标条件']],
  ['EXT-TECH-04', 'MACD金叉', {}, ['技术指标条件']],
  ['EXT-TECH-05', 'KDJ金叉', {}, ['技术指标条件']],
  ['EXT-TECH-06', '突破布林带上轨', {}, ['突破形态条件', '技术指标条件']],
  ['EXT-MKT-01', '近5日涨幅超过10%', {}, ['涨跌幅条件']],
  ['EXT-MKT-02', '振幅低于5%', {}, ['振幅或波动率条件']],
  ['EXT-MKT-03', '近20日波动率小于15%', {}, ['振幅或波动率条件']],
  ['EXT-MKT-04', '最近三连板', {}, ['连板条件']],
  ['EXT-CAP-01', '近5日北向资金净流入', {}, ['其他资金面条件']],
  ['EXT-CAP-02', '融资余额连续增长', {}, ['其他资金面条件']],
  ['EXT-HOLD-01', '机构持仓比例高于30%', {}, ['持仓结构条件']],
  ['EXT-HOLD-02', '基金持仓连续增加', {}, ['持仓结构条件']],
  ['EXT-HOLD-03', '股东户数连续减少', {}, ['持仓结构条件']],
  ['EXT-MIX-01', '光伏股PE低于20、ROE至少 15%、股息率高于2%', { peMax: 20, roeMin: 15, industryKeywords: ['光伏'] }, ['股息率条件']],
  ['EXT-MIX-02', '军工股总市值高于100亿，MACD金叉且近5日主力资金净流入', { totalMvMinYi: 100, mainNetInflowDays: 5, industryKeywords: ['军工'] }, ['技术指标条件']],
];

function sameValue(actual, expected) {
  if (Array.isArray(expected)) return Array.isArray(actual) && expected.every((item) => actual.includes(item));
  return actual === expected;
}

const parserResults = cases.map(([id, prompt, expected, unsupported = []]) => {
  const actual = parseStockSelectionRules(prompt);
  const assertions = [
    ...Object.entries(expected).map(([key, value]) => ({
      name: `${key} matches`,
      passed: sameValue(actual[key], value),
      expected: value,
      actual: actual[key],
    })),
    ...unsupported.map((label) => ({
      name: `unsupported reports ${label}`,
      passed: actual.unsupportedConditions.includes(label),
      expected: label,
      actual: actual.unsupportedConditions,
    })),
  ];
  return { id, prompt, passed: assertions.every((item) => item.passed), assertions, actual };
});

const fixtureRows = [
  { code: '000001', name: '正常边界股', price: 10, pe: 20, pb: 2, turnoverRate: 3, volumeRatio: 1.5, totalMv: 100e8, circMv: 50e8, industry: '银行' },
  { code: '000002', name: '严格通过股', price: 10, pe: 19.99, pb: 1.99, turnoverRate: 3.01, volumeRatio: 1.51, totalMv: 100.01e8, circMv: 50.01e8, industry: '银行' },
  { code: '000003', name: 'ST风险股', price: 10, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000004', name: '退市整理', price: 10, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000005', name: '无行情股', price: 0, pe: 10, pb: 1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000006', name: '负估值股', price: 10, pe: -5, pb: -1, turnoverRate: 8, volumeRatio: 3, totalMv: 200e8, circMv: 100e8, industry: '银行' },
  { code: '000007', name: '严格不通过股', price: 10, pe: 25, pb: 3, turnoverRate: 1, volumeRatio: 0.8, totalMv: 40e8, circMv: 20e8, industry: '汽车' },
];

const filterCases = [
  ['FILTER-PE', 'PE严格小于边界', { peMax: 20 }, [], ['000002']],
  ['FILTER-PB', 'PB严格小于边界', { pbMax: 2 }, [], ['000002']],
  ['FILTER-TR', '换手率严格大于边界', { turnoverRateMin: 3 }, [], ['000002', '000006']],
  ['FILTER-VR', '量比严格大于边界', { volumeRatioMin: 1.5 }, [], ['000002', '000006']],
  ['FILTER-TMV', '总市值严格大于边界', { totalMvMinYi: 100 }, [], ['000002', '000006']],
  ['FILTER-CMV', '流通市值严格大于边界', { circMvMinYi: 50 }, [], ['000002', '000006']],
  ['FILTER-ST', 'ST始终剔除', {}, [], ['000001', '000002', '000006', '000007']],
  ['FILTER-DEL', '退市始终剔除', {}, [], ['000001', '000002', '000006', '000007']],
  ['FILTER-PRICE', '无行情始终剔除', {}, [], ['000001', '000002', '000006', '000007']],
  ['FILTER-NEG-PE', '负PE在PE条件下剔除', { peMax: 30 }, [], ['000001', '000002', '000007']],
  ['FILTER-NEG-PB', '负PB在PB条件下剔除', { pbMax: 4 }, [], ['000001', '000002', '000007']],
  ['FILTER-IND', '行业必须匹配', {}, ['银行'], ['000001', '000002', '000006']],
  ['FILTER-AND', '复合条件为AND', { peMax: 20, pbMax: 2, turnoverRateMin: 3, volumeRatioMin: 1.5 }, ['银行'], ['000002']],
  ['FILTER-EMPTY', '无命中不放宽', { peMax: 1 }, [], []],
  ['FILTER-MAX', '多条件严格筛选', { peMax: 21, totalMvMinYi: 100 }, ['银行'], ['000002']],
].map(([id, prompt, partialRules, industryTerms, expectedCodes]) => {
  const rules = { ...parseStockSelectionRules(''), ...partialRules };
  const actualCodes = filterStockSelectionCandidates(fixtureRows, rules, industryTerms).map((row) => row.code);
  const passed = JSON.stringify(actualCodes) === JSON.stringify(expectedCodes);
  return {
    id,
    prompt,
    passed,
    assertions: [{ name: 'selected codes match', passed, expected: expectedCodes, actual: actualCodes }],
    actual: { selectedCodes: actualCodes },
  };
});

const results = [...parserResults, ...filterCases];

const passed = results.filter((item) => item.passed).length;
const report = {
  generatedAt: new Date().toISOString(),
  summary: { total: results.length, passed, failed: results.length - passed, passRate: passed / results.length },
  results,
};
const outputDir = path.resolve('test-results/stock-selection');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'parser-results.json'), JSON.stringify(report, null, 2));
const markdown = [
  '# 标的筛选 Skill 解析器测试报告',
  '',
  `- 用例数：${results.length}`,
  `- 通过：${passed}`,
  `- 失败：${results.length - passed}`,
  `- 通过率：${(passed / results.length * 100).toFixed(2)}%`,
  '',
  '| ID | 结果 | 输入 | 失败断言 |',
  '| --- | --- | --- | --- |',
  ...results.map((item) => `| ${item.id} | ${item.passed ? '通过' : '失败'} | ${item.prompt.replace(/\|/g, '\\|')} | ${item.assertions.filter((assertion) => !assertion.passed).map((assertion) => assertion.name).join('；') || '--'} |`),
].join('\n');
fs.writeFileSync(path.join(outputDir, 'parser-report.md'), markdown);
console.log(JSON.stringify(report.summary));
if (report.summary.failed > 0) process.exitCode = 1;
