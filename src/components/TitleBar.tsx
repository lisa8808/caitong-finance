import { useState, ReactNode } from 'react';
import { UserCircle, LogOut, X } from 'lucide-react';
import { AuthUser, getAuthUsers, getCurrentUser, saveAuthUsers, saveCurrentUser } from '../services/authStorage';

interface Props {
  rightContent?: ReactNode;
}

export default function TitleBar({ rightContent }: Props) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(() => !getCurrentUser());
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [nickname, setNickname] = useState('');
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const resetAuthForms = () => {
    setNickname('');
    setLoginAccount('');
    setLoginPassword('');
    setConfirmPassword('');
    setAuthMessage('');
  };

  const openLoginModal = () => {
    resetAuthForms();
    setAuthMode('login');
    setShowLoginModal(true);
    setShowUserMenu(false);
  };

  const closeAuthModal = (force = false) => {
    if (!force && !currentUser) return;
    setShowLoginModal(false);
    resetAuthForms();
  };

  const handleLogin = () => {
    const account = loginAccount.trim();
    const password = loginPassword.trim();

    if (!account || !password) {
      setAuthMessage('请输入账号和密码');
      return;
    }

    const user = getAuthUsers().find((item) => item.account === account && item.password === password);
    if (!user) {
      setAuthMessage('账号或密码错误');
      return;
    }

    setCurrentUser(user);
    saveCurrentUser(user);
    closeAuthModal(true);
  };

  const switchAuthMode = (mode: 'login' | 'register') => {
    resetAuthForms();
    setAuthMode(mode);
  };

  const handleRegister = () => {
    const displayName = nickname.trim();
    const account = loginAccount.trim();
    const password = loginPassword.trim();

    if (!displayName || !account || !password || !confirmPassword) {
      setAuthMessage('请完整填写注册信息');
      return;
    }
    if (password.length < 6) {
      setAuthMessage('密码至少需要 6 位');
      return;
    }
    if (password !== confirmPassword) {
      setAuthMessage('两次输入的密码不一致');
      return;
    }
    const users = getAuthUsers();
    if (users.some((item) => item.account.toLowerCase() === account.toLowerCase())) {
      setAuthMessage('该账号已注册，请直接登录');
      return;
    }

    const user: AuthUser = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `user-${Date.now()}`,
      nickname: displayName,
      account,
      password,
      level: '免费版',
      createdAt: new Date().toISOString(),
    };
    saveAuthUsers([...users, user]);
    saveCurrentUser(user);
    setCurrentUser(user);
    closeAuthModal(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveCurrentUser(null);
    setShowUserMenu(false);
    resetAuthForms();
    setAuthMode('login');
    setShowLoginModal(true);
  };

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
          onClick={() => currentUser ? setShowUserMenu(!showUserMenu) : openLoginModal()}
          className="flex max-w-40 items-center gap-1.5 rounded px-1.5 py-1 text-secondary transition-colors hover:bg-gray-700/50 hover:text-white"
          aria-label={currentUser ? `当前用户：${currentUser.nickname}` : '登录'}
          title={currentUser ? `${currentUser.nickname}（${currentUser.account}）` : '登录'}
        >
          <UserCircle size={18} />
          <span className="truncate text-xs">{currentUser?.nickname || '登录'}</span>
        </button>

        {currentUser && showUserMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 z-40 w-52 bg-[#1A1D23] border border-[#2C303A] rounded-lg shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
                    <UserCircle size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{currentUser.nickname}</div>
                    <div className="text-secondary text-xs">{currentUser.account}</div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">会员等级</span>
                  <span className="text-xs font-semibold text-yellow-400">{currentUser.level}</span>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-700/50">
                <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-secondary hover:text-red-400 transition-colors">
                  <LogOut size={12} /> 退出登录
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-[360px] rounded-xl border border-[#2C303A] bg-[#1A1D23] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-700/50 px-5 py-4">
              <div>
                <div className="text-base font-semibold text-white">{authMode === 'login' ? '登录财瞳金融' : '注册财瞳金融'}</div>
                <div className="mt-1 text-xs text-secondary">
                  {authMode === 'login' ? '请输入账号和密码继续使用' : '创建免费账号，注册后自动登录'}
                </div>
              </div>
              {currentUser && (
                <button onClick={() => closeAuthModal()} aria-label="关闭登录窗口" className="text-secondary hover:text-white">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="space-y-3 px-5 py-4">
              {authMode === 'register' && (
                <label className="block">
                  <span className="text-xs text-secondary">昵称</span>
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-primary-bg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="请输入昵称"
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs text-secondary">账号</span>
                <input
                  value={loginAccount}
                  onChange={(event) => setLoginAccount(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-primary-bg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  placeholder="请输入登录账号"
                  autoComplete="username"
                />
              </label>
              <label className="block">
                <span className="text-xs text-secondary">密码</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-primary-bg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  placeholder="请输入密码"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>
              {authMode === 'register' && (
                <label className="block">
                  <span className="text-xs text-secondary">确认密码</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-primary-bg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="请再次输入密码"
                    autoComplete="new-password"
                  />
                </label>
              )}
              {authMessage && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{authMessage}</div>}
            </div>

            <div className="border-t border-gray-700/50 px-5 py-4">
              <button
                onClick={authMode === 'login' ? handleLogin : handleRegister}
                className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {authMode === 'login' ? '登录' : '立即注册'}
              </button>
              <button
                onClick={() => switchAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="mt-2 w-full rounded-lg border border-gray-600 py-2 text-sm font-medium text-secondary transition-colors hover:border-blue-500 hover:text-white"
              >
                {authMode === 'login' ? '注册账号' : '返回登录'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
