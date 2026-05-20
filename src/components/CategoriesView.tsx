import React, { useState, useMemo } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { Category } from '../types';
import { Plus, Search, Pencil, Trash2, Save, X, Tags } from 'lucide-react';

export default function CategoriesView() {
  const {
    categories,
    products,
    addCategory,
    updateCategory,
    deleteCategory,
    confirmAction
  } = useBiomate();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search filter
  const filteredCategories = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Map product count per category
  const productCounts = useMemo(() => {
    const counts: { [catId: string]: number } = {};
    categories.forEach(c => {
      counts[c.id] = products.filter(p => p.categoryId === c.id).length;
    });
    return counts;
  }, [categories, products]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setErrorMsg('O nome da categoria é obrigatório.');
      return;
    }

    if (editingId) {
      updateCategory(editingId, { name, description });
    } else {
      addCategory({ name, description });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const associatedCount = productCounts[id] || 0;
    if (associatedCount > 0) {
      alert(`Não é possível excluir a categoria "${name}" pois existem ${associatedCount} produto(s) vinculado(s) a ela. Por favor, reatribua a categoria desses produtos antes de excluí-la.`);
      return;
    }

    confirmAction({
      title: 'Excluir Categoria Organizacional',
      message: `Tem certeza que deseja desinstalar ou excluir a categoria de insumos "${name}"?`,
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: () => {
        deleteCategory(id);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-emerald-50">Categorias Organizacionais</h2>
          <p className="text-xs text-gray-500 dark:text-emerald-400">Classificação integrada de produtos biológicos e indicadores.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#00C984] hover:bg-[#00b073] text-[#022A1E] px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#00c984]/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Search Header */}
      <div className="bg-white dark:bg-[#122c24] p-4 rounded-xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquise por nome da categoria ou palavras-chaves..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-[#F0FAF7] dark:bg-emerald-950/40 text-gray-700 dark:text-white border-none focus:outline-none focus:ring-1 focus:ring-[#00C984]"
          />
        </div>
      </div>

      {/* Grid view of Category items for responsive touch feeling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#122c24] p-8 text-center text-gray-400 rounded-xl border border-gray-100 dark:border-emerald-950">
            Nenhuma categoria localizada. Cadastre uma nova categoria para começar a organizar seus insumos ecológicos!
          </div>
        ) : (
          filteredCategories.map(c => {
            const count = productCounts[c.id] || 0;
            return (
              <div
                key={c.id}
                className="bg-white dark:bg-[#122c24] p-5 rounded-2xl border border-emerald-900/5 dark:border-emerald-800/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 bg-[#E5FAF2] dark:bg-emerald-950/50 rounded-lg text-emerald-800 dark:text-[#00C984]">
                      <Tags className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-emerald-950/40 text-gray-500 dark:text-emerald-300">
                      {count} {count === 1 ? 'produto' : 'produtos'}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-base">{c.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-emerald-400 mt-1.5 leading-relaxed">
                    {c.description || 'Nenhuma descrição providenciada.'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50 dark:border-emerald-950/40">
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 shadow-inner">
          <div className="bg-white dark:bg-[#122c24] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-900/10 dark:border-emerald-800/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-950 pb-4">
              <h3 className="text-lg font-black text-gray-800 dark:text-emerald-50 uppercase">
                {editingId ? 'Editar Categoria' : 'Nova Categoria de Insumos'}
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
                <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Micropreparados de Enxofre"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-emerald-400 mb-1">Descrição</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva as aplicações ou escopo dessa categoria técnica."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-emerald-950 bg-[#F8FDFC] dark:bg-emerald-950/20 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00C984] resize-none"
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
                  <span>{editingId ? 'Salvar Alterações' : 'Criar Categoria'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
