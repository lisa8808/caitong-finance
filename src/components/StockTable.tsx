import { useState } from 'react';
import { mockStocks } from '../data/mockData';
import { StockItem } from '../types';

interface Props {
  onSelectStock: (stock: StockItem) => void;
  selectedCode?: string;
}

const columns = ['序号', '证券代码', '证券名称', '现价', '涨幅%', '涨跌', '涨速%', '换手%', '最高', '最低', '今开', '昨收', '量比'];

export default function StockTable({ onSelectStock, selectedCode }: Props) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  const getColorClass = (col: string, value: number) => {
    if (['涨幅%', '涨跌', '现价'].includes(col)) {
      return value > 0 ? 'text-up' : value < 0 ? 'text-down' : 'text-neutral';
    }
    if (col === '涨速%') {
      return value > 0 ? 'text-up' : value < 0 ? 'text-down' : 'text-neutral';
    }
    return 'text-neutral';
  };

  return (
    <div className="flex-1 bg-primary-bg overflow-auto scrollbar-thin">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-primary-nav">
          <tr className="text-secondary">
            {columns.map((col) => (
              <th
                key={col}
                className="py-2 px-2 text-left font-normal border-b border-gray-700 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mockStocks.map((stock, idx) => (
            <tr
              key={stock.证券代码}
              onClick={() => onSelectStock(stock)}
              onMouseEnter={() => setHoveredRow(idx)}
              onMouseLeave={() => setHoveredRow(null)}
              className={`border-b border-gray-800 cursor-pointer transition-colors ${
                hoveredRow === idx ? 'bg-primary-chart' : idx % 2 === 0 ? 'bg-primary-bg' : 'bg-primary-chart'
              } ${selectedCode === stock.证券代码 ? 'bg-primary-chart border-l-2 border-l-yellow-500' : ''}`}
            >
              <td className="py-1.5 px-2 text-secondary font-mono">{stock.序号}</td>
              <td className="py-1.5 px-2 text-neutral font-mono">{stock.证券代码}</td>
              <td className="py-1.5 px-2 text-neutral">{stock.证券名称}</td>
              <td className={`py-1.5 px-2 font-mono font-semibold ${getColorClass('现价', stock.现价)}`}>
                {formatNumber(stock.现价)}
              </td>
              <td className={`py-1.5 px-2 font-mono ${getColorClass('涨幅%', stock.涨幅)}`}>
                {formatNumber(stock.涨幅)}%
              </td>
              <td className={`py-1.5 px-2 font-mono ${getColorClass('涨跌', stock.涨跌)}`}>
                {stock.涨跌 > 0 ? '+' : ''}{formatNumber(stock.涨跌)}
              </td>
              <td className={`py-1.5 px-2 font-mono ${getColorClass('涨速%', stock.涨速)}`}>
                {stock.涨速 > 0 ? '+' : ''}{formatNumber(stock.涨速)}%
              </td>
              <td className="py-1.5 px-2 text-neutral font-mono">{formatNumber(stock.换手)}%</td>
              <td className="py-1.5 px-2 text-neutral font-mono">{formatNumber(stock.最高)}</td>
              <td className="py-1.5 px-2 text-neutral font-mono">{formatNumber(stock.最低)}</td>
              <td className="py-1.5 px-2 text-neutral font-mono">{formatNumber(stock.今开)}</td>
              <td className="py-1.5 px-2 text-neutral font-mono">{formatNumber(stock.昨收)}</td>
              <td className="py-1.5 px-2 text-neutral font-mono">{formatNumber(stock.量比)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}