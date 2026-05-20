import React, { useState, useMemo } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { Expense } from '../types';
import { formatBRL, formatDate } from '../utils';
import {
  Receipt,
  Plus,
  ArrowDownRight,
  Sparkles,
  PieChart as ChartIcon,
  Search,
  Trash2,
  Bookmark,
  TrendingDown,
  Save,
  X
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export default function ExpensesView() {
  const {
    expenses,
    registerExpense,
    deleteExpense,
    hideValues,
    confirmAction
  } = useBiomate();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'fixo' | 'variavel'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Register Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState('Geral');
  const [type, setType] = useState<'fixo' | 'variavel'>('fixo');
  const [errorMsg, setErrorMsg] = useState('');

  // Built-in categories for expenses
  const expenseCategories = ['Salários', 'Aluguel', 'Utilidades', 'Insumos', 'Marketing', 'Manutenção', 'Tecnologia', 'Impostos', 'Geral'];

  // General Filter
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || e.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [expenses, searchTerm, typeFilter, categoryFilter]);

  // General totals
  const financials = useMemo(() => {
    const total = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const fixed = filteredExpenses.filter(e => e.type === 'fixo').reduce((acc, e) => acc + e.amount, 0);
    const variable = filteredExpenses.filter(e => e.type === 'variavel').reduce((acc, e) => acc + e.amount, 0);
    
    const fixedPercent = total > 0 ? Math.round((fixed / total) * 100) : 0;
    const variablePercent = total > 0 ? Math.round((variable / total) * 100) : 0;

    return {
      total,
      fixed,
      variable,
      fixedPercent,
      variablePercent
    };
  }, [filteredExpenses]);

  // BarChart layout data per Category
  const categorySplitData = useMemo(() => {
    const data: { [cat: string]: number } = {};
    filteredExpenses.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });

    return Object.keys(data).map(key => ({
      name: key,
      'Valor Absoluto': data[key]
    })).sort((a,b) => b['Valor Absoluto'] - a['Valor Absoluto']);
  }, [filteredExpenses]);

  // PieChart layout for Fixed vs Variable
  const typeChartData = [
    { name: 'Custo Fixo', value: financials.fixed, color: '#6B1832' },
    { name: 'Custo Variável', value: financials.variable, color: '#FF7E7E' }
  ];

  const handleOpenAdd = () => {
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setExpenseCategory('Geral');
    setType('fixo');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date || !expenseCategory) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const amt = Number(amount);
    if (amt <= 0) {
      setErrorMsg('O valor da despesa operacional precisa ser maior do que zero.');
      return;
    }

    registerExpense({
      description,
      amount: amt,
      date,
      category: expenseCategory,
      type
    });

    setModalOpen(false);
  };

  const handleDeleteExpense = (id: string, desc: string, val: number) => {
    confirmAction({
      title: 'Excluir Despesa',
      message: `Excluir o registro de despesa "${desc}" no valor de R$ ${val.toFixed(2)}? Isso restabelecerá o cálculo do lucro operacional líquido.`,
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: () => {
        deleteExpense(id);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-50">Fluxo de Despesas e Contas</h2>
          <p className="text-xs text-gray-500 dark:text-emerald-400">Classifique as despesas administrativas fixes e variavéis de fábrica.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#00C984] hover:bg-[#00b073] text-[#022A1E] px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#00c984]/20 transition-all cursor-pointer self-start sm:self-auto"
          id="btn-add-expense"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Despesa</span>
        </button>
      </div>

      {/* KPI stats section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Despesas Totais Analisadas</span>
            <span className="block text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {formatBRL(financials.total, hideValues)}
            </span>
          </div>
          <span className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
            <Receipt className="w-6 h-6 animate-pulse" />
          </span>
        </div>

        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Soma de Custos Fixos</span>
            <span className="block text-2xl font-black text-[#6B1832] dark:text-rose-300 mt-1 font-mono">
              {formatBRL(financials.fixed, hideValues)}
            </span>
            <span className="text-[10px] text-gray-400 font-bold block mt-0.5">{financials.fixedPercent}% do faturamento administrativo</span>
          </div>
          <span className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Despesa Variável / Flutuante</span>
            <span className="block text-2xl font-black text-amber-600 mt-1 font-mono">
              {formatBRL(financials.variable, hideValues)}
            </span>
            <span className="text-[10px] text-gray-400 font-bold block mt-0.5">{financials.variablePercent}% do faturamento operacional</span>
          </div>
          <span className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </span>
        </div>
      </div>

      {/* Main filter interface */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#122c24] p-4 rounded-xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquise despesas por descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="w-full py-2 px-3 text-sm rounded-lg bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none"
          >
            <option value="all">Tipo (Todos)</option>
            <option value="fixo">Custo Fixo</option>
            <option value="variavel">Custo Variável</option>
          </select>
        </div>
        <div className="w-full sm:w-48">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full py-2 px-3 text-sm rounded-lg bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none"
          >
            <option value="all">Categoria (Todas)</option>
            {expenseCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Graphics and lists grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger logs */}
        <div className="lg:col-span-2 bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-850 dark:text-white text-base">Registro Detalhado de Saídas</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-emerald-100 border-collapse">
              <thead>
                <tr className="bg-[#F0FAF7] dark:bg-emerald-950/50 text-gray-400 dark:text-emerald-300 font-bold uppercase">
                  <th className="p-3 rounded-l-lg">Data</th>
                  <th className="p-3">Histórico / Descrição</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-center">Enquadre</th>
                  <th className="p-3 text-center font-mono">Valor</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 dark:border-emerald-950/10 hover:bg-[#F0FAF7]/10 transition-colors">
                    <td className="p-3 font-mono text-gray-450">{e.date}</td>
                    <td className="p-3 font-bold text-gray-800 dark:text-white">{e.description}</td>
                    <td className="p-3 text-gray-500">
                      <span className="bg-gray-100 dark:bg-emerald-950/40 text-gray-650 dark:text-emerald-300 px-2 py-0.5 rounded font-medium">
                        {e.category}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                        e.type === 'fixo' ? 'bg-[#FFEDED] text-[#6B1832]' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {e.type === 'fixo' ? 'FIXO' : 'VARIÁVEL'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold font-mono text-rose-600 dark:text-rose-400">
                      {formatBRL(e.amount, hideValues)}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteExpense(e.id, e.description, e.amount)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 dark:text-emerald-400/50">
                      Nenhuma despesa ou fatura administrativa lançada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Categories split bar graphic */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-emerald-50 text-base">Maiores Centros de Custo</h3>
            <p className="text-[10px] text-gray-450 dark:text-emerald-400/60 mt-0.5 uppercase font-medium">DISTRIBUIÇÃO ANALÍTICA POR CATEGORIA</p>
          </div>

          <div className="w-full h-52 relative flex items-center justify-center my-4">
            {categorySplitData.length === 0 ? (
              <div className="text-xs text-gray-400 uppercase">Sem contas lançadas</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySplitData} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#8A9F9A" fontSize={9} />
                  <YAxis stroke="#8A9F9A" fontSize={8} tickFormatter={(value) => formatBRL(value, hideValues)} />
                  <ChartTooltip formatter={(value: any) => formatBRL(value, hideValues)} />
                  <Bar dataKey="Valor Absoluto" fill="#E54B4B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Fixed vs variable split meter banner */}
          <div className="bg-[#F0FAF7] dark:bg-emerald-950/20 p-4 rounded-xl flex items-center justify-between text-xs font-semibold">
            <div className="flex flex-col">
              <span className="text-gray-450 text-[10px]">Custo Operacional Fixo</span>
              <span className="text-[#6B1832] dark:text-rose-300 font-bold">{formatBRL(financials.fixed, hideValues)} ({financials.fixedPercent}%)</span>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-emerald-900" />
            <div className="flex flex-col text-right">
              <span className="text-gray-450 text-[10px]">Custo Mutável Variável</span>
              <span className="text-amber-600 font-bold">{formatBRL(financials.variable, hideValues)} ({financials.variablePercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Outlays registration Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 shadow-inner">
          <div className="bg-white dark:bg-[#122c24] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-900/10 dark:border-emerald-800/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-950 pb-4">
              <h3 className="text-lg font-black text-gray-800 dark:text-emerald-50 uppercase flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#00C984]" />
                <span>Registrar Nova Despesa</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Descrição / Finalidade *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Serviço de auditoria anual"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Valor do Custo (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Data Competência *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Categoria Técnica *</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Regime de Custo *</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white"
                  >
                    <option value="fixo">Regime Fixo</option>
                    <option value="variavel">Regime Variável</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-emerald-950/40 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-emerald-950/40 text-gray-500 dark:text-emerald-300 rounded-xl font-bold cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#00C984] hover:bg-[#00af73] text-[#022A1E] rounded-xl font-bold shadow-md shadow-[#00c984]/10 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4.5 h-4.5" />
                  <span>Gravar Despesa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
