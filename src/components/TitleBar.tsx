import { useState, ReactNode } from 'react';
import { UserCircle, LogOut } from 'lucide-react';

interface Props {
  rightContent?: ReactNode;
}

export default function TitleBar({ rightContent }: Props) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userLevel = '专业版';

  return (
    <div className="h-9 bg-primary-nav flex items-center justify-between px-4 border-b border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-up flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">C</span>
        </div>
        <span className="text-sm font-semibold text-white">财瞳金融</span>
      </div>
      <div className="flex items-center gap-2 relative">
        {rightContent}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="text-secondary hover:text-white transition-colors"
        >
          <UserCircle size={18} />
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 z-40 w-52 bg-[#1A1D23] border border-[#2C303A] rounded-lg shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
                    <UserCircle size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">李女士</div>
                    <div className="text-secondary text-xs">mx_9hgz3w3knx</div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">会员等级</span>
                  <span className="text-xs font-semibold text-yellow-400">{userLevel}</span>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-700/50">
                <button className="flex items-center gap-2 text-xs text-secondary hover:text-red-400 transition-colors">
                  <LogOut size={12} /> 退出登录
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
