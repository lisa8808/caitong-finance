export interface HotspotItem {
  id: number;
  标题: string;
  内容: string;
  发布时间: string;
  情感打分: number;
  行业名称: string;
  概念名称: string;
  标的名称?: string;
  标的代码?: string;
  是否重复: boolean;
  来源: string;
}

export interface SourceSubCategory {
  label: string;
}

export interface SourceCategory {
  label: string;
  children: string[];
}

export const SOURCE_TREE: SourceCategory[] = [
  { label: '政策法规', children: ['权威政策快讯', '政策类长篇报道'] },
  { label: '新闻资讯', children: ['财联社快讯', '东方财富资讯', '政策监管快讯'] },
  { label: '互动问答', children: ['上证e互动问答', '深证易互动问答'] },
];

export const ALL_SOURCES = SOURCE_TREE.flatMap((cat) => cat.children);

export type HotspotSource = '全部' | typeof ALL_SOURCES[number];
