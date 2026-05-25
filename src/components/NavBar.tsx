import { useState } from 'react';
import { NavTab, SubTab } from '../types';

const mainTabs: NavTab[] = ['沪深京', '板块', '指数', '港股通', '港股', '美股', '股转', '期权期货现货', '外汇'];
const subTabs: SubTab[] = ['港股通', '沪股通', '深股通'];

export default function NavBar() {
  const [activeMain, setActiveMain] = useState<NavTab>('港股通');
  const [activeSub, setActiveSub] = useState<SubTab>('港股通');

  return (
    <div className="bg-primary-nav border-b border-gray-700">
      <div className="flex items-center px-2 py-1.5 gap-1">
        {mainTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveMain(tab)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeMain === tab
                ? 'bg-gray-600 text-white'
                : 'text-secondary hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex items-center px-2 py-1 gap-1 border-t border-gray-700">
        {subTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSub(tab)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeSub === tab
                ? 'bg-gray-600 text-white'
                : 'text-secondary hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}