export interface HotspotItem {
  id: number;
  标题: string;
  内容: string;
  发布时间: string;
  情感打分: number;
  行业名称: string;
  概念名称: string;
  标的名称?: string;
  是否重复: boolean;
  来源: string;
}

export type HotspotSource = '全部' | '同花顺' | '华尔街见闻' | '财新网';