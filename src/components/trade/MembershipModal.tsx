import React, { useState } from 'react';

interface FeatureRow {
  name: string;
  free: string;
  advance: string;
  pro: string;
}

interface FeatureSection {
  title: string;
  rows: FeatureRow[];
}

const sections: FeatureSection[] = [
  {
    title: '智能分析',
    rows: [
      { name: '标的筛选', free: 'N次/天', advance: 'N+M次/天', pro: '不限次数' },
      { name: '异动解读', free: 'N次/天', advance: 'N+M次/天', pro: '不限次数' },
      { name: '趋势判断', free: 'N次/天', advance: 'N+M次/天', pro: '不限次数' },
      { name: '复盘总结', free: 'N次/天', advance: 'N+M次/天', pro: '不限次数' },
      { name: '策略制定', free: 'N次/天', advance: 'N+M次/天', pro: '不限次数' },
      { name: '风险提示', free: 'N次/天', advance: 'N+M次/天', pro: '不限次数' },
    ],
  },
  {
    title: '数据服务',
    rows: [
      { name: '自选数据', free: '免费体验', advance: '全部权益', pro: '全部权限' },
      { name: '市场数据', free: '免费体验', advance: '全部权益', pro: '全部权限' },
      { name: '热度数据', free: '×', advance: '全部权益', pro: '全部权限' },
      { name: '信号数据', free: '×', advance: '全部权益', pro: '全部权限' },
      { name: '策略选股', free: '×', advance: '全部权益', pro: '全部权限' },
    ],
  },
  {
    title: '实时交易',
    rows: [
      { name: '实时交易', free: '×', advance: '全部权益', pro: '全部权限' },
    ],
  },
];

interface Props {
  onClose: () => void;
}

export default function MembershipModal({ onClose }: Props) {
  const [plan, setPlan] = useState<'free' | 'advance' | 'pro' | 'enterprise'>('pro');
  const activeCol = plan === 'free' ? 1 : plan === 'advance' ? 2 : plan === 'enterprise' ? 2 : 3;

  const thClass = (col: number) => `py-2 text-center font-normal w-[20%] ${
    activeCol === col
      ? 'text-red-700 font-semibold border-2 border-red-500 rounded-t bg-red-50'
      : 'text-gray-500'
  }`;

  const tdClass = (col: number) => `py-1.5 text-center ${
    activeCol === col
      ? 'text-red-700 font-semibold border-l-2 border-r-2 border-red-500 bg-red-50'
      : 'text-gray-500'
  }`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-[820px] max-h-[90vh] overflow-auto shadow-2xl flex flex-col border border-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部导航栏 - 红色 */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-between px-4 py-2.5 rounded-t-lg flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-red-200 flex items-center justify-center">
              <span className="text-xs text-red-800 font-bold">牛</span>
            </div>
            <span className="text-white text-xs font-medium">mx_9hgz3w3knx</span>
          </div>
          <button onClick={onClose} className="px-3.5 py-1.5 text-xs rounded-md bg-red-200 text-red-800 font-medium">关闭</button>
        </div>

        {/* 主体 - 白底 */}
        <div className="flex flex-1">
          {/* 左侧 */}
          <div className="w-[340px] p-4 flex flex-col gap-3 flex-shrink-0 border-r border-gray-200">
            <h2 className="text-base font-bold text-gray-800">开通会员</h2>

            <div
              onClick={() => setPlan('free')}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                plan === 'free' ? 'border-gray-800 bg-gray-100' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${plan === 'free' ? 'text-gray-800' : 'text-gray-700'}`}>免费版</span>
                <span className="text-[10px] text-gray-400">基础体验版</span>
              </div>
              <div className="text-[10px] text-gray-500">基础 AI 对话能力、市场数据查看</div>
            </div>

            <div
              onClick={() => setPlan('advance')}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                plan === 'advance' ? 'border-gray-800 bg-gray-100' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${plan === 'advance' ? 'text-gray-800' : 'text-gray-700'}`}>进阶版</span>
                <span className="text-[10px] text-gray-400">AI 投资开拓者</span>
              </div>
              <div className="text-[10px] text-gray-500">「快速 + 专家」双模式，智能问答、AI分析、策略推荐</div>
            </div>

            <div
              onClick={() => setPlan('pro')}
              className={`border-2 rounded-lg p-3 cursor-pointer transition-colors relative ${
                plan === 'pro' ? 'border-gray-800 bg-gray-100' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gray-800 text-white text-[10px] rounded-full font-semibold">推荐</div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${plan === 'pro' ? 'text-gray-800' : 'text-gray-700'}`}>专业版</span>
                <span className="text-[10px] text-gray-500">全功能专业版</span>
              </div>
              <div className="text-[10px] text-gray-500">量化交易全流程实时服务</div>
            </div>

            <div
              onClick={() => setPlan('enterprise')}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                plan === 'enterprise' ? 'border-gray-800 bg-gray-100' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${plan === 'enterprise' ? 'text-gray-800' : 'text-gray-700'}`}>企业版</span>
                <span className="text-[10px] text-gray-400">企业级定制</span>
              </div>
              <div className="text-[10px] text-gray-500">专属策略定制、API接入、多账户管理、数据导出</div>
            </div>

            <button className="w-full py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-bold">
              {plan === 'enterprise' ? '联系客服' : `立即开通 ¥${plan === 'pro' ? '518' : plan === 'advance' ? '268' : '0'}/季`}
            </button>
          </div>

          {/* 右侧表格 */}
          <div className="flex-1 p-4 overflow-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-2 text-left text-gray-600 font-normal">权益对比</th>
                  <th className={thClass(1)}>免费版</th>
                  <th className={thClass(2)}>进阶版</th>
                  <th className={thClass(3)}>专业版</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, si) => (
                  <React.Fragment key={section.title}>
                    <tr>
                      <td colSpan={4} className={`py-1.5 text-[10px] text-gray-400 font-medium ${si > 0 ? 'pt-3' : ''}`}>
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr key={row.name} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-700">{row.name}</td>
                        <td className={tdClass(1)}>{row.free}</td>
                        <td className={tdClass(2)}>{row.advance}</td>
                        <td className={tdClass(3)}>{row.pro}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
