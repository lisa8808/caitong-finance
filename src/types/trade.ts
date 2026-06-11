export interface StrategyCard {
  id: number;
  名称: string;
  描述: string;
  关联标的: string[];
  年化收益?: string;
  介绍?: string;
  个股?: { 名称: string; 涨跌幅: number }[];
}

export interface TopicCard {
  id: number;
  名称: string;
  描述: string;
  时间: string;
  热度: number;
  isHot: boolean;
  关联个股: { 名称: string; 涨跌幅: number }[];
  年化收益: string;
  累计收益: string;
  最大回撤: string;
}

export interface ResultStock {
  代码: string;
  名称: string;
  市场: string;
  最新价: number;
  涨跌幅: number;
}

export interface WatchStock {
  代码: string;
  名称: string;
  现价: number;
  涨跌幅: number;
}