import React, { useState, useMemo } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { formatBRL, formatDate } from '../utils';
import {
  ShoppingCart,
  Plus,
  TrendingUp,
  Percent,
  CircleDollarSign,
  UserCheck,
  Search,
  Trash2,
  Calendar,
  Save,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function SalesView() {
  const {
    sales,
    products,
    categories,
    registerSale,
    deleteSale,
    hideValues,
    confirmAction
  } = useBiomate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');
  const [breakdownType, setBreakdownType] = useState<'product' | 'category'>('category');

  // Register Modal inputs
  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [unitPrice, setUnitPrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-fill price when product changes
  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setUnitPrice(prod.price.toString());
    } else {
      setUnitPrice('');
    }
  };

  // Unique clients list for dropdown
  const clients = useMemo(() => {
    return Array.from(new Set(sales.map(s => s.customerName).filter(Boolean)));
  }, [sales]);

  // General Filter
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const prod = products.find(p => p.id === s.productId);
      const prodName = prod ? prod.name : '';
      const matchesSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            prodName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClient = selectedClientFilter === 'all' || s.customerName === selectedClientFilter;
      return matchesSearch && matchesClient;
    });
  }, [sales, products, searchTerm, selectedClientFilter]);

  // Aggregate Sales KPIs
  const kpis = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalProfit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
    const totalCount = filteredSales.length;
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;
    const marginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalProfit,
      totalCount,
      avgTicket,
      marginPercent
    };
  }, [filteredSales]);

  // Recharts Chart breakdown: Faturamento por produto
  const productChartData = useMemo(() => {
    const data: { [name: string]: number } = {};
    filteredSales.forEach(s => {
      const prod = products.find(p => p.id === s.productId);
      const name = prod ? prod.name : 'Outros';
      data[name] = (data[name] || 0) + s.totalAmount;
    });

    const colors = ['#00C984', '#59391D', '#00965e', '#FFA800', '#FF4E4E', '#800080'];
    return Object.keys(data).map((key, i) => ({
      name: key,
      value: data[key],
      color: colors[i % colors.length]
    }));
  }, [filteredSales, products]);

  // Recharts Chart breakdown: Faturamento por categoria
  const categoryChartData = useMemo(() => {
    const data: { [name: string]: number } = {};
    filteredSales.forEach(s => {
      const prod = products.find(p => p.id === s.productId);
      const cat = prod ? categories.find(c => c.id === prod.categoryId) : null;
      const name = cat ? cat.name : 'Sem Categoria';
      data[name] = (data[name] || 0) + s.totalAmount;
    });

    const colors = ['#00C984', '#FFA800', '#00965e', '#59391D', '#FF4E4E', '#800080'];
    return Object.keys(data).map((key, i) => ({
      name: key,
      value: data[key],
      color: colors[i % colors.length]
    }));
  }, [filteredSales, products, categories]);

  const handleOpenAdd = () => {
    const firstProd = products[0];
    if (!firstProd) {
      alert('Não há produtos cadastrados. Cadastre um produto na aba de "Produtos" antes de efetuar uma venda.');
      return;
    }
    setProductId(firstProd.id);
    setUnitPrice(firstProd.price.toString());
    setQuantity('5');
    setCustomerName('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !unitPrice || !customerName) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const qty = Number(quantity);
    if (qty <= 0) {
      setErrorMsg('A quantidade precisa ser superior a zero.');
      return;
    }

    const executeSalesCreation = () => {
      const success = registerSale({
        productId,
        quantity: qty,
        unitPrice: Number(unitPrice),
        customerName,
        date: saleDate ? new Date(saleDate + 'T12:00:00').toISOString() : new Date().toISOString()
      });

      if (success) {
        setModalOpen(false);
      } else {
        setErrorMsg('Erro inesperado ao registrar a venda.');
      }
    };

    if (prod.stock < qty) {
      confirmAction({
        title: 'Estoque Insuficiente',
        message: `Atenção: O estoque do produto (${prod.stock} ${prod.unit}) é insuficiente para atender essa venda de ${qty}. Deseja prosseguir de qualquer forma? Isso reduzirá o estoque para zero.`,
        confirmText: 'Prosseguir Mesmo Assim',
        onConfirm: executeSalesCreation
      });
    } else {
      executeSalesCreation();
    }
  };

  const handleDeleteSale = (id: string, customer: string, val: number) => {
    confirmAction({
      title: 'Excluir Lançamento de Venda',
      message: `Desfazer a venda de R$ ${val.toFixed(2)} lançada para "${customer}"? Isso estornará os itens correspondentes de volta para o estoque central de produtos.`,
      confirmText: 'Excluir e Estornar',
      isDanger: true,
      onConfirm: () => {
        deleteSale(id);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Sales views Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-50">Transações de Faturamento</h2>
          <p className="text-xs text-gray-500 dark:text-emerald-400">Lance negociações, fature remessas e monitore o lucro operacional líquido.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#00C984] hover:bg-[#00b073] text-[#022A1E] px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#00c984]/20 transition-all cursor-pointer self-start sm:self-auto"
          id="btn-add-sale"
        >
          <Plus className="w-4 h-4" />
          <span>Lançar Nova Venda</span>
        </button>
      </div>

      {/* KPI stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Faturado */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center gap-4">
          <span className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-[#00965e] dark:text-[#00C984] rounded-xl font-sans">
            <CircleDollarSign className="w-6 h-6" />
          </span>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Faturamento Filtrado</span>
            <span className="block text-xl font-black text-gray-800 dark:text-white mt-0.5">
              {formatBRL(kpis.totalRevenue, hideValues)}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold">{kpis.totalCount} vendas efetuadas</span>
          </div>
        </div>

        {/* Lucros Líquidos */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center gap-4">
          <span className="p-3 bg-blue-50 dark:bg-[#ECF3FF]/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </span>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Margem de Lucro Real</span>
            <span className="block text-xl font-black text-[#00C984] mt-0.5">
              {formatBRL(kpis.totalProfit, hideValues)}
            </span>
            <span className="text-[10px] text-emerald-800 dark:text-[#00c984] font-bold">médio {kpis.marginPercent}% por venda</span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center gap-4">
          <span className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Percent className="w-6 h-6" />
          </span>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Faturamento Médio</span>
            <span className="block text-xl font-black text-gray-800 dark:text-white mt-0.5">
              {formatBRL(kpis.avgTicket, hideValues)}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold">ticket por comprador</span>
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center gap-4">
          <span className="p-3 bg-[#E5FAF2] dark:bg-emerald-950/40 text-emerald-800 dark:text-[#00C984] rounded-xl">
            <UserCheck className="w-6 h-6" />
          </span>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Portfólio de Compradores</span>
            <span className="block text-xl font-black text-gray-800 dark:text-white mt-0.5">
              {clients.length} Ativos
            </span>
            <span className="text-[10px] text-gray-500 font-semibold">fidelização agropecuária</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Revenue Breakdown list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales search & history list */}
        <div className="lg:col-span-2 bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-gray-50 dark:border-emerald-950/40">
            <h3 className="font-bold text-gray-850 dark:text-white text-base">Livro Geral de Escapes de Faturamento</h3>
            
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Buscar por cliente, produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none"
              />
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none"
              >
                <option value="all">Clientes (Todos)</option>
                {clients.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-emerald-100 border-collapse">
              <thead>
                <tr className="bg-[#F0FAF7] dark:bg-emerald-950/50 text-gray-400 dark:text-emerald-300 font-bold uppercase">
                  <th className="p-3 rounded-l-lg">Data</th>
                  <th className="p-3">Comprador</th>
                  <th className="p-3">Insumo / Dose</th>
                  <th className="p-3 font-mono text-center">Valor Un.</th>
                  <th className="p-3 font-mono text-center">Faturado</th>
                  <th className="p-3 font-mono text-center text-[#00965e] dark:text-[#00C984]">Margem</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(s => {
                  const prod = products.find(p => p.id === s.productId);
                  return (
                    <tr key={s.id} className="border-b border-gray-50 dark:border-emerald-950/10 hover:bg-[#F0FAF7]/10 transition-colors">
                      <td className="p-3 font-mono text-gray-400">
                        {new Date(s.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                      </td>
                      <td className="p-3 font-bold text-gray-800 dark:text-white">{s.customerName}</td>
                      <td className="p-3 font-medium">
                        {prod ? prod.name : 'Excluído'}
                        <span className="block text-[9px] text-gray-400 font-normal">Qtd: {s.quantity} {prod?.unit || ''}</span>
                      </td>
                      <td className="p-3 text-center font-mono">{formatBRL(s.unitPrice, hideValues)}</td>
                      <td className="p-3 text-center font-bold font-mono text-gray-900 dark:text-emerald-50">{formatBRL(s.totalAmount, hideValues)}</td>
                      <td className="p-3 text-center font-extrabold font-mono text-emerald-800 dark:text-[#00C984] bg-emerald-500/5 rounded-lg">
                        {formatBRL(s.profit, hideValues)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteSale(s.id, s.customerName, s.totalAmount)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                          title="Estornar faturamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 dark:text-emerald-400/50">
                      Nenhuma venda registrada atende a esses critérios de pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Faturamento consolidado por produto Recharts pie chart */}
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className="font-bold text-gray-800 dark:text-emerald-50 text-base">
                {breakdownType === 'category' ? 'Fração por Categoria' : 'Fração por Produto'}
              </h3>
              <p className="text-[10px] text-gray-450 dark:text-emerald-400/60 mt-0.5 uppercase font-medium">COMPOSIÇÃO CONSOLIDADA DA RECEITA BRUTA</p>
            </div>
            
            {/* Toggle Switch pills */}
            <div className="flex bg-[#F0FAF7] dark:bg-emerald-950/40 p-0.5 rounded-lg border border-emerald-500/5 shrink-0">
              <button
                type="button"
                onClick={() => setBreakdownType('category')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                  breakdownType === 'category'
                    ? 'bg-[#00C984] text-[#022A1E]'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-emerald-250'
                }`}
              >
                Cat
              </button>
              <button
                type="button"
                onClick={() => setBreakdownType('product')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                  breakdownType === 'product'
                    ? 'bg-[#00C984] text-[#022A1E]'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-emerald-250'
                }`}
              >
                Prod
              </button>
            </div>
          </div>

          <div className="w-full h-56 relative flex items-center justify-center my-4">
            {(breakdownType === 'category' ? categoryChartData : productChartData).length === 0 ? (
              <div className="text-xs text-gray-400 text-center uppercase">Sem dados faturados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(value: any) => formatBRL(value, hideValues)} />
                  <Pie
                    data={breakdownType === 'category' ? categoryChartData : productChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(breakdownType === 'category' ? categoryChartData : productChartData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Color Indicators list */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(breakdownType === 'category' ? categoryChartData : productChartData).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-gray-500 dark:text-emerald-250">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate max-w-40">{item.name}</span>
                </span>
                <span className="font-mono text-gray-800 dark:text-white">{formatBRL(item.value, hideValues)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Registration Modal Popup */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 shadow-inner">
          <div className="bg-white dark:bg-[#122c24] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-900/10 dark:border-emerald-800/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-950 pb-4">
              <h3 className="text-lg font-black text-gray-800 dark:text-emerald-50 uppercase flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#00C984]" />
                <span>Registrar Saída Comercial</span>
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

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Nome do Comprador / Agropecuária *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ex: Fazenda Progresso S/A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-[#122c24] text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Data da Venda / Saída *</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-[#122c24] text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Insumo Negociado *</label>
                  <select
                    value={productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-bold"
                  >
                    <option value="">Selecione o Insumo/Produto...</option>
                    {categories.map(cat => {
                      const catProducts = products.filter(p => p.categoryId === cat.id);
                      if (catProducts.length === 0) return null;
                      return (
                        <optgroup key={cat.id} label={cat.name} className="font-extrabold text-[#00965e]">
                          {catProducts.map(p => (
                            <option key={p.id} value={p.id} className="font-sans font-medium text-slate-800">
                              {p.name} (estoque: {p.stock} {p.unit})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                    {(() => {
                      const validCatIds = new Set(categories.map(c => c.id));
                      const unassigned = products.filter(p => !p.categoryId || !validCatIds.has(p.categoryId));
                      if (unassigned.length > 0) {
                        return (
                          <optgroup label="Sem Categoria Definida" className="font-extrabold text-gray-500">
                            {unassigned.map(p => (
                              <option key={p.id} value={p.id} className="font-sans font-medium text-slate-800">
                                {p.name} (estoque: {p.stock} {p.unit})
                              </option>
                            ))}
                          </optgroup>
                        );
                      }
                    })()}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Dose / Quantidade *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Preço Negociado Un. (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Live Preview Math */}
              {productId && quantity && unitPrice && (
                <div className="bg-[#F0FAF7] dark:bg-emerald-950/20 p-4 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between font-bold dark:text-emerald-100">
                    <span>Subtotal Receita:</span>
                    <span>{formatBRL(Number(quantity) * Number(unitPrice), false)}</span>
                  </div>
                  <div className="flex justify-between text-gray-550 dark:text-emerald-400">
                    <span>Custo Estimado de Produção:</span>
                    <span>
                      {(() => {
                        const prod = products.find(p => p.id === productId);
                        return formatBRL((prod ? prod.costPrice : 0) * Number(quantity), false);
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between font-extrabold text-[#00965e] dark:text-[#00C984] pt-1.5 border-t border-dashed border-emerald-950/15">
                    <span>Lucro Operacional Estimado:</span>
                    <span>
                      {(() => {
                        const prod = products.find(p => p.id === productId);
                        const cost = (prod ? prod.costPrice : 0) * Number(quantity);
                        const rev = Number(quantity) * Number(unitPrice);
                        return formatBRL(rev - cost, false);
                      })()}
                    </span>
                  </div>
                </div>
              )}

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
                  <span>Registrar Faturamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
