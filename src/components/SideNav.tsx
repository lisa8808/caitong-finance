import { BarChart3, Star, MessageCircle, ArrowLeftRight, Flame, Activity } from 'lucide-react';

export type SideNavItem = '智询' | '市场' | '自选' | '热度' | '信号' | '策略';

interface Props {
  active: SideNavItem;
  onSelect: (item: SideNavItem) => void;
}

const navItems: { id: SideNavItem; icon: typeof BarChart3 }[] = [
  { id: '市场', icon: BarChart3 },
  { id: '自选', icon: Star },
  { id: '热度', icon: Flame },
  { id: '信号', icon: Activity },
  { id: '智询', icon: MessageCircle },
  { id: '策略', icon: ArrowLeftRight },
];

export default function SideNav({ active, onSelect }: Props) {
  return (
    <div className="w-14 bg-primary-nav flex flex-col items-center pt-0 gap-1 border-r border-gray-700">
      {navItems.map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`w-12 h-12 rounded flex flex-col items-center justify-center gap-1 transition-colors ${
            active === id
              ? 'bg-gray-700 text-white'
              : 'text-secondary hover:text-white hover:bg-gray-800'
          }`}
        >
          <Icon size={18} />
          <span className="text-[10px]">{id}</span>
        </button>
      ))}
    </div>
  );
}