import React, { useState, useMemo } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { Product } from '../types';
import { formatBRL, getCategoryEmoji } from '../utils';
import { Plus, Search, Pencil, Trash2, Eye, HelpCircle, Save, X, AlertTriangle } from 'lucide-react';

export default function ProductsView() {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    hideValues,
    confirmAction
  } = useBiomate();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form values
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [imageUrl, setImageUrl] = useState('🧪');
  const [unit, setUnit] = useState('L');
  const [productType, setProductType] = useState<'Produto Final' | 'Insumo' | 'Ambos'>('Produto Final');
  const [description, setDescription] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  // Dropdown icons options
  const iconOptions = ['🧪', '🛡️', '🍂', '🪴', '📦', '🔋', '💧', '🌿', '🪵'];

  // Filter products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const groups: { category: { id: string; name: string; description?: string } | null; products: Product[] }[] = [];

    // For each category, get its matching products
    categories.forEach(cat => {
      const catProducts = filteredProducts.filter(p => p.categoryId === cat.id);
      if (catProducts.length > 0) {
        groups.push({ category: cat, products: catProducts });
      }
    });

    // Also get products that do not belong to any valid category (unassigned / cleared category)
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

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setSku(`BM-${Math.floor(100 + Math.random() * 900)}`);
    setCategoryId(categories[0]?.id || '');
    setPrice('100.00');
    setCostPrice('40.00');
    setStock('50');
    setMinStock('20');
    setImageUrl('🧪');
    setUnit('L');
    setProductType('Produto Final');
    setDescription('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCategoryId(p.categoryId);
    setPrice(p.price.toString());
    setCostPrice(p.costPrice.toString());
    setStock(p.stock.toString());
    setMinStock(p.minStock.toString());
    setImageUrl(p.imageUrl || '🧪');
    setUnit(p.unit);
    setProductType(p.productType || 'Produto Final');
    setDescription(p.description || '');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !categoryId || !price || !costPrice || !stock || !minStock) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    const priceNum = Number(price);
    const costNum = Number(costPrice);

    const savePayload = () => {
      const payload = {
        name,
        sku,
        categoryId,
        price: priceNum,
        costPrice: costNum,
        stock: Number(stock),
        minStock: Number(minStock),
        imageUrl,
        unit,
        productType,
        description
      };

      if (editingId) {
        updateProduct(editingId, payload);
      } else {
        addProduct(payload);
      }
      setModalOpen(false);
    };

    if (priceNum < costNum) {
      confirmAction({
        title: 'Aviso de Precificação',
        message: 'Atenção: O preço de venda é menor que o preço de custo. Deseja salvar assim mesmo com prejuízo projetado?',
        confirmText: 'Salvar mesmo assim',
        onConfirm: savePayload
      });
    } else {
      savePayload();
    }
  };

  const handleDelete = (id: string, name: string) => {
    confirmAction({
      title: 'Excluir Produto',
      message: `Excluir o produto "${name}"? Quaisquer vendas antigas continuam registradas no faturamento mas o estoque do produto será desvinculado de novos lançamentos.`,
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: () => {
        deleteProduct(id);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header element */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-50">Produtos Cadastrados</h2>
          <p className="text-xs text-gray-500 dark:text-emerald-400">Gerencie o portfólio de produtos e sua precificação.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#00C984] hover:bg-[#00b073] text-[#022A1E] px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#00c984]/20 transition-all cursor-pointer self-start sm:self-auto"
          id="btn-add-product"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Grid search and filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#122c24] p-4 rounded-xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquise por nome do produto ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none focus:ring-1 focus:ring-[#00C984] placeholder-gray-400"
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full py-2 px-3 text-sm rounded-lg bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none focus:ring-1 focus:ring-[#00C984]"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Catalog View By Category */}
      <div className="space-y-8 animate-fade-in">
        {productsByCategory.length === 0 ? (
          <div className="bg-white dark:bg-[#122c24] p-12 text-center text-gray-400 dark:text-emerald-400/50 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm">
            Nenhum produto cadastrado no BIOMATE atende a esses filtros de pesquisa.
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
                      <tr className="bg-[#F0FAF7] dark:bg-emerald-950/30 text-gray-500 dark:text-emerald-300 text-xs font-bold uppercase border-b border-light-900/10 dark:border-emerald-800/20">
                        <th className="p-3 w-16 text-center">Ícone</th>
                        <th className="p-3">Produto</th>
                        <th className="p-3 font-mono">SKU</th>
                        <th className="p-3">P. Custo</th>
                        <th className="p-3">P. Venda</th>
                        <th className="p-3 text-center">Quantidade Atual / Mínima</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupProds.map(p => {
                        const isLow = p.stock <= p.minStock;
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-emerald-900/5 dark:border-emerald-800/10 hover:bg-[#F0FAF7]/40 dark:hover:bg-emerald-950/20 text-sm text-gray-700 dark:text-emerald-100 transition-colors"
                          >
                            <td className="p-3 text-center text-xl bg-[#F8FDFC] dark:bg-emerald-950/10 rounded-l-lg">{p.imageUrl || '🧪'}</td>
                            <td className="p-3 font-bold text-gray-800 dark:text-white">
                              <div className="flex flex-col">
                                <span>{p.name}</span>
                                {p.description && (
                                  <span className="text-[11px] text-gray-500 dark:text-emerald-350 font-normal italic leading-relaxed max-w-[240px] truncate" title={p.description}>
                                    {p.description}
                                  </span>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-gray-400 font-normal">Unid: {p.unit}</span>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    p.productType === 'Insumo' 
                                      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30' 
                                      : p.productType === 'Ambos' 
                                        ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30' 
                                        : 'bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-455 border border-sky-100 dark:border-sky-900/30'
                                  }`}>
                                    {p.productType || 'Produto Final'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-xs">{p.sku}</td>
                            <td className="p-3 font-mono font-medium text-amber-800 dark:text-amber-400">
                              {formatBRL(p.costPrice, hideValues)}
                            </td>
                            <td className="p-3 font-mono font-bold text-[#00965e] dark:text-[#00C984]">
                              {formatBRL(p.price, hideValues)}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`font-mono font-bold ${isLow ? 'text-amber-600' : 'text-gray-800 dark:text-white'}`}>
                                  {p.stock}
                                </span>
                                <span className="text-gray-400 text-xs">/ {p.minStock} {p.unit}</span>
                                {isLow && (
                                  <span className="w-5 h-5 bg-amber-100 dark:bg-amber-950/40 rounded-full flex items-center justify-center text-amber-500 text-xs animate-bounce" title="Estoque crítico">
                                    ⚠️
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right rounded-r-lg">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                                  title="Editar produto"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id, p.name)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                                  title="Excluir produto"
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

      {/* CRUD Add/Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 shadow-inner overflow-y-auto">
          <div className="bg-white dark:bg-[#122c24] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-emerald-900/10 dark:border-emerald-800/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-950 pb-4">
              <h3 className="text-lg font-black text-gray-800 dark:text-emerald-50 uppercase">
                {editingId ? 'Editar Dados do Produto' : 'Cadastrar Novo Produto'}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Biomate Organic Booster"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Código SKU *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="BM-XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Unidade *</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white"
                  >
                    <option value="L">Lata / Litro (L)</option>
                    <option value="kg">Quilo (kg)</option>
                    <option value="unidades">Unidades (un)</option>
                    <option value="g">Grama (g)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1.5">Tipo do Produto *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Produto Final', 'Insumo', 'Ambos'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setProductType(type)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          productType === type
                            ? 'bg-[#00C984] text-[#022A1E] border-[#00C984] shadow-sm font-black scale-[1.02]'
                            : 'bg-[#F8FDFC] dark:bg-emerald-950/20 border-gray-200 dark:border-emerald-950 text-gray-600 dark:text-emerald-350 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs">{type}</span>
                        <span className="text-[9px] font-normal opacity-85 leading-tight">
                          {type === 'Produto Final' && 'Fabricável / Venda'}
                          {type === 'Insumo' && 'Apenas receita'}
                          {type === 'Ambos' && 'Fabricável e insumo'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Descrição do Produto</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Digite detalhes do produto, destinação, notas de qualidade..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Categoria *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Selecione o Ícone / Emoji</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    {iconOptions.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setImageUrl(icon)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border transition-all ${
                          imageUrl === icon
                            ? 'bg-[#00C984] border-[#00c984] scale-110 text-white'
                            : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Preço de Custo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Estoque Inicial ({unit}) *</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Apenas Alerta se estoque abaixo de *</label>
                  <input
                    type="number"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white font-mono"
                  />
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
                  <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
