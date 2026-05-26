import React, { useMemo } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { formatBRL, getUniqueClients } from '../utils';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  ArrowDownRight,
  User,
  AlertTriangle,
  Info,
  Bell,
  Trash2,
  Plus,
  Pin,
  CheckCircle2,
  AlertOctagon,
  FileQuestion
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function DashboardView() {
  const {
    sales,
    products,
    expenses,
    productionBatches,
    recipes,
    hideValues,
    showProductionCostToggle,
    setShowProductionCostToggle,
    showFixedExpensesToggle,
    setShowFixedExpensesToggle,
    clientFilter,
    setClientFilter
  } = useBiomate();

  // Custom Announcements/Mural state
  const [customAnnouncements, setCustomAnnouncements] = React.useState<{
    id: string;
    text: string;
    date: string;
    priority: 'info' | 'warning' | 'error';
  }[]>(() => {
    const saved = localStorage.getItem('biomate_custom_announcements');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'seed-1',
        text: 'Aferição periódica dos termômetros das geladeiras programada para sexta-feira.',
        date: new Date().toLocaleDateString('pt-BR'),
        priority: 'info' as const
      },
      {
        id: 'seed-2',
        text: 'Lote de Kombucha Alquimia Verde necessita de revisão do pH antes do envase final.',
        date: new Date().toLocaleDateString('pt-BR'),
        priority: 'warning' as const
      }
    ];
  });

  const [newAnnounceText, setNewAnnounceText] = React.useState('');
  const [newAnnouncePriority, setNewAnnouncePriority] = React.useState<'info' | 'warning' | 'error'>('info');

  React.useEffect(() => {
    localStorage.setItem('biomate_custom_announcements', JSON.stringify(customAnnouncements));
  }, [customAnnouncements]);

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnounceText.trim()) return;
    const item = {
      id: 'custom-' + Date.now(),
      text: newAnnounceText.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
      priority: newAnnouncePriority
    };
    setCustomAnnouncements(prev => [item, ...prev]);
    setNewAnnounceText('');
  };

  const handleDeleteAnnouncement = (id: string) => {
    setCustomAnnouncements(prev => prev.filter(item => item.id !== id));
  };

  // All unique clients list
  const clientList = useMemo(() => {
    return getUniqueClients(sales);
  }, [sales]);

  // Filter sales based on selected client filter
  const filteredSales = useMemo(() => {
    if (clientFilter === 'all') return sales;
    return sales.filter(s => s.customerName === clientFilter);
  }, [sales, clientFilter]);

  // Dynamic Finance Calculations
  const metrics = useMemo(() => {
    // 1. Receita Bruta (total amount sold in selected filter)
    const revenue = filteredSales.reduce((acc, sale) => acc + sale.totalAmount, 0);

    // 2. Custo Produção (associated to product sold, usually total sold * unit cost price)
    const rawProdCost = filteredSales.reduce((acc, sale) => {
      const prod = products.find(p => p.id === sale.productId);
      return acc + (prod ? prod.costPrice * sale.quantity : sale.productionCost);
    }, 0);
    const productionCostValue = showProductionCostToggle ? rawProdCost : 0;

    // 3. Despesas Fixas (sum of all administrative/fixed expenses)
    const fixedExpSum = expenses
      .filter(exp => exp.type === 'fixo')
      .reduce((acc, exp) => acc + exp.amount, 0);
    const fixedExpensesValue = showFixedExpensesToggle ? fixedExpSum : 0;

    // 4. Lucro Operacional: Revenue - Production Cost (if on) - Fixed Expenses (if on)
    const netProfit = revenue - productionCostValue - fixedExpensesValue;

    return {
      revenue,
      productionCostValue,
      rawProdCost,
      fixedExpensesValue,
      fixedExpSum,
      netProfit
    };
  }, [filteredSales, products, expenses, showProductionCostToggle, showFixedExpensesToggle]);

  // Out of stock items (Stock exactly 0)
  const outOfStockProducts = useMemo(() => {
    return products.filter(p => p.stock === 0);
  }, [products]);

  // Low stock alert products calculation (Stock below target but > 0)
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  }, [products]);

  // Products with no configured recipe/formula (important alert)
  const productsWithoutRecipe = useMemo(() => {
    return products.filter(p => {
      const isFinalOrAmbos = !p.productType || p.productType === 'Produto Final' || p.productType === 'Ambos';
      if (!isFinalOrAmbos) return false;
      const hasRecipe = recipes.some(r => r.productId === p.id);
      return !hasRecipe;
    });
  }, [products, recipes]);

  // Recharts Chart Data Generation (Grouping by date in a sequential line)
  const chartData = useMemo(() => {
    // Collect unique recent days
    const days: { [date: string]: { revenue: number, cost: number, expenses: number } } = {};
    
    // Group from past sales
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(day => {
      days[day] = { revenue: 0, cost: 0, expenses: 0 };
    });

    sales.forEach(s => {
      const sDay = s.date.split('T')[0];
      if (days[sDay] !== undefined) {
        // filter or respect selection as required
        if (clientFilter === 'all' || s.customerName === clientFilter) {
          days[sDay].revenue += s.totalAmount;
          days[sDay].cost += s.productionCost;
        }
      }
    });

    expenses.forEach(e => {
      const eDay = e.date;
      if (days[eDay] !== undefined) {
        if (e.type === 'fixo' && !showFixedExpensesToggle) return;
        days[eDay].expenses += e.amount;
      }
    });

    return Object.keys(days).map(day => {
      const parts = day.split('-');
      const formattedDate = `${parts[2]}/${parts[1]}`;
      return {
        name: formattedDate,
        'Receita Bruta': days[day].revenue,
        'Custo Produção': showProductionCostToggle ? days[day].cost : 0,
        'Despesas': showFixedExpensesToggle ? days[day].expenses : 0,
      };
    });
  }, [sales, expenses, clientFilter, showProductionCostToggle, showFixedExpensesToggle]);

  return (
    <div className="space-y-8 p-1 sm:p-2">
      {/* Top Welcome bar with user profile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#122923] p-4 rounded-xl border border-emerald-900/5 dark:border-emerald-800/20 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-50">Painel de Controle</h2>
          <p className="text-xs text-gray-500 dark:text-emerald-400">Bem-vindo de volta ao centro operacional do BIOMATE.</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="block text-sm font-bold text-gray-800 dark:text-white">Usuário Operacional</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-[#00C984]">Acesso Master ERP</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#E5FAF2] dark:bg-[#00c984]/15 text-[#008F5D] dark:text-[#00C984] flex items-center justify-center font-bold border border-[#00c984]/10">
            BM
          </div>
        </div>
      </div>

      {/* BIOMATE Banner layout section from original image mockup */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-4">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-[#022A1E] dark:text-[#00C984] font-sans">
            BIOMATE
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-emerald-800/80 dark:text-emerald-400/80 tracking-[0.35em] uppercase mt-1">
            ANÁLISE DE PERFORMANCE OPERACIONAL
          </p>
        </div>

        {/* Toggle sliders matching visual alignment exactly */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Custo Produção Button with switch */}
          <div className="bg-[#59391D] text-white py-2.5 px-4 rounded-2xl flex items-center gap-3 shadow-md border border-[#59391D] select-none hover:brightness-105 transition-all">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-amber-200" />
            </div>
            <div className="text-left">
              <span className="block text-[8px] font-bold text-white/75 tracking-wider uppercase">CUSTO PRODUÇÃO</span>
              <span className="text-xs font-semibold flex items-center gap-2">
                {showProductionCostToggle ? 'ON' : 'OFF'}
                <button
                  onClick={() => setShowProductionCostToggle(!showProductionCostToggle)}
                  className="w-10 h-5 bg-white/20 dark:bg-black/30 rounded-full p-0.5 relative transition-colors focus:outline-none"
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${showProductionCostToggle ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </span>
            </div>
          </div>

          {/* Despesas Fixas capsule button with toggle */}
          <div className="bg-[#6B1832] text-white py-2.5 px-4 rounded-2xl flex items-center gap-3 shadow-md border border-[#6B1832] select-none hover:brightness-105 transition-all">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <ArrowDownRight className="w-4.5 h-4.5 text-rose-300" />
            </div>
            <div className="text-left">
              <span className="block text-[8px] font-bold text-white/75 tracking-wider uppercase">DESPESAS FIXAS</span>
              <span className="text-xs font-semibold flex items-center gap-2">
                {showFixedExpensesToggle ? 'ON' : 'OFF'}
                <button
                  onClick={() => setShowFixedExpensesToggle(!showFixedExpensesToggle)}
                  className="w-10 h-5 bg-white/20 dark:bg-black/30 rounded-full p-0.5 relative transition-colors focus:outline-none"
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${showFixedExpensesToggle ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </span>
            </div>
          </div>

          {/* Filter Vendas drop select capsule */}
          <div className="bg-white dark:bg-[#122923] text-gray-700 dark:text-emerald-100 py-2 px-4 rounded-2xl flex items-center gap-3 shadow-sm border border-emerald-900/5 dark:border-emerald-800/10 hover:shadow-md transition-all">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600 dark:text-[#00C984]" />
            </div>
            <div className="text-left">
              <span className="block text-[8px] font-bold text-gray-400 dark:text-emerald-400/60 tracking-wider">FILTRAR VENDAS</span>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="text-xs font-bold text-gray-800 dark:text-emerald-50 bg-transparent py-0.5 border-none focus:ring-0 cursor-pointer uppercase pr-6 select-clean"
              >
                <option value="all">TODOS OS CLIENTES</option>
                {clientList.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 4-Card layout matching mockup shape */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Receita Bruta */}
        <div className="bg-white dark:bg-[#122c24] p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all border border-emerald-900/5 dark:border-emerald-800/10 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-[#ECF3FF] dark:bg-[#ECF3FF]/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-300">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-emerald-400/50 tracking-widest uppercase">RECEITA BRUTA</span>
          <span className="text-[9px] text-[#00a86b] dark:text-[#00C984] font-bold mt-0.5">TOTAL VENDIDO</span>
          <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-3 font-sans">
            {formatBRL(metrics.revenue, hideValues)}
          </h3>
        </div>

        {/* Lucro Operacional */}
        <div className="bg-white dark:bg-[#122c24] p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all border border-emerald-900/5 dark:border-emerald-800/10 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F9F2] dark:bg-[#E6F9F2]/10 text-[#00C984] flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-300">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-emerald-400/50 tracking-widest uppercase">LUCRO OPERACIONAL</span>
          <span className="text-[9px] text-gray-400 dark:text-emerald-400/40 font-medium mt-0.5 uppercase">
            {showProductionCostToggle ? 'Receita - Custos' : 'Apenas Receita total'}
          </span>
          <h3 className="text-2xl font-black text-[#00965e] dark:text-[#00C984] mt-3 font-sans">
            {formatBRL(metrics.netProfit, hideValues)}
          </h3>
        </div>

        {/* Custo Produção */}
        <div className="bg-white dark:bg-[#122c24] p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all border border-emerald-900/5 dark:border-emerald-800/10 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF6E6] dark:bg-[#FFF6E6]/10 text-amber-500 dark:text-amber-400 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-300">
            <Package className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-emerald-400/50 tracking-widest uppercase">CUSTO PRODUÇÃO</span>
          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-0.5 uppercase">INSUMOS DAS VENDAS</span>
          <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-3 font-sans">
            {formatBRL(metrics.productionCostValue, hideValues)}
          </h3>
          {!showProductionCostToggle && (
            <span className="absolute bottom-1 text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">DESATIVADO</span>
          )}
        </div>

        {/* Despesas Fixas */}
        <div className="bg-white dark:bg-[#122c24] p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all border border-emerald-900/5 dark:border-emerald-800/10 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-[#FFEBEB] dark:bg-[#FFEBEB]/10 text-rose-500 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-300">
            <ArrowDownRight className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-emerald-400/50 tracking-widest uppercase">DESPESAS FIXAS</span>
          <span className="text-[9px] text-rose-600 font-bold mt-0.5 uppercase">GASTOS ADMINISTRATIVOS</span>
          <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-3 font-sans">
            {formatBRL(metrics.fixedExpensesValue, hideValues)}
          </h3>
          {!showFixedExpensesToggle && (
            <span className="absolute bottom-1 text-[8px] bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full font-bold">DESATIVADO</span>
          )}
        </div>
      </div>

      {/* Central de Alertas e Avisos / Mural do Painel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Alertas Operacionais Automáticos (Inventário e Cadastros) */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-[28px] border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-emerald-950">
              <div className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-emerald-100 font-sans">Alertas Operacionais Automáticos</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Verificação automática do sistema de estoque e processos</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
              {/* 1. Sem estoque (Estoque Zerado) */}
              {outOfStockProducts.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-250/35 dark:border-red-900/30 text-rose-900 dark:text-rose-200">
                  <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-extrabold uppercase text-[8px] tracking-wider px-1.5 py-0.5 bg-rose-600 text-white rounded">FALTA CRÍTICA</span>
                      <span className="font-bold text-red-700 dark:text-red-300">Estoque Insumo Zerado!</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Os seguintes produtos têm estoque esgotado: <span className="font-semibold text-rose-600 dark:text-rose-400">{outOfStockProducts.map(p => p.name).join(', ')}</span>. Isso prejudica imediatamente a confecção de receitas.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Estoque Baixo */}
              {lowStockProducts.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-250/35 dark:border-amber-900/30 text-amber-900 dark:text-amber-250">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-extrabold uppercase text-[8px] tracking-wider px-1.5 py-0.5 bg-amber-500 text-slate-900 rounded">ESTOQUE BAIXO</span>
                      <span className="font-bold text-amber-800 dark:text-amber-300">Abaixo do Nível Mínimo!</span>
                    </div>
                    <p className="text-slate-600 dark:text-amber-400/80">
                      Os insumos ecológicos a seguir estão sob segurança reduzida: <span className="font-semibold">{lowStockProducts.map(p => `${p.name} (${p.stock} ${p.unit})`).join(', ')}</span>. Providencie um novo lote.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Cadastro sem Fórmulas/Receitas */}
              {productsWithoutRecipe.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-emerald-950 text-slate-700 dark:text-emerald-300">
                  <FileQuestion className="w-5 h-5 text-[#8A9F9A] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-extrabold uppercase text-[8px] tracking-wider px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">FÓRMULA AUSENTE</span>
                      <span className="font-bold text-slate-850 dark:text-emerald-200">Sem Receita Conectada!</span>
                    </div>
                    <p className="text-slate-500 dark:text-emerald-400/75">
                      Os seguintes produtos finais não possuem receitas configuradas: <span className="font-semibold">{productsWithoutRecipe.map(p => p.name).join(', ')}</span>. Configure-os na tela de Receitas para calcular os custos.
                    </p>
                  </div>
                </div>
              )}

              {/* Tudo perfeito */}
              {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && productsWithoutRecipe.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-slate-400 dark:text-emerald-500/60">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                  <span className="font-bold text-sm text-slate-700 dark:text-emerald-100">Tudo sob controle no estoque!</span>
                  <p className="text-xs text-slate-400 dark:text-emerald-500/50 mt-1 max-w-sm">Nenhum aviso ou inconformidade de nível crítico ou mínimo foi detectado no sistema.</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 text-[10px] text-right font-medium text-slate-400 dark:text-[#8A9F9A]">
            Verificação: ERP Biomate Ativo
          </div>
        </div>

        {/* Lado Direito: Mural de Avisos Manuais do Gestor / Coleção de Recados */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-[28px] border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-emerald-950">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                  <Pin className="w-5 h-5 text-amber-550" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-emerald-100 font-sans">Mural de Recados Internos</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium font-mono">Mensagens fixadas e anotações administrativas</p>
                </div>
              </div>
            </div>

            {/* Form de adicionar recado */}
            <form onSubmit={handleAddAnnouncement} className="mb-4 bg-slate-50/50 dark:bg-[#0d1f1b] p-2.5 rounded-2xl border border-slate-100 dark:border-emerald-950/40 flex flex-col gap-2">
              <input
                type="text"
                placeholder="Escreva um recado ou instrução..."
                value={newAnnounceText}
                onChange={(e) => setNewAnnounceText(e.target.value)}
                className="w-full px-3 py-1.5 text-xs text-slate-800 dark:text-[#E6F9F2] bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-900/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/50 mr-1">Prioridade:</span>
                  {(['info', 'warning', 'error'] as const).map(p => {
                    const labelMap = { info: 'Normal', warning: 'Atenção', error: 'Urgente' };
                    const colorMap = {
                      info: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
                      warning: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
                      error: 'bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/30'
                    };
                    const isActive = newAnnouncePriority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewAnnouncePriority(p)}
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg border select-none transition-all cursor-pointer ${
                          isActive
                            ? `${colorMap[p]} ring-1 ring-emerald-500 font-black`
                            : 'bg-transparent text-slate-400 dark:text-emerald-500/50 border-slate-200 dark:border-emerald-900/20'
                        }`}
                      >
                        {labelMap[p]}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Fixar</span>
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {customAnnouncements.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-450 dark:text-[#8A9F9A]/40 italic">
                  Nenhum aviso fixado no momento. Use o campo acima para criar lembretes!
                </div>
              ) : (
                customAnnouncements.map(item => {
                  const borderPriorityClass =
                    item.priority === 'error'
                      ? 'border-l-rose-500 dark:border-l-rose-600'
                      : item.priority === 'warning'
                      ? 'border-l-amber-500'
                      : 'border-l-blue-400';
                  const badgeText = item.priority === 'error' ? 'Urgente' : item.priority === 'warning' ? 'Atenção' : 'Aviso';
                  const badgeColor =
                    item.priority === 'error'
                      ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/20'
                      : item.priority === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/20'
                      : 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/20';
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl bg-slate-50/75 dark:bg-[#0a1b18]/60 border border-slate-100 dark:border-emerald-950 border-l-4 ${borderPriorityClass} text-xs flex items-start justify-between gap-2.5 shadow-2xs group`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] font-bold uppercase px-1 py-px rounded ${badgeColor}`}>
                            {badgeText}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">{item.date}</span>
                        </div>
                        <p className="text-slate-705 dark:text-slate-300 text-[11px] font-medium leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                        title="Remover aviso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-2 text-[9px] text-[#8A9F9A] italic">
            * Notas criadas de forma local e visíveis apenas nesta sessão.
          </div>
        </div>
      </div>

      {/* COMPARATIVO DE MÉTRICAS - Recharts section exactly like inside picture */}
      <div className="bg-white dark:bg-[#122c24] p-6 sm:p-8 rounded-[32px] border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-black text-[#022A1E] dark:text-emerald-100 tracking-tight uppercase">
            COMPARATIVO DE MÉTRICAS
          </h3>
          <p className="text-[10px] sm:text-xs font-bold text-emerald-800/60 dark:text-emerald-400/50 tracking-[0.2em] uppercase mt-0.5">
            DISTRIBUIÇÃO DE VALORES E RENTABILIDADE OPERACIONAL
          </p>
        </div>

        <div className="w-full h-80 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C984" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00C984" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#59391D" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#59391D" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5F2EE" className="dark:stroke-emerald-950" />
              <XAxis dataKey="name" stroke="#8A9F9A" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#8A9F9A"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatBRL(value, hideValues)}
              />
              <Tooltip
                formatter={(value: any) => [formatBRL(value, hideValues), '']}
                contentStyle={{
                  backgroundColor: '#11221c',
                  border: 'none',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '12px'
                }}
              />
              <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="Receita Bruta" stroke="#00C984" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              {showProductionCostToggle && (
                <Area type="monotone" dataKey="Custo Produção" stroke="#59391D" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
              )}
              {showFixedExpensesToggle && (
                <Area type="monotone" dataKey="Despesas" stroke="#E54B4B" strokeWidth={1.5} strokeDasharray="3 3" fill="none" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Dynamic educational footnotes on financial state */}
        <div className="mt-6 pt-4 border-t border-[#F0FAF7] dark:border-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-gray-500 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#00C984]" />
            <span>Valores gerados em tempo real com base no faturamento de <b>{filteredSales.length} vendas</b> registradas.</span>
          </div>
          <div className="font-bold text-[#008F5D] dark:text-[#00C984]">
            Rentabilidade Média:{' '}
            {metrics.revenue > 0
              ? `${Math.round((metrics.netProfit / metrics.revenue) * 100)}%`
              : '0%'}
          </div>
        </div>
      </div>
    </div>
  );
}
