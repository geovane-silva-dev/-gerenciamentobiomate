import React, { useState } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { SidebarTab } from '../types';
import {
  LayoutDashboard,
  BarChart3,
  Boxes,
  ShoppingCart,
  Receipt,
  Factory,
  Tags,
  Leaf,
  Eye,
  EyeOff,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  Cloud,
  Database,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    hideValues,
    setHideValues,
    darkMode,
    setDarkMode,
    resetDatabase,
    confirmAction,
    isAuthenticated,
    currentUser,
    signInWithGoogle,
    logout,
    isCloudReady,
    authLoading,
    authError
  } = useBiomate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const menuItems: { tab: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'painel', label: 'Painel', icon: <LayoutDashboard className="w-5 h-5" /> },
    { tab: 'relatorios', label: 'Relatórios', icon: <BarChart3 className="w-5 h-5" /> },
    { tab: 'estoque', label: 'Estoque', icon: <Boxes className="w-5 h-5" /> },
    { tab: 'vendas', label: 'Vendas', icon: <ShoppingCart className="w-5 h-5" /> },
    { tab: 'despesas', label: 'Despesas', icon: <Receipt className="w-5 h-5" /> },
    { tab: 'producao', label: 'Produção', icon: <Factory className="w-5 h-5" /> },
    { tab: 'producao_inteligente', label: 'Produção Inteligente', icon: <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" /> },
    { tab: 'categorias', label: 'Categorias', icon: <Tags className="w-5 h-5" /> },
    { tab: 'produtos', label: 'Produtos', icon: <Leaf className="w-5 h-5" /> },
  ];

  const handleTabClick = (tab: SidebarTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const handleReset = () => {
    confirmAction({
      title: 'Restaurar Banco de Dados',
      message: 'Deseja realmente reiniciar o banco de dados do BIOMATE para as configurações padrões? Todas as alterações serão perdidas de forma irreversível.',
      confirmText: 'Confirmar e Sair',
      isDanger: true,
      onConfirm: () => {
        resetDatabase();
      }
    });
  };

  const currentYear = new Date().getFullYear();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#062F24] text-white overflow-y-auto">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-emerald-900/50">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
            BIOMATE
          </h1>
        </div>
      </div>

      {/* Navigation menu */}
      <div className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map(item => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              id={`nav-tab-${item.tab}`}
              onClick={() => handleTabClick(item.tab)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 relative text-sm ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium'
                  : 'text-emerald-100/60 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={`transition-transform duration-300 ${isActive ? 'scale-110 text-emerald-400' : 'text-emerald-100/60'}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Global Actions footer */}
      <div className="p-4 border-t border-emerald-950 bg-[#04241b] space-y-1">
        {/* Toggle Theme inline */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[#8A9F9A] hover:text-white hover:bg-white/5 transition-all"
        >
          <span className="flex items-center gap-3">
            {darkMode ? <Moon className="w-4 h-4 text-emerald-450" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span>Tema: {darkMode ? 'Escuro' : 'Claro'}</span>
          </span>
          <div className="w-8 h-4 bg-emerald-900/40 rounded-full p-0.5 transition-colors">
            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Hide Values */}
        <button
          onClick={() => setHideValues(!hideValues)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-emerald-100/60 hover:bg-white/5 hover:text-white transition-all uppercase"
          id="btn-hide-values"
        >
          {hideValues ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
          <span>Ocultar Valores</span>
        </button>

        {/* Redefinir Banco de Dados */}
        <button
          onClick={handleReset}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-400/80 hover:bg-white/5 hover:text-red-400 transition-all uppercase"
          id="btn-reset-data"
        >
          <Trash2 className="w-4 h-4" />
          <span>Redefinir Dados</span>
        </button>

        {/* Cloud Status / Authentication Section */}
        {(!currentUser || currentUser.isAnonymous) ? (
          <div className="mt-4 p-3 bg-emerald-900/35 rounded-xl border border-emerald-500/20 shadow-lg">
            {isInIframe ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] text-amber-300 font-semibold tracking-wider uppercase">Bloqueio de IFrame</span>
                </div>
                <p className="text-[10px] text-emerald-100/70 mb-3 leading-relaxed">
                  O painel do AI Studio impede pop-ups de login. Abra o BIOMATE em uma aba independente para poder conectar sua conta!
                </p>
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full flex items-center justify-center gap-2 px-2.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md active:scale-[0.98] mb-2.5 cursor-pointer"
                  id="btn-open-new-tab"
                >
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span>Abrir App em Nova Aba ↗</span>
                </button>
                <div className="border-t border-emerald-950/50 my-2 pt-2">
                  <p className="text-[9px] text-emerald-100/45 text-center leading-normal mb-2">
                    Se já estiver em uma aba separada, tente usar o botão abaixo:
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] text-amber-300 font-semibold tracking-wider uppercase">Modo Local (Offline)</span>
                </div>
                <p className="text-[10px] text-emerald-100/50 mb-2.5 leading-relaxed">
                  Conserve e sincronize seus dados na nuvem para acessá-los em múltiplos aparelhos em tempo real.
                </p>
              </>
            )}

            {authError && (
              <div className="my-2 p-2 bg-rose-955/35 border border-rose-500/30 rounded-lg text-[9px] text-rose-205 leading-relaxed whitespace-pre-line animate-fade-in text-center">
                {authError}
              </div>
            )}

            <button
              onClick={() => signInWithGoogle()}
              disabled={authLoading}
              className={`w-full flex items-center justify-center gap-2 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-[11px] transition-all shadow-md active:scale-[0.98] cursor-pointer ${authLoading ? 'opacity-70 cursor-wait' : ''}`}
              id="btn-google-signin"
            >
              {authLoading ? (
                <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.03-1.16-.16-1.68-.45l3.49-2.18z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>{authLoading ? 'Sincronizando...' : 'Sincronizar com Google'}</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-emerald-900/40 rounded-xl border border-emerald-500/20 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Sincronizado</span>
              </div>
              <button
                onClick={() => logout()}
                disabled={authLoading}
                className="text-[10px] text-red-300 hover:text-red-200 transition-colors underline font-medium cursor-pointer disabled:opacity-55"
                id="btn-logout-google"
              >
                {authLoading ? 'Saindo...' : 'Sair'}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  referrerPolicy="no-referrer"
                  alt="Profile"
                  className="w-7 h-7 rounded-full border border-emerald-500/30 object-cover"
                />
              ) : (
                <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center font-bold text-xs text-white uppercase shadow-md shrink-0">
                  {currentUser.displayName ? currentUser.displayName[0] : (currentUser.email ? currentUser.email[0] : 'U')}
                </div>
              )}
              <div className="overflow-hidden animate-fade-in">
                <p className="text-[10px] font-semibold text-white truncate max-w-[140px]">
                  {currentUser.displayName || 'Usuário BIOMATE'}
                </p>
                <p className="text-[9px] text-emerald-100/40 truncate max-w-[140px]">
                  {currentUser.email || 'Conta vinculada'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 text-[9px] text-center text-emerald-100/25 tracking-wider font-mono">
          BIOMATE ERP • PÁGINA PREMIUM
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#022A1E] text-white border-b border-[#053d2c] z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00C984] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#022A1E]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
            </svg>
          </div>
          <span className="font-extrabold text-lg tracking-wider">BIOMATE</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 rounded bg-[#033c2b] text-white">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar drawer */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 z-20 shrink-0 select-none shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="md:hidden fixed inset-y-0 left-0 w-64 z-40 shadow-2xl"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside Overlay for Mobile drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}
    </>
  );
}
