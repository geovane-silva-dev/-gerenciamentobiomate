import React, { useState, useMemo } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { ProductionBatch } from '../types';
import { formatBRL, formatDate } from '../utils';
import {
  Factory,
  Plus,
  Play,
  RotateCcw,
  User,
  Wrench,
  Trophy,
  Activity,
  Trash2,
  CheckCircle,
  Clock,
  Save,
  X,
  Check
} from 'lucide-react';

export default function ProductionView() {
  const {
    productionBatches,
    products,
    categories,
    registerProductionBatch,
    deleteProductionBatch,
    concludeProductionBatch,
    updateProduct,
    hideValues,
    confirmAction
  } = useBiomate();

  const [modalOpen, setModalOpen] = useState(false);
  
  // Registration Form states
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [rawMaterialCost, setRawMaterialCost] = useState('1000.00');
  const [responsible, setResponsible] = useState('Rosana');
  const [status, setStatus] = useState<'Concluído' | 'Em Andamento'>('Concluído');
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');

  // Built-in operators array
  const operators = ['Rosana', 'Geovane', 'Andrielly', 'Cristian'];

  const filteredBatches = useMemo(() => {
    return productionBatches;
  }, [productionBatches]);

  // Aggregate stats
  const aggregate = useMemo(() => {
    const totalVolume = productionBatches
      .filter(b => b.status === 'Concluído')
      .reduce((acc, b) => acc + Number(b.quantityProduced), 0);
    
    const activeRuns = productionBatches.filter(b => b.status === 'Em Andamento').length;
    const totalCost = productionBatches.reduce((acc, b) => acc + b.rawMaterialCost, 0);

    return {
      totalVolume,
      activeRuns,
      totalCost
    };
  }, [productionBatches]);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      const qty = Number(quantity) || 0;
      setRawMaterialCost((prod.costPrice * qty).toFixed(2));
    }
  };

  const handleQuantityChange = (qtyStr: string) => {
    setQuantity(qtyStr);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const qty = Number(qtyStr) || 0;
      setRawMaterialCost((prod.costPrice * qty).toFixed(2));
    }
  };

  const handleOpenAdd = () => {
    const firstProd = products[0];
    if (!firstProd) {
      alert('Por favor, cadastre ao menos um produto no banco antes de emitir ordens de produção.');
      return;
    }
    setProductId(firstProd.id);
    setQuantity('100');
    const initialCost = (firstProd.costPrice * 100).toFixed(2);
    setRawMaterialCost(initialCost);
    setResponsible('Rosana');
    setStatus('Concluído');
    setProductionDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !rawMaterialCost || !responsible) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const qty = Number(quantity);
    const cost = Number(rawMaterialCost);

    if (qty <= 0 || cost <= 0) {
      setErrorMsg('A quantidade produzida e o custo de matéria-prima precisam ser maiores que zero.');
      return;
    }

    // Register batch globally
    registerProductionBatch({
      productId,
      quantityProduced: qty,
      rawMaterialCost: cost,
      responsible,
      status,
      date: productionDate ? new Date(productionDate + 'T12:00:00').toISOString() : new Date().toISOString()
    });

    setModalOpen(false);
  };

  const handleDeleteBatch = (id: string, name: string, qty: number, status: string) => {
    let warning = `Deseja realmente excluir o lote de produção do produto "${name}"?`;
    if (status === 'Concluído') {
      warning += `\n\nATENÇÃO: Como o status do lote está "Concluído", a quantidade produzida (${qty}) será deduzida/estornada do estoque do produto.`;
    }

    confirmAction({
      title: 'Excluir Lote de Produção',
      message: warning,
      confirmText: 'Excluir e Estornar',
      isDanger: true,
      onConfirm: () => {
        deleteProductionBatch(id);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-50">Células de Produção Industrial</h2>
          <p className="text-xs text-gray-500 dark:text-emerald-400">Gere lotes de manufatura, verifique o consumo de matéria-prima e estoque de saída.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#00C984] hover:bg-[#00b073] text-[#022A1E] px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#00c984]/20 transition-all cursor-pointer self-start sm:self-auto"
          id="btn-add-production"
        >
          <Plus className="w-4 h-4" />
          <span>Emitir Ordem de Produção</span>
        </button>
      </div>

      {/* KPI Stats rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Lotes Ativos em Processamento</span>
            <span className="block text-2xl font-black text-amber-500 mt-1 font-mono">
              {aggregate.activeRuns} Campanhas
            </span>
          </div>
          <span className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <Activity className="w-6 h-6 animate-pulse" />
          </span>
        </div>

        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Volume Manufaturado Consolidado</span>
            <span className="block text-2xl font-black text-[#00965e] dark:text-[#00C984] mt-1 font-mono">
              {aggregate.totalVolume.toLocaleString('pt-BR')} <span className="text-xs font-semibold text-gray-550">L / kg</span>
            </span>
          </div>
          <span className="p-3 bg-[#E5FAF2] dark:bg-emerald-950/40 text-emerald-[#00C984] rounded-xl">
            <Trophy className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Custos Globais Indiretos</span>
            <span className="block text-2xl font-black text-gray-850 dark:text-emerald-50 mt-1 font-mono">
              {formatBRL(aggregate.totalCost, hideValues)}
            </span>
          </div>
          <span className="p-3 bg-gray-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-[#00C984] rounded-xl">
            <Wrench className="w-6 h-6" />
          </span>
        </div>
      </div>

      {/* Historic Production Log List */}
      <div className="bg-white dark:bg-[#122c24] p-6 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-8a0 dark:text-emerald-50 text-base">Diário de Controle Industrial</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-650 dark:text-emerald-100 border-collapse">
            <thead>
              <tr className="bg-[#F0FAF7] dark:bg-emerald-950/50 text-gray-400 dark:text-emerald-300 font-bold uppercase">
                <th className="p-3 rounded-l-lg">Lote ID</th>
                <th className="p-3">Data Manufatura</th>
                <th className="p-3">Insumo Produzido</th>
                <th className="p-3 text-center">Fisiologia / Status</th>
                <th className="p-3 text-center">Volume Renderizado</th>
                <th className="p-3 text-center">Custo Matéria-Prima</th>
                <th className="p-3 text-center">Responsável Técnico</th>
                <th className="p-3 text-right rounded-r-lg"></th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map(b => {
                const prod = products.find(p => p.id === b.productId);
                return (
                  <tr key={b.id} className="border-b border-gray-50 dark:border-emerald-950/10 hover:bg-[#F0FAF7]/10 transition-colors">
                    <td className="p-3 font-mono text-gray-400 text-[10px]">{b.id}</td>
                    <td className="p-3">{formatDate(b.date)}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{prod ? prod.imageUrl : '📦'}</span>
                        <span>{prod ? prod.name : 'Insumo Excluído'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase flex items-center justify-center gap-1.5 w-32 mx-auto ${
                        b.status === 'Concluído'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-[#00C984]'
                          : b.status === 'Em Andamento'
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {b.status === 'Concluído' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold font-mono">
                      {b.quantityProduced} {prod?.unit || ''}
                    </td>
                    <td className="p-3 text-center font-mono font-medium text-amber-800 dark:text-amber-400">
                      {formatBRL(b.rawMaterialCost, hideValues)}
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-1.5 py-4">
                      <User className="w-3.5 h-3.5 text-[#00C984]" />
                      <span>{b.responsible}</span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {b.status === 'Em Andamento' && (
                          <button
                            onClick={() => {
                              confirmAction({
                                title: 'Concluir Lote de Produção',
                                message: `Deseja realmente concluir o lote de produção de "${prod?.name || 'Insumo'}"?\n\nVolume a ser alimentado no estoque: ${b.quantityProduced} ${prod?.unit || ''}.`,
                                confirmText: 'Concluir Lote',
                                onConfirm: () => {
                                  concludeProductionBatch(b.id);
                                }
                              });
                            }}
                            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
                            title="Concluir ordem de produção"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBatch(b.id, prod?.name || 'Insumo', b.quantityProduced, b.status)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                          title="Remover ordem de produção"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    Nenhuma ordem de lotes de manufatura registrada até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Batch Registration Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 shadow-inner">
          <div className="bg-white dark:bg-[#122c24] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-900/10 dark:border-emerald-800/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-950 pb-4">
              <h3 className="text-lg font-black text-gray-800 dark:text-emerald-50 uppercase flex items-center gap-2">
                <Factory className="w-5 h-5 text-[#00C984]" />
                <span>Lançar Ordem de Manufatura</span>
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
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Insumo a ser Manufaturado *</label>
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
                            {p.name} ({p.unit}) - estoque atual: {p.stock}
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
                              {p.name} ({p.unit}) - estoque atual: {p.stock}
                            </option>
                          ))}
                        </optgroup>
                      );
                    }
                  })()}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Volume a Produzir *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Custo Matéria-Prima (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={rawMaterialCost}
                    onChange={(e) => setRawMaterialCost(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Encarregado Técnico *</label>
                  <select
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white"
                  >
                    {operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Status Operativo *</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-bold"
                  >
                    <option value="Concluído">Concluído (Alimenta Estoque)</option>
                    <option value="Em Andamento">Em Andamento</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Data da Manufatura / Entrega *</label>
                  <input
                    type="date"
                    required
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-[#122c24] text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                  />
                </div>
              </div>

              {status === 'Concluído' ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/15 text-emerald-800 dark:text-[#00C984] rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#00C984] animate-spin" />
                  <span>Atenção: Ao salvar como "Concluído", o volume produzido será creditado automaticamente no estoque central de insumos!</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/10 text-amber-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Ordens salvas como "Em Andamento" servem para planejamento analítico e não alteram o estoque físico.</span>
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
                  <span>Registrar Lote</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
