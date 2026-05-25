export interface HeatStock {
  代码: string;
  名称: string;
  现价: number;
  涨幅: number;
  首次涨停时间: string;
  开板次数: number;
  明涨停概率: number;
  连板数: number;
  题材: string[];
}

export interface SubjectBlock {
  名称: string;
  涨幅: number;
  最高连板: number;
  上涨家数: number;
  涨停家数: number;
  下跌家数: number;
  跌停家数: number;
  描述: string;
}

export interface SimilarStock {
  代码: string;
  名称: string;
  现价: number;
  涨幅: number;
  题材标签: string[];
  相似度: number;
  行业地位: string;
}

export interface StrategyTag {
  name: string;
}

export interface SentimentData {
  date: string;
  连板数: number;
  非一字连板数: number;
  成功率: number;
  炸板率: number;
  最高板: number;
  涨停家数: number;
  跌停家数: number;
}

export interface GlobalStock {
  代码: string;
  名称: string;
  现价: number;
  涨跌幅: number;
  涨跌额: number;
  振幅: number;
  量比: number;
  题材标签: string[];
}

export type PageId = '市场' | '热度' | '行情' | '资讯' | '交易';