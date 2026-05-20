import React from 'react';
import { BiomateProvider, useBiomate } from './context/BiomateContext';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ReportsView from './components/ReportsView';
import InventoryView from './components/InventoryView';
import SalesView from './components/SalesView';
import ExpensesView from './components/ExpensesView';
import ProductionView from './components/ProductionView';
import SmartProductionView from './components/SmartProductionView';
import CategoriesView from './components/CategoriesView';
import ProductsView from './components/ProductsView';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

function AppContent() {
  const { activeTab, darkMode, confirmConfig, closeConfirm } = useBiomate();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'painel':
        return <DashboardView />;
      case 'relatorios':
        return <ReportsView />;
      case 'estoque':
        return <InventoryView />;
      case 'vendas':
        return <SalesView />;
      case 'despesas':
        return <ExpensesView />;
      case 'producao':
        return <ProductionView />;
      case 'producao_inteligente':
        return <SmartProductionView />;
      case 'categorias':
        return <CategoriesView />;
      case 'produtos':
        return <ProductsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F3F6F5] dark:bg-[#081814] text-slate-800 dark:text-emerald-50 transition-colors duration-350">
      {/* Premium BIOMATE Navigation Sidebar */}
      <Sidebar />

      {/* Main Container Viewport for Views */}
      <main className="flex-1 w-full overflow-y-auto h-screen flex flex-col pt-0 pb-12 px-4 sm:px-6 lg:px-8 space-y-4 md:p-6 select-text">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="w-full max-w-7xl mx-auto py-4"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#122c24] rounded-2xl max-w-md w-full border border-emerald-900/10 dark:border-emerald-800/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full shrink-0 ${
                    confirmConfig.isDanger
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-emerald-50">
                      {confirmConfig.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-emerald-300/80 leading-relaxed whitespace-pre-line">
                      {confirmConfig.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-emerald-950">
                  <button
                    type="button"
                    onClick={closeConfirm}
                    className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-emerald-355 hover:bg-slate-50 dark:hover:bg-emerald-950 rounded-xl transition-colors cursor-pointer"
                  >
                    {confirmConfig.cancelText || 'Cancelar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmConfig.onConfirm();
                      closeConfirm();
                    }}
                    className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors cursor-pointer ${
                      confirmConfig.isDanger
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10'
                    }`}
                  >
                    {confirmConfig.confirmText || 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <BiomateProvider>
      <AppContent />
    </BiomateProvider>
  );
}
