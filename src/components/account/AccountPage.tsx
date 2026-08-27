import { useState } from 'react';
import { Eye, EyeOff, HelpCircle, ArrowRight, X, Plus, Settings, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { accounts, compareChartData } from '../../data/accountData';
import { getLinkedAccounts, getRemovedAccountIds, saveLinkedAccounts, saveRemovedAccountIds } from '../../services/accountStorage';
import { Account } from '../../types/account';

const profitDateYear = 2026;

const toProfitInputDate = (date: string) => {
  const [month, day] = date.split('/').map(Number);
  return `${profitDateYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const formatProfitDate = (date: string) => date.slice(5).replace('-', '/').replace(/^0/, '').replace('/0', '/');

export default function AccountPage() {
  const [selectedId, setSelectedId] = useState(accounts[0].id);
  const [showAmount, setShowAmount] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showProfitDetail, setShowProfitDetail] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAccountManage, setShowAccountManage] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<Account[]>(() => getLinkedAccounts());
  const [removedAccountIds, setRemovedAccountIds] = useState<string[]>(() => getRemovedAccountIds());
  const [transferType, setTransferType] = useState<'in' | 'out'>('in');
  const [transferAmount, setTransferAmount] = useState('');
  const [billPeriod, setBillPeriod] = useState('本月');
  const [period, setPeriod] = useState('本月');
  const [profitStartDate, setProfitStartDate] = useState(toProfitInputDate(compareChartData[0].date));
  const [profitEndDate, setProfitEndDate] = useState(toProfitInputDate(compareChartData[compareChartData.length - 1].date));
  const [addAccountPlatform, setAddAccountPlatform] = useState('涨乐通');
  const [addAccountNo, setAddAccountNo] = useState('');
  const [addAccountPhone, setAddAccountPhone] = useState('');
  const [addAccountCode, setAddAccountCode] = useState('');
  const [addAccountMessage, setAddAccountMessage] = useState('');

  const defaultAccounts = accounts.filter((item) => !removedAccountIds.includes(item.id));
  const accountList = [...defaultAccounts, ...linkedAccounts];
  const account = accountList.find((a) => a.id === selectedId) || accountList[0];

  const fmtCurrency = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalProfitSign = account.totalProfit >= 0 ? '+' : '';
  const latestComparePoint = compareChartData[compareChartData.length - 1];
  const profitRangeData = compareChartData.filter((item) => {
    const date = toProfitInputDate(item.date);
    return date >= profitStartDate && date <= profitEndDate;
  });
  const profitRangeStart = profitRangeData[0];
  const profitRangeLatest = profitRangeData[profitRangeData.length - 1];
  const profitRangePct = profitRangeStart && profitRangeLatest ? profitRangeLatest.account - profitRangeStart.account : 0;
  const benchmarkRangePct = profitRangeStart && profitRangeLatest ? profitRangeLatest.benchmark - profitRangeStart.benchmark : 0;
  const profitRangeAmount = latestComparePoint?.account ? account.totalProfit * profitRangePct / latestComparePoint.account : 0;
  const profitRangeSign = profitRangeAmount >= 0 ? '+' : '';
  const maxDrawdown = profitRangeData.length > 0 ? Math.min(...profitRangeData.map((item) => item.account - profitRangeData[0].account)) : 0;
  const profitDetailRows = profitRangeData.map((item, index) => {
    const prev = profitRangeData[index - 1];
    const rangeBase = profitRangeData[0];
    const dailyPct = prev ? item.account - prev.account : 0;
    const benchmarkDailyPct = prev ? item.benchmark - prev.benchmark : 0;
    const cumulativePct = item.account - rangeBase.account;
    const benchmarkPct = item.benchmark - rangeBase.benchmark;
    const profitAmount = latestComparePoint?.account ? account.totalProfit * cumulativePct / latestComparePoint.account : 0;

    return {
      date: item.date,
      cumulativePct,
      dailyPct,
      benchmarkPct,
      benchmarkDailyPct,
      excessPct: cumulativePct - benchmarkPct,
      profitAmount,
    };
  });

  const resetAddAccountForm = () => {
    setAddAccountPlatform('涨乐通');
    setAddAccountNo('');
    setAddAccountPhone('');
    setAddAccountCode('');
    setAddAccountMessage('');
  };

  const closeAddAccountModal = () => {
    setShowAddAccount(false);
    resetAddAccountForm();
  };

  const handleSendBindCode = () => {
    if (!addAccountPhone.trim() && !addAccountNo.trim()) {
      setAddAccountMessage('请先输入手机号或资金账号');
      return;
    }

    setAddAccountMessage('Demo 验证码已发送，输入任意验证码即可绑定');
  };

  const handleBindAccount = () => {
    const accountNo = addAccountNo.trim();
    const phone = addAccountPhone.trim();
    const code = addAccountCode.trim();

    if (!accountNo && !phone) {
      setAddAccountMessage('请输入资金账号或手机号');
      return;
    }

    if (!code) {
      setAddAccountMessage('请输入验证码');
      return;
    }

    const displayNo = accountNo || phone;
    const exists = accountList.some((item) => item.platform === addAccountPlatform && item.accountId === displayNo);
    if (exists) {
      setAddAccountMessage('该账户已绑定');
      return;
    }

    const suffix = displayNo.slice(-4).padStart(4, '0');
    const linkedAccount: Account = {
      id: `linked-${addAccountPlatform}-${displayNo}-${Date.now()}`,
      platform: addAccountPlatform,
      accountId: displayNo,
      label: `${addAccountPlatform}-${suffix}`,
      totalAssets: 736520,
      totalProfit: 5820,
      totalProfitPct: 0.79,
      cash: 68420,
      stockValue: 598100,
      financeValue: 70000,
      yesterdayProfit: 2360,
      yesterdayProfitPct: 0.32,
      yesterdayStocks: [
        { name: '东方财富', code: '300059', pnl: 1680, pct: 2.15 },
        { name: '中际旭创', code: '300308', pnl: 4250, pct: 3.42 },
        { name: '赛力斯', code: '601127', pnl: -980, pct: -1.06 },
      ],
      billSummary: {
        交易次数: '12',
        交易标的数: '5',
        清仓次数: '2',
        交易费用: '386.00',
        转入金额: '20,000.00',
        转出金额: '0.00',
      },
      billRecords: [
        { time: '06-09 14:18', name: '中际旭创', price: '188.60', amount: '+37,720', qty: '200', fee: '6.80', dir: '买入' },
        { time: '06-09 10:42', name: '东方财富', price: '18.90', amount: '+56,700', qty: '3,000', fee: '8.20', dir: '买入' },
        { time: '06-08 13:35', name: '赛力斯', price: '92.40', amount: '-46,200', qty: '500', fee: '7.50', dir: '卖出' },
        { time: '06-07 09:58', name: '中际旭创', price: '181.20', amount: '-36,240', qty: '200', fee: '6.50', dir: '卖出' },
      ],
    };

    const nextAccounts = [...linkedAccounts, linkedAccount];
    setLinkedAccounts(nextAccounts);
    saveLinkedAccounts(nextAccounts);
    setSelectedId(linkedAccount.id);
    setShowAccountManage(true);
    closeAddAccountModal();
  };

  const handleDeleteAccount = (accountId: string) => {
    if (accountList.length <= 1) return;

    const linkedAccount = linkedAccounts.find((item) => item.id === accountId);
    if (linkedAccount) {
      const nextAccounts = linkedAccounts.filter((item) => item.id !== accountId);
      setLinkedAccounts(nextAccounts);
      saveLinkedAccounts(nextAccounts);
    } else {
      const nextRemovedIds = [...removedAccountIds, accountId];
      setRemovedAccountIds(nextRemovedIds);
      saveRemovedAccountIds(nextRemovedIds);
    }

    if (selectedId === accountId) {
      const nextAccount = accountList.find((item) => item.id !== accountId);
      if (nextAccount) setSelectedId(nextAccount.id);
    }
  };

  if (!account) {
    return (
      <div className="flex-1 bg-primary-bg overflow-auto scrollbar-thin" style={{ minHeight: 0 }}>
        <div className="m-6 rounded-xl border border-gray-700 bg-primary-nav p-8 text-center">
          <div className="text-white text-base font-semibold">暂无账户</div>
          <p className="mt-2 text-sm text-secondary">请先添加证券账户后查看资产信息。</p>
          <button
            onClick={() => setShowAddAccount(true)}
            className="mt-5 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> 添加账户
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-primary-bg overflow-auto scrollbar-thin" style={{ minHeight: 0 }}>
      {/* 多账户 Tab */}
      <div className="mx-6 mt-4 flex items-center gap-1 bg-primary-nav rounded-lg p-1 border border-gray-700 overflow-x-auto scrollbar-thin">
        {accountList.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setSelectedId(a.id);
              setShowTransfer(false);
              setShowBill(false);
              setShowProfitDetail(false);
            }}
            className={`shrink-0 py-2 px-3 text-xs rounded-md font-medium transition-colors ${
              selectedId === a.id
                ? 'bg-blue-600 text-white shadow'
                : 'text-secondary hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {a.label}
          </button>
        ))}
        <button
          onClick={() => setShowAccountManage(true)}
          className="shrink-0 flex items-center gap-1 py-2 px-3 text-xs rounded-md font-medium text-blue-300 hover:text-white hover:bg-blue-600/40 transition-colors"
        >
          <Settings size={13} /> 账户管理
        </button>
      </div>

      {/* 总资产核心卡片 */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 mx-6 mt-4 rounded-xl p-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/70 text-sm">账户总资产（元）</span>
              <HelpCircle size={14} className="text-white/50 cursor-help" />
              <button onClick={() => setShowAmount(!showAmount)} className="text-white/50 hover:text-white/80">
                {showAmount ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
            <div className="text-3xl font-bold text-white font-mono">
              {showAmount ? fmtCurrency(account.totalAssets) : '****'}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`${account.totalProfit > 0 ? 'text-up' : account.totalProfit < 0 ? 'text-down' : 'text-neutral'} text-sm font-mono`}>{totalProfitSign}{account.totalProfit.toLocaleString()}</span>
              <span className={`${account.totalProfitPct > 0 ? 'text-up' : account.totalProfitPct < 0 ? 'text-down' : 'text-neutral'} text-sm font-mono`}>{account.totalProfitPct >= 0 ? '+' : ''}{account.totalProfitPct.toFixed(2)}%</span>
              <span className="text-white/50 text-xs">累计总收益</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTransfer(true)} className="px-5 py-2.5 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25 transition-colors">转账</button>
          <button onClick={() => setShowBill(true)} className="px-5 py-2.5 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25 transition-colors">账单</button>
        </div>
      </div>

      {/* 市场资讯横幅 */}
      {showBanner && (
        <div className="mx-6 mt-4 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
          <p className="text-sm text-blue-300">
            盘中速递：沪指盘中突破4100点，AI算力板块持续走强 |
            <span className="text-blue-400 cursor-pointer hover:underline ml-1">《大盘值班室》</span>
          </p>
          <button onClick={() => setShowBanner(false)} className="text-blue-400 hover:text-blue-300"><X size={14} /></button>
        </div>
      )}

      {/* 资产分类卡片 */}
      <div className="mx-6 mt-4 grid grid-cols-3 gap-3">
        {([
          { name: '现金', amount: fmtCurrency(account.cash), pnl: account.yesterdayProfit >= 0 ? `+${fmtCurrency(account.yesterdayProfit)}` : fmtCurrency(account.yesterdayProfit), isUp: account.yesterdayProfit >= 0 },
          { name: '股票', amount: fmtCurrency(account.stockValue), pnl: `${totalProfitSign}${account.totalProfit.toLocaleString()}`, isUp: account.totalProfit >= 0 },
          { name: '理财', amount: fmtCurrency(account.financeValue), link: '惠理财' },
        ] as const).map((item) => (
          <div key={item.name} className="bg-primary-nav rounded-xl border border-gray-700 p-4 cursor-pointer hover:border-gray-500 transition-colors">
            <div className="text-xs text-secondary mb-1">{item.name}</div>
            <div className="text-lg font-bold text-neutral font-mono">{item.amount}</div>
            <div className="flex items-center gap-2 mt-1">
              {'pnl' in item && item.pnl && (
                <span className={`text-xs font-mono ${item.isUp ? 'text-up' : 'text-down'}`}>
                  {'link' in item ? '' : '昨日 '}{item.pnl}
                </span>
              )}
              {'link' in item && item.link && (
                <span className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  查看{item.link} <ArrowRight size={10} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 昨日收益明细 */}
      <div className="mx-6 mt-4 bg-primary-nav rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">昨日收益（截至6月8日）</span>
            <span className="text-xs text-price">跑赢82%平台用户</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-2xl font-bold font-mono ${account.yesterdayProfit >= 0 ? 'text-up' : 'text-down'}`}>
              {account.yesterdayProfit >= 0 ? '+' : ''}{account.yesterdayProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-lg font-mono ${account.yesterdayProfit >= 0 ? 'text-up' : 'text-down'}`}>
              {account.yesterdayProfit >= 0 ? '+' : ''}{account.yesterdayProfitPct.toFixed(2)}%
            </span>
          </div>
        </div>
        {account.yesterdayStocks.map((s) => (
          <div key={s.code} className={`flex items-center justify-between px-6 py-3 border-b border-gray-800 ${s.pnl >= 0 ? 'bg-up/5' : 'bg-down/5'}`}>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral">{s.name}</span>
              <span className="text-xs text-secondary font-mono">{s.code}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-mono font-semibold ${s.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                {s.pnl >= 0 ? '+' : ''}{s.pnl.toLocaleString()}
              </span>
              <span className={`text-xs font-mono ${s.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                {s.pnl >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 资产分析可视化 */}
      <div className="mx-6 mt-4 mb-6 bg-primary-nav rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">本月收益</span>
              <span className={`${account.totalProfit > 0 ? 'text-up' : account.totalProfit < 0 ? 'text-down' : 'text-neutral'} text-xl font-bold font-mono`}>{totalProfitSign}{account.totalProfit.toLocaleString()}</span>
              <span className={`${account.totalProfitPct > 0 ? 'text-up' : account.totalProfitPct < 0 ? 'text-down' : 'text-neutral'} text-sm font-mono`}>{account.totalProfitPct >= 0 ? '+' : ''}{account.totalProfitPct.toFixed(2)}%</span>
            </div>
            <p className="text-xs text-secondary mt-1">跑赢沪深300 +1.2%</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-700/50 rounded-lg p-0.5">
              {['本月', '今年', '近半年', '近两年'].map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${period === p ? 'bg-blue-600 text-white' : 'text-secondary hover:text-white'}`}>{p}</button>
              ))}
            </div>
            <button onClick={() => setShowProfitDetail(true)} className="text-xs text-blue-400 hover:text-blue-300">查看详情</button>
          </div>
        </div>
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={compareChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
              <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} />
              <YAxis tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10, color: '#E8EBF0' }} formatter={(v: number) => [`${v.toFixed(2)}%`, '']} />
              <Area type="monotone" dataKey="account" stroke="#FF4D4F" fill="rgba(255,77,79,0.1)" strokeWidth={2} dot={false} name="我的账户" />
              <Area type="monotone" dataKey="benchmark" stroke="#4096FF" fill="rgba(64,150,255,0.08)" strokeWidth={2} dot={false} name="沪深300" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 转账弹窗 */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowTransfer(false)}>
            <div className="bg-[#1A1D23] border border-[#2C303A] rounded-xl w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
                <span className="text-white text-sm font-semibold">资金划转</span>
                <button onClick={() => setShowTransfer(false)} className="text-secondary hover:text-white"><X size={16} /></button>
              </div>
              <div className="flex border-b border-gray-700">
                {(['in', 'out'] as const).map((t) => (
                  <button key={t} onClick={() => setTransferType(t)}
                    className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                      transferType === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-secondary hover:text-white'
                    }`}>{t === 'in' ? '银证转入' : '银证转出'}</button>
                ))}
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-secondary mb-1.5 block">
                    {transferType === 'in' ? '转入金额' : '转出金额'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">¥</span>
                    <input value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="请输入金额" type="number"
                      className="w-full pl-7 pr-3 py-2.5 text-sm rounded-lg bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono" />
                  </div>
                </div>
                <div className="bg-[#242730] rounded-lg p-3 text-xs text-secondary">
                  <div className="flex justify-between"><span>可用资金</span><span className="text-neutral font-mono">{fmtCurrency(account.cash)}</span></div>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                  确认{transferType === 'in' ? '转入' : '转出'}
                </button>
              </div>
            </div>
          </div>
      )}

      {/* 账户管理弹窗 */}
      {showAccountManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAccountManage(false)}>
          <div className="bg-[#1A1D23] border border-[#2C303A] rounded-xl w-[540px] max-w-[calc(100vw-32px)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
              <div>
                <span className="text-white text-sm font-semibold">账户管理</span>
                <span className="ml-2 text-xs text-secondary">新增或删除历史账户</span>
              </div>
              <button onClick={() => setShowAccountManage(false)} className="text-secondary hover:text-white"><X size={16} /></button>
            </div>

            <div className="p-5">
              <button
                onClick={() => setShowAddAccount(true)}
                className="mb-4 flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} /> 新增账户
              </button>

              <div className="space-y-2 max-h-[360px] overflow-auto scrollbar-thin">
                {accountList.map((item) => {
                  const isLastAccount = accountList.length <= 1;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-[#12151A] px-3 py-3">
                      <div>
                        <div className="text-sm text-neutral font-medium">{item.label}</div>
                        <div className="mt-1 text-xs text-secondary font-mono">{item.platform} · {item.accountId}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(item.id)}
                        disabled={isLastAccount}
                        className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs transition-colors ${isLastAccount ? 'cursor-not-allowed text-gray-600 bg-gray-800/50' : 'text-red-300 hover:text-white hover:bg-red-500/20'}`}
                        title={isLastAccount ? '至少保留一个账户' : '删除账户'}
                      >
                        <Trash2 size={13} /> 删除
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加账户弹窗 */}
      {showAddAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closeAddAccountModal}>
          <div className="bg-[#1A1D23] border border-[#2C303A] rounded-xl w-[460px] max-w-[calc(100vw-32px)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
              <div>
                <span className="text-white text-sm font-semibold">添加证券账户</span>
                <span className="ml-2 text-xs text-secondary">Demo 绑定</span>
              </div>
              <button onClick={closeAddAccountModal} className="text-secondary hover:text-white"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-300">
                当前为演示模式，不连接真实券商，不保存交易密码。验证码输入任意内容即可完成绑定。
              </div>

              <div>
                <label className="text-xs text-secondary mb-1.5 block">券商平台</label>
                <select
                  value={addAccountPlatform}
                  onChange={(e) => setAddAccountPlatform(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg bg-[#12151A] border border-gray-600 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="涨乐通">涨乐通</option>
                  <option value="东方财富">东方财富</option>
                  <option value="同花顺">同花顺</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-secondary mb-1.5 block">资金账号</label>
                <input
                  value={addAccountNo}
                  onChange={(e) => setAddAccountNo(e.target.value)}
                  placeholder="请输入资金账号，可用任意 demo 账号"
                  className="w-full px-3 py-2.5 text-sm rounded-lg bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-secondary mb-1.5 block">手机号</label>
                <input
                  value={addAccountPhone}
                  onChange={(e) => setAddAccountPhone(e.target.value)}
                  placeholder="可选，用于模拟短信验证"
                  className="w-full px-3 py-2.5 text-sm rounded-lg bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-secondary mb-1.5 block">验证码</label>
                <div className="flex gap-2">
                  <input
                    value={addAccountCode}
                    onChange={(e) => setAddAccountCode(e.target.value)}
                    placeholder="输入任意验证码"
                    className="flex-1 px-3 py-2.5 text-sm rounded-lg bg-[#12151A] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button onClick={handleSendBindCode} className="px-3 rounded-lg bg-white/10 text-xs text-neutral hover:bg-white/20 transition-colors">
                    发送验证码
                  </button>
                </div>
              </div>

              {addAccountMessage && (
                <div className="text-xs text-blue-300">{addAccountMessage}</div>
              )}

              <button onClick={handleBindAccount} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                确认绑定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 账单弹窗 */}
      {showBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowBill(false)}>
          <div className="bg-[#1A1D23] border border-[#2C303A] rounded-xl w-[680px] max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
              <span className="text-white text-sm font-semibold">账单明细</span>
              <button onClick={() => setShowBill(false)} className="text-secondary hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-1 px-5 py-2.5 border-b border-gray-700/50 flex-shrink-0">
              {['今日', '昨日', '本月', '今年', '近一年'].map((p) => (
                <button key={p} onClick={() => setBillPeriod(p)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${billPeriod === p ? 'bg-blue-600 text-white' : 'text-secondary hover:text-white'}`}>{p}</button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2 px-5 py-3 border-b border-gray-700/50 flex-shrink-0">
              {Object.entries(account.billSummary).map(([label, val]) => (
                <div key={label} className="bg-[#242730] rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-secondary mb-1">{label}</div>
                  <div className="text-sm text-neutral font-mono font-semibold">{val}</div>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-[#1A1D23] z-10">
                  <tr className="text-secondary border-b border-gray-700/50">
                    <th className="py-2 px-3 text-left font-normal">时间</th>
                    <th className="py-2 px-3 text-left font-normal">标的名称</th>
                    <th className="py-2 px-3 text-right font-normal">确认净值</th>
                    <th className="py-2 px-3 text-right font-normal">发生金额</th>
                    <th className="py-2 px-3 text-right font-normal">确认份额</th>
                    <th className="py-2 px-3 text-right font-normal">交易费用</th>
                    <th className="py-2 px-3 text-left font-normal">方向</th>
                  </tr>
                </thead>
                <tbody>
                  {account.billRecords.map((r, i) => (
                    <tr key={i} className={`border-b border-gray-800 ${i % 2 === 0 ? 'bg-primary-bg' : 'bg-primary-chart'}`}>
                      <td className="py-2 px-3 text-secondary font-mono">{r.time}</td>
                      <td className="py-2 px-3 text-neutral">{r.name}</td>
                      <td className="py-2 px-3 text-neutral font-mono text-right">{r.price}</td>
                      <td className={`py-2 px-3 font-mono text-right ${r.amount.startsWith('+') ? 'text-up' : 'text-down'}`}>{r.amount}</td>
                      <td className="py-2 px-3 text-neutral font-mono text-right">{r.qty}</td>
                      <td className="py-2 px-3 text-secondary font-mono text-right">{r.fee}</td>
                      <td className={`py-2 px-3 font-semibold ${r.dir === '买入' ? 'text-up' : 'text-down'}`}>{r.dir}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 收益详情弹窗 */}
      {showProfitDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowProfitDetail(false)}>
          <div className="bg-[#1A1D23] border border-[#2C303A] rounded-xl w-[860px] max-h-[88vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
              <div>
                <span className="text-white text-sm font-semibold">收益详情</span>
                <span className="ml-2 text-xs text-secondary">{account.label} · {formatProfitDate(profitStartDate)} - {formatProfitDate(profitEndDate)}</span>
              </div>
              <button onClick={() => setShowProfitDetail(false)} className="text-secondary hover:text-white"><X size={16} /></button>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-700/50 flex-shrink-0">
              <span className="text-xs text-secondary">选择收益查询区间</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  min={toProfitInputDate(compareChartData[0].date)}
                  max={profitEndDate}
                  value={profitStartDate}
                  onChange={(e) => setProfitStartDate(e.target.value)}
                  className="h-8 rounded bg-[#12151A] border border-gray-600 px-2 text-xs text-neutral outline-none focus:border-blue-500"
                />
                <span className="text-secondary text-xs">至</span>
                <input
                  type="date"
                  min={profitStartDate}
                  max={toProfitInputDate(compareChartData[compareChartData.length - 1].date)}
                  value={profitEndDate}
                  onChange={(e) => setProfitEndDate(e.target.value)}
                  className="h-8 rounded bg-[#12151A] border border-gray-600 px-2 text-xs text-neutral outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b border-gray-700/50 flex-shrink-0">
              {[
                { label: '区间收益', value: `${profitRangeSign}${fmtCurrency(profitRangeAmount)}`, pct: `${profitRangePct >= 0 ? '+' : ''}${profitRangePct.toFixed(2)}%`, up: profitRangeAmount >= 0 },
                { label: '跑赢基准', value: `${(profitRangePct - benchmarkRangePct >= 0 ? '+' : '')}${(profitRangePct - benchmarkRangePct).toFixed(2)}%`, pct: '相对沪深300', up: profitRangePct >= benchmarkRangePct },
                { label: '最大回撤', value: `${maxDrawdown.toFixed(2)}%`, pct: '区间低点', up: maxDrawdown >= 0 },
                { label: '昨日收益', value: `${account.yesterdayProfit >= 0 ? '+' : ''}${fmtCurrency(account.yesterdayProfit)}`, pct: `${account.yesterdayProfit >= 0 ? '+' : ''}${account.yesterdayProfitPct.toFixed(2)}%`, up: account.yesterdayProfit >= 0 },
              ].map((item) => (
                <div key={item.label} className="bg-[#242730] rounded-lg p-3">
                  <div className="text-[10px] text-secondary mb-1">{item.label}</div>
                  <div className={`text-lg font-bold font-mono ${item.up ? 'text-up' : 'text-down'}`}>{item.value}</div>
                  <div className="text-[10px] text-secondary mt-1">{item.pct}</div>
                </div>
              ))}
            </div>

            <div className="h-56 px-5 py-4 border-b border-gray-700/50 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitRangeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
                  <XAxis dataKey="date" tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} />
                  <YAxis tick={{ fill: '#8C8F98', fontSize: 10 }} axisLine={{ stroke: '#2a2f3a' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E2230', border: '1px solid #3a3f4b', fontSize: 10, color: '#E8EBF0' }} formatter={(v: number) => [`${v.toFixed(2)}%`, '']} />
                  <Area type="monotone" dataKey="account" stroke="#FF4D4F" fill="rgba(255,77,79,0.12)" strokeWidth={2} dot={false} name="账户收益" />
                  <Area type="monotone" dataKey="benchmark" stroke="#4096FF" fill="rgba(64,150,255,0.08)" strokeWidth={2} dot={false} name="沪深300" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-[#1A1D23] z-10">
                  <tr className="text-secondary border-b border-gray-700/50">
                    <th className="py-2 px-4 text-left font-normal">日期</th>
                    <th className="py-2 px-4 text-right font-normal">当日收益</th>
                    <th className="py-2 px-4 text-right font-normal">累计收益</th>
                    <th className="py-2 px-4 text-right font-normal">累计收益率</th>
                    <th className="py-2 px-4 text-right font-normal">基准收益率</th>
                    <th className="py-2 px-4 text-right font-normal">超额收益</th>
                  </tr>
                </thead>
                <tbody>
                  {profitDetailRows.map((row, index) => (
                    <tr key={row.date} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-primary-bg' : 'bg-primary-chart'}`}>
                      <td className="py-2 px-4 text-secondary font-mono">{row.date}</td>
                      <td className={`py-2 px-4 font-mono text-right ${row.dailyPct >= 0 ? 'text-up' : 'text-down'}`}>{row.dailyPct >= 0 ? '+' : ''}{row.dailyPct.toFixed(2)}%</td>
                      <td className={`py-2 px-4 font-mono text-right ${row.profitAmount >= 0 ? 'text-up' : 'text-down'}`}>{row.profitAmount >= 0 ? '+' : ''}{fmtCurrency(row.profitAmount)}</td>
                      <td className={`py-2 px-4 font-mono text-right ${row.cumulativePct >= 0 ? 'text-up' : 'text-down'}`}>{row.cumulativePct >= 0 ? '+' : ''}{row.cumulativePct.toFixed(2)}%</td>
                      <td className={`py-2 px-4 font-mono text-right ${row.benchmarkDailyPct >= 0 ? 'text-up' : 'text-down'}`}>{row.benchmarkPct >= 0 ? '+' : ''}{row.benchmarkPct.toFixed(2)}%</td>
                      <td className={`py-2 px-4 font-mono text-right ${row.excessPct >= 0 ? 'text-up' : 'text-down'}`}>{row.excessPct >= 0 ? '+' : ''}{row.excessPct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {profitDetailRows.length === 0 && (
                <div className="py-10 text-center text-xs text-secondary">当前时间区间暂无收益数据</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
