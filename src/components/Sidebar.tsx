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
  Sparkles
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
    confirmAction
  } = useBiomate();

  const [mobileOpen, setMobileOpen] = useState(false);

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
            {darkMode ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
            <span>Tema: {darkMode ? 'Claro' : 'Escuro'}</span>
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

        {/* Restart accounts database */}
        <button
          onClick={handleReset}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-400/80 hover:bg-white/5 hover:text-red-400 transition-all uppercase"
          id="btn-reset-data"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>

        <div className="pt-2 text-[9px] text-center text-emerald-100/25 tracking-wider">
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
