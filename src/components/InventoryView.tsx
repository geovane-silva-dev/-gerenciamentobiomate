import React, { useState, useMemo } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { Product, StockTransaction } from '../types';
import { formatBRL } from '../utils';
import {
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ListFilter,
  Save,
  X,
  Trash2
} from 'lucide-react';

export default function InventoryView() {
  const {
    products,
    categories,
    updateProduct,
    deleteProduct,
    hideValues,
    confirmAction,
    stockTransactions,
    addStockTransaction,
    deleteStockTransaction
  } = useBiomate();

  const [searchTerm, setSearchTerm] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'critical' | 'normal'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'entrada' | 'saida'>('entrada');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustDate, setAdjustDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustOperator, setAdjustOperator] = useState('Almoxarife Master');

  // Reference the global context transactions list
  const transactions = stockTransactions;
  const ids = transactions.map(tx => tx.id);
  console.log("Rendered IDs:", ids);
  console.log("Rendered Items:", transactions);

  // Filter products positions
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      
      const isCritical = p.stock <= p.minStock;
      const matchesLevel = stockLevelFilter === 'all' || 
                           (stockLevelFilter === 'critical' && isCritical) || 
                           (stockLevelFilter === 'normal' && !isCritical);
      
      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [products, searchTerm, stockLevelFilter, categoryFilter]);

  // Group filtered products by category
  const productsByCategory = useMemo(() => {
    const groups: { category: { id: string; name: string; description?: string } | null; products: Product[] }[] = [];

    // For each category, get its matching products
    categories.forEach(cat => {
      const catProducts = filteredProducts.filter(p => p.categoryId === cat.id);
      if (catProducts.length > 0) {
        groups.push({ category: cat, products: catProducts });
      }
    });

    // Also get products that do not belong to any valid category
    const validCategoryIds = new Set(categories.map(c => c.id));
    const unassignedProducts = filteredProducts.filter(p => !p.categoryId || !validCategoryIds.has(p.categoryId));
    if (unassignedProducts.length > 0) {
      groups.push({
        category: {
          id: 'unassigned',
          name: 'Sem Categoria Definida',
          description: 'Produtos temporariamente desvinculados ou que pertenciam a categorias excluídas.'
        },
        products: unassignedProducts
      });
    }

    return groups;
  }, [categories, filteredProducts]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
    const criticalItems = products.filter(p => p.stock <= p.minStock).length;
    const alertCoveragePercent = products.length > 0 
      ? Math.round(((products.length - criticalItems) / products.length) * 100)
      : 0;

    return {
      totalItems,
      criticalItems,
      alertCoveragePercent
    };
  }, [products]);

  const handleOpenAdjust = (p: Product, type: 'entrada' | 'saida') => {
    setSelectedProduct(p);
    setAdjustType(type);
    setAdjustQty('');
    setAdjustDate(new Date().toISOString().split('T')[0]);
    setAdjustReason(type === 'entrada' ? 'Recebimento de Lote' : 'Remessa ou Descarte Técnico');
    setModalOpen(true);
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty) return;

    const qty = Number(adjustQty);
    if (qty <= 0) {
      alert('A quantidade precisa ser maior que zero.');
      return;
    }

    const executeAdjust = () => {
      const stock = selectedProduct.stock;
      const movement = adjustType === 'entrada' ? `+${qty}` : `-${qty}`;
      const finalStock = adjustType === 'entrada' 
        ? selectedProduct.stock + qty 
        : Math.max(0, selectedProduct.stock - qty);

      console.log("Stock Before:", stock);
      console.log("Movement Applied:", movement);
      console.log("Final Stock:", finalStock);

      // Create log audit entry (under the hood, this will transactionally update BOTH product stock and the log document atomically)
      addStockTransaction({
        date: adjustDate ? new Date(adjustDate + 'T12:00:00').toISOString() : new Date().toISOString(),
        productId: selectedProduct.id,
        type: adjustType,
        quantity: qty,
        reason: adjustReason || 'Ajuste manual de inventário',
        operator: adjustOperator || 'Operador Central'
      });
      setModalOpen(false);
    };

    if (adjustType === 'saida' && selectedProduct.stock < qty) {
      confirmAction({
        title: 'Estoque Insuficiente',
        message: `O estoque atual (${selectedProduct.stock}) é menor do que a saída solicitada (${qty}). Isso deixará o saldo zerado. Deseja iniciar a operação mesmo assim?`,
        confirmText: 'Continuar e Forçar Saída',
        onConfirm: executeAdjust
      });
    } else {
      executeAdjust();
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    confirmAction({
      title: 'Excluir Item do Estoque',
      message: `Tem certeza que deseja excluir "${name}" definitivamente do estoque e do catálogo?`,
      confirmText: 'Excluir Definitivamente',
      isDanger: true,
      onConfirm: () => {
        deleteProduct(id);
      }
    });
  };

  const handleDeleteTransaction = (id: string) => {
    confirmAction({
      title: 'Excluir Lançamento de Estoque',
      message: 'Tem certeza de que deseja excluir este registro de movimentação de estoque? Esta ação limpa apenas o histórico de log do diário.',
      confirmText: 'Remover Registro',
      isDanger: true,
      onConfirm: () => {
        deleteStockTransaction(id);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Volume Geral Armazenado</span>
            <span className="block text-2xl font-black text-gray-800 dark:text-white mt-1">
              {stats.totalItems.toLocaleString('pt-BR')} <span className="text-xs font-semibold text-gray-500">Unidades</span>
            </span>
          </div>
          <span className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-[#00C984] rounded-xl">
            <Boxes className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Insumos em Estado Crítico</span>
            <span className={`block text-2xl font-black mt-1 ${stats.criticalItems > 0 ? 'text-amber-600' : 'text-emerald-700 dark:text-[#00C984]'}`}>
              {stats.criticalItems} {stats.criticalItems === 1 ? 'Produto' : 'Produtos'}
            </span>
          </div>
          <span className={`p-3 rounded-xl ${stats.criticalItems > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            <AlertTriangle className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Nível de Cobertura Saudável</span>
            <span className="block text-2xl font-black text-emerald-700 dark:text-[#00C984] mt-1">
              {stats.alertCoveragePercent}%
            </span>
          </div>
          <span className="p-3 bg-[#E5FAF2] dark:bg-emerald-950/40 text-emerald-800 dark:text-[#00C984] rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </span>
        </div>
      </div>

      {/* Advanced filters and Search criteria */}
      <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-gray-800 dark:text-emerald-100 uppercase tracking-widest flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-[#00C984]" />
          <span>Filtros do Inventário</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquise por nome, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none"
            />
          </div>

          <div>
            <select
              value={stockLevelFilter}
              onChange={(e: any) => setStockLevelFilter(e.target.value)}
              className="w-full py-2.5 px-3 text-sm rounded-xl bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none"
            >
              <option value="all">Saldos de Estoque (Todos)</option>
              <option value="critical">Alerta Securitário (Baixo Estoque)</option>
              <option value="normal">Saldos Abundantes / Fora do Risco</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2.5 px-3 text-sm rounded-xl bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none"
            >
              <option value="all">Filtro por Categorias (Todas)</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grouped Stock View By Category */}
      <div className="space-y-8 animate-fade-in">
        {productsByCategory.length === 0 ? (
          <div className="bg-white dark:bg-[#122c24] p-12 text-center text-gray-400 dark:text-emerald-400/50 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm">
            Nenhum insumo ou produto em estoque atende a esses filtros de pesquisa.
          </div>
        ) : (
          productsByCategory.map(({ category, products: groupProds }) => {
            return (
              <div 
                key={category?.id} 
                className="bg-white dark:bg-[#122c24] rounded-3xl border border-emerald-900/5 dark:border-emerald-800/15 shadow-sm p-6 space-y-4"
              >
                {/* Category Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-emerald-950/60 pb-3 gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-800 dark:text-emerald-50">
                        {category?.name}
                      </span>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-[#00C984] border border-[#00C984]/15">
                        {groupProds.length} {groupProds.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    {category?.description && (
                      <p className="text-xs text-gray-400 dark:text-[#8A9F9A] max-w-2xl leading-relaxed">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sub-table for this category */}
                <div className="overflow-x-auto rounded-xl border border-emerald-500/5 dark:border-emerald-950">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F0FAF7] dark:bg-emerald-950/30 text-gray-500 dark:text-emerald-300 text-xs font-bold uppercase border-b border-emerald-900/5 dark:border-emerald-800/20">
                        <th className="p-3 w-16 text-center">Ícone</th>
                        <th className="p-3">Código SKU</th>
                        <th className="p-3">Produto de Insumo</th>
                        <th className="p-3 text-center">Nível de Armazenamento</th>
                        <th className="p-3 text-center">Volume em Saldo</th>
                        <th className="p-3 text-right">Ajuste Rápido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupProds.map(p => {
                        const isCritical = p.stock <= p.minStock;
                        
                        // Compute dynamic visual level bar
                        const totalEstCapacity = p.minStock * 4; // estimation of safe max capacity for scale
                        const pctFilled = Math.min(100, Math.round((p.stock / totalEstCapacity) * 100));

                        return (
                          <tr
                            key={p.id}
                            className="border-b border-emerald-900/5 dark:border-emerald-800/10 hover:bg-[#F0FAF7]/40 dark:hover:bg-emerald-950/20 text-sm text-gray-700 dark:text-emerald-100 transition-colors"
                          >
                            <td className="p-3 text-center text-xl bg-[#F8FDFC] dark:bg-emerald-950/10 rounded-l-lg">{p.imageUrl || '🧪'}</td>
                            <td className="p-3 font-mono text-xs text-gray-500">{p.sku}</td>
                            <td className="p-3 font-bold text-gray-800 dark:text-white">
                              <span className="font-bold text-gray-850 dark:text-white">{p.name}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                                <div className="w-24 bg-gray-100 dark:bg-emerald-950/60 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isCritical ? 'bg-rose-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${p.stock === 0 ? 0 : Math.max(12, pctFilled)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono font-bold text-gray-500">{pctFilled}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`font-mono font-extrabold text-base ${isCritical ? 'text-rose-500' : 'text-emerald-800 dark:text-[#00C984]'}`}>
                                  {p.stock}
                                </span>
                                <span className="text-[10px] text-gray-400">mínimo: {p.minStock} {p.unit}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right rounded-r-lg">
                              <div className="flex gap-1.5 justify-end items-center font-bold">
                                <button
                                  onClick={() => handleOpenAdjust(p, 'entrada')}
                                  className="bg-[#E5FAF2] hover:bg-emerald-100 text-[#008F5D] border border-emerald-500/10 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="Entrada manual de insumos"
                                >
                                  <ArrowUpRight className="w-4 h-4" />
                                  <span>Entrada</span>
                                </button>
                                <button
                                  onClick={() => handleOpenAdjust(p, 'saida')}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="Descarte técnico/Ajuste voluntário"
                                >
                                  <ArrowDownLeft className="w-4 h-4" />
                                  <span>Saída</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  className="p-1.5 rounded-lg text-rose-550 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/25 transition-all cursor-pointer"
                                  title="Excluir item definitivamente"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Physical Audit Transactions History Log */}
      <div className="bg-white dark:bg-[#122c24] p-6 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 dark:text-emerald-50 text-base">Diário de Controle de Movimentações</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-emerald-150">
            <thead>
              <tr className="border-b border-gray-100 dark:border-emerald-950 pb-2 text-gray-400 font-bold uppercase">
                <th className="py-2">Data e Hora</th>
                <th className="py-2">Item</th>
                <th className="py-2 text-center">Operação</th>
                <th className="py-2 text-center font-mono">Qtd</th>
                <th className="py-2 text-center">Responsável</th>
                <th className="py-2 text-left">Motivação Detalhada</th>
                <th className="py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const prod = products.find(p => p.id === tx.productId);
                return (
                  <tr key={tx.id} className="border-b border-gray-50 dark:border-emerald-950/20 py-2 hover:bg-[#F0FAF7]/10 transition-colors">
                    <td className="py-2.5 font-mono text-gray-400">{new Date(tx.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
                    <td className="py-2.5 font-bold text-gray-800 dark:text-white">{prod ? prod.name : 'Item Desconhecido'}</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        tx.type === 'entrada' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-[#00C984]' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700'
                      }`}>
                        {tx.type === 'entrada' ? 'ENTRADA' : 'SAÍDA'}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold text-gray-900 dark:text-white">
                      {tx.type === 'entrada' ? '+' : '-'}{tx.quantity} {prod?.unit || ''}
                    </td>
                    <td className="py-2.5 text-center">{tx.operator}</td>
                    <td className="py-2.5 text-left font-medium text-gray-500 dark:text-emerald-400">{tx.reason}</td>
                    <td className="py-2.5 text-right font-medium">
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="p-1 rounded text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer inline-flex items-center justify-center"
                        title="Apagar este lançamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjust Modal */}
      {modalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 shadow-inner">
          <div className="bg-white dark:bg-[#122c24] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-900/10 dark:border-emerald-800/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-950 pb-4">
              <h3 className="text-lg font-black text-gray-800 dark:text-emerald-50 uppercase flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#00C984]" />
                <span>Lançar {adjustType === 'entrada' ? 'Entrada Física' : 'Saída Voluntária'}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 bg-[#F0FAF7] dark:bg-emerald-950/20 rounded-2xl flex items-center gap-3">
              <span className="text-2xl bg-white dark:bg-emerald-950/40 p-2 rounded-xl shadow-sm">{selectedProduct.imageUrl}</span>
              <div>
                <span className="block text-xs text-gray-500 dark:text-emerald-400">Produto Selecionado</span>
                <span className="font-bold text-gray-800 dark:text-white text-sm">{selectedProduct.name}</span>
                <span className="block text-[10px] text-emerald-800 dark:text-[#00C984] font-mono">Estoque Atual: {selectedProduct.stock} {selectedProduct.unit}</span>
              </div>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Dose / Quantidade em ({selectedProduct.unit}) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="Selecione a quantidade de ajuste..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-[#122c24] text-gray-800 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Data da Operação *</label>
                  <input
                    type="date"
                    required
                    value={adjustDate}
                    onChange={(e) => setAdjustDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-[#122c24] text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Motivação do Ajuste *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Auditoria física / Deteriorização lote"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Operador Responsável *</label>
                <input
                  type="text"
                  required
                  value={adjustOperator}
                  onChange={(e) => setAdjustOperator(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                />
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
                  <span>Registrar Movimento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
