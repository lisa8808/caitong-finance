import { Circle, Minus, X } from 'lucide-react';

export default function TitleBar() {
  return (
    <div className="h-9 bg-primary-nav flex items-center justify-between px-4 border-b border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-up flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">C</span>
        </div>
        <span className="text-sm font-semibold text-white">财瞳金融终端</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
          <X size={8} className="text-red-900" />
        </button>
        <button className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center hover:bg-yellow-600 transition-colors">
          <Minus size={8} className="text-yellow-900" />
        </button>
        <button className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors">
          <Circle size={8} className="text-green-900" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}