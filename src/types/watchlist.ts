export interface WatchStock {
  序号: number;
  证券代码: string;
  证券名称: string;
  现价: number;
  涨幅: number;
  涨跌: number;
  涨速: number;
  换手: number;
  自选日: string;
  自选价格: number;
  自选收益: number;
  最高: number;
  最低: number;
}

export interface WatchDetail {
  代码: string;
  名称: string;
  现价: number;
  涨跌: number;
  涨跌幅: number;
  市场标识: string[];
  行情说明: string;
}

export interface FundFlowItem {
  name: string;
  value: number;
  color: string;
  label: string;
}