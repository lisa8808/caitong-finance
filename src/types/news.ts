export interface NewsItem {
  时间标记: string;
  代码: string;
  名称: string;
  涨幅: number;
  连板信息?: string;
  业务说明: string;
  题材标签: string[];
}