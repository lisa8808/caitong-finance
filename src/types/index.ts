export interface StockItem {
 序号: number;
 证券代码: string;
 证券名称: string;
 现价: number;
 涨幅: number;
 涨跌: number;
 涨速: number;
 换手: number;
 最高: number;
 最低: number;
 今开: number;
 昨收: number;
 量比: number;
}

export interface IndexItem {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volume: string;
}

export interface StockDetailData {
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  amount: number;
}

export type NavTab = '沪深京' | '板块' | '指数' | '港股通' | '港股' | '美股' | '股转' | '期权期货现货' | '外汇';
export type SubTab = '港股通' | '沪股通' | '深股通';
export type ChartTab = '分时' | '五日' | '日线' | '周线' | '月线' | '年线' | '60分' | '30分' | '15分' | '5分';
export type DetailTab = '资金流向' | '关联板块' | '成份股';