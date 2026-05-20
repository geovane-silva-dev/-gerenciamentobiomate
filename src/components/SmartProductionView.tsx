import React, { useState, useMemo } from 'react';
import { useBiomate } from '../context/BiomateContext';
import { Recipe, RecipeIngredient, Product } from '../types';
import { 
  Sparkles, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  Settings, 
  Play, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Undo2, 
  Info,
  Calendar,
  User,
  Activity,
  Boxes,
  TrendingDown,
  RotateCcw
} from 'lucide-react';

export default function SmartProductionView() {
  const {
    products,
    categories,
    recipes,
    smartProductionLogs,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    executeSmartProduction,
    deleteSmartProductionLog,
    hideValues
  } = useBiomate();

  const [activeSubTab, setActiveSubTab] = useState<'execute' | 'recipes' | 'logs'>('execute');
  
  // Modals / Creators state
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<Recipe | null>(null);
  
  // Recipe form state
  const [recipeProductId, setRecipeProductId] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<{ productId: string; quantityNeeded: number; tempCategoryId?: string }[]>([
    { productId: '', quantityNeeded: 1, tempCategoryId: '' }
  ]);
  const [rowSearchTerms, setRowSearchTerms] = useState<{[key: number]: string}>({});
  const [recipeError, setRecipeError] = useState('');

  // Run execution state
  const [runRecipeId, setRunRecipeId] = useState('');
  const [runQuantity, setRunQuantity] = useState<number>(10);
  const [runResponsible, setRunResponsible] = useState('Rosana');
  const [runError, setRunError] = useState('');
  const [runSuccess, setRunSuccess] = useState(false);

  // Constants
  const operators = ['Rosana', 'Geovane', 'Andrielly', 'Cristian'];

  // Categories helper
  const isIngredient = (p: Product) => p.productType === 'Insumo' || p.productType === 'Ambos' || p.categoryId === 'cat-insumos';
  
  // Available final products (not raw materials themselves)
  const finalProducts = useMemo(() => {
    return products.filter(p => !p.productType || p.productType === 'Produto Final' || p.productType === 'Ambos');
  }, [products]);

  // Available raw material ingredients
  const ingredientProducts = useMemo(() => {
    return products.filter(p => p.productType === 'Insumo' || p.productType === 'Ambos');
  }, [products]);

  // Categories that contain any ingredient products
  const categoriesWithInsumos = useMemo(() => {
    return categories.filter(c => 
      products.some(p => p.categoryId === c.id && (p.productType === 'Insumo' || p.productType === 'Ambos'))
    );
  }, [categories, products]);

  // Solver: Forecast how many batches/units can currently be produced for each recipe
  const getRecipeForecast = (recipe: Recipe) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;
    let minPossible = Infinity;
    
    recipe.ingredients.forEach(ing => {
      const ingProd = products.find(p => p.id === ing.productId);
      if (!ingProd) {
        minPossible = 0;
        return;
      }
      const possible = Math.floor(ingProd.stock / ing.quantityNeeded);
      if (possible < minPossible) {
        minPossible = possible;
      }
    });

    return minPossible === Infinity ? 0 : minPossible;
  };

  // Recipe exact cost calculation 
  const getRecipeUnitCost = (recipe: Recipe) => {
    return recipe.ingredients.reduce((sum, ing) => {
      const ingProd = products.find(p => p.id === ing.productId);
      return sum + ((ingProd?.costPrice || 0) * ing.quantityNeeded);
    }, 0);
  };

  // Automated Stats
  const stats = useMemo(() => {
    const totalRunsValue = smartProductionLogs.reduce((sum, log) => sum + log.totalCost, 0);
    const totalVolume = smartProductionLogs.reduce((sum, log) => sum + log.quantityProduced, 0);
    const lowStockIngredients = ingredientProducts.filter(p => p.stock <= p.minStock).length;
    
    // Find most produced product
    const productionCountMap: { [prodId: string]: number } = {};
    smartProductionLogs.forEach(log => {
      productionCountMap[log.productId] = (productionCountMap[log.productId] || 0) + log.quantityProduced;
    });

    let mostProducedName = 'Nenhum';
    let maxQty = 0;
    Object.entries(productionCountMap).forEach(([id, qty]) => {
      if (qty > maxQty) {
        const prod = products.find(p => p.id === id);
        if (prod) {
          mostProducedName = prod.name;
          maxQty = qty;
        }
      }
    });

    return {
      totalRunsValue,
      totalVolume,
      lowStockIngredients,
      mostProducedName,
      maxQty
    };
  }, [smartProductionLogs, products, ingredientProducts]);

  // Dynamic ingredient checklist for active execution setup
  const selectedRecipe = useMemo(() => {
    return recipes.find(r => r.id === runRecipeId) || recipes[0] || null;
  }, [runRecipeId, recipes]);

  // Set default run recipe when recipes are available
  React.useEffect(() => {
    if (recipes.length > 0 && !runRecipeId) {
      setRunRecipeId(recipes[0].id);
    }
  }, [recipes, runRecipeId]);

  // Handle open recipe modal
  const handleOpenRecipeModal = (recipeToEdit: Recipe | null = null) => {
    setRowSearchTerms({});
    if (recipeToEdit) {
      setSelectedRecipeForEdit(recipeToEdit);
      setRecipeProductId(recipeToEdit.productId);
      setRecipeName(recipeToEdit.name);
      setRecipeIngredients(recipeToEdit.ingredients.map(ing => {
        const prod = products.find(p => p.id === ing.productId);
        return {
          productId: ing.productId,
          quantityNeeded: ing.quantityNeeded,
          tempCategoryId: prod ? prod.categoryId : ''
        };
      }));
    } else {
      setSelectedRecipeForEdit(null);
      // Pick first final product that doesn't have a formula configured yet
      const missingFormulaProduct = finalProducts.find(p => !recipes.some(r => r.productId === p.id));
      setRecipeProductId(missingFormulaProduct?.id || finalProducts[0]?.id || '');
      setRecipeName('');
      
      const firstIng = ingredientProducts[0];
      setRecipeIngredients([{ 
        productId: firstIng?.id || '', 
        quantityNeeded: 1,
        tempCategoryId: firstIng?.categoryId || ''
      }]);
    }
    setRecipeError('');
    setRecipeModalOpen(true);
  };

  // Handle save recipe
  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    setRecipeError('');

    if (!recipeProductId) {
      setRecipeError('Selecione o produto final.');
      return;
    }

    if (recipeIngredients.some(ing => !ing.productId || ing.quantityNeeded <= 0)) {
      setRecipeError('Todos os insumos devem ter um produto selecionado e quantidade maior que zero.');
      return;
    }

    // Validate that no selected product is out of stock (stock <= 0)
    const outOfStockNames: string[] = [];
    recipeIngredients.forEach(ing => {
      const prod = products.find(p => p.id === ing.productId);
      if (prod && prod.stock <= 0) {
        outOfStockNames.push(prod.name);
      }
    });

    if (outOfStockNames.length > 0) {
      setRecipeError(`Não é permitido cadastrar a receita com insumos sem estoque. Insumo(s) zerado(s): ${outOfStockNames.join(', ')}. Reabasteça o lote no estoque primeiro.`);
      return;
    }

    // Check duplicate ingredients
    const subIds = recipeIngredients.map(i => i.productId);
    const hasDuplicate = subIds.length !== new Set(subIds).size;
    if (hasDuplicate) {
      setRecipeError('Não inclua o mesmo insumo mais de uma vez na receita.');
      return;
    }

    const finalProduct = products.find(p => p.id === recipeProductId);
    const finalRecipeName = recipeName.trim() || `Fórmula de ${finalProduct?.name || 'Produção'}`;

    const recipeData = {
      productId: recipeProductId,
      name: finalRecipeName,
      ingredients: recipeIngredients
    };

    if (selectedRecipeForEdit) {
      updateRecipe(selectedRecipeForEdit.id, recipeData);
    } else {
      // Avoid duplicated recipe for the same product
      const alreadyHas = recipes.some(r => r.productId === recipeProductId);
      if (alreadyHas) {
        setRecipeError(`Uma receita para ${finalProduct?.name} já existe.`);
        return;
      }
      addRecipe(recipeData);
    }

    setRecipeModalOpen(false);
  };

  // Add ingredient row to formula
  const addIngredientRow = () => {
    const firstIng = ingredientProducts[0];
    setRecipeIngredients(prev => [...prev, { 
      productId: firstIng?.id || '', 
      quantityNeeded: 1,
      tempCategoryId: firstIng?.categoryId || ''
    }]);
  };

  // Remove ingredient row from formula
  const removeIngredientRow = (index: number) => {
    if (recipeIngredients.length <= 1) return;
    setRecipeIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Update ingredient row field
  const updateIngredientRow = (index: number, fields: Partial<RecipeIngredient> & { tempCategoryId?: string }) => {
    setRecipeIngredients(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, ...fields };
      }
      return item;
    }));
  };

  // Live forecast preview inside modal 
  const getModalRecipeForecast = () => {
    if (recipeIngredients.length === 0 || recipeIngredients.some(ing => !ing.productId)) return 0;
    
    let minPossible = Infinity;
    
    recipeIngredients.forEach(ing => {
      const ingProd = products.find(p => p.id === ing.productId);
      if (!ingProd) {
        minPossible = 0;
        return;
      }
      const possible = Math.floor(ingProd.stock / ing.quantityNeeded);
      if (possible < minPossible) {
        minPossible = possible;
      }
    });

    return minPossible === Infinity ? 0 : minPossible;
  };

  // Execute Automated Run
  const handleExecuteProduction = (e: React.FormEvent) => {
    e.preventDefault();
    setRunError('');
    setRunSuccess(false);

    if (!runRecipeId) {
      setRunError('Nenhuma receita/fórmula configurada e selecionada.');
      return;
    }

    if (runQuantity <= 0) {
      setRunError('A quantidade produzida deve ser maior que zero.');
      return;
    }

    const res = executeSmartProduction(runRecipeId, runQuantity, runResponsible);
    if (!res.success) {
      setRunError(res.error || 'Ocorreu um erro ao rodar a produção automatizada.');
    } else {
      setRunSuccess(true);
      setTimeout(() => setRunSuccess(false), 5000); // clear banner automatically
    }
  };

  // Active checklist status resolver
  const runIngredientsState = useMemo(() => {
    if (!selectedRecipe) return [];
    
    return selectedRecipe.ingredients.map(ing => {
      const ingProd = products.find(p => p.id === ing.productId);
      const needed = ing.quantityNeeded * runQuantity;
      const current = ingProd ? ingProd.stock : 0;
      const hasStock = current >= needed;
      const shortage = needed - current;
      
      return {
        id: ing.productId,
        name: ingProd ? ingProd.name : 'Insumo',
        unit: ingProd ? ingProd.unit : 'unidades',
        needed,
        current,
        hasStock,
        shortage,
        icon: ingProd ? ingProd.imageUrl : '📦'
      };
    });
  }, [selectedRecipe, products, runQuantity]);

  const canExecute = useMemo(() => {
    if (runIngredientsState.length === 0) return false;
    return runIngredientsState.every(i => i.hasStock);
  }, [runIngredientsState]);

  return (
    <div className="space-y-6" id="smart-production-root">
      {/* Upper Brag header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-black text-white p-6 rounded-2xl border border-emerald-900/40 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </span>
            <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/20">MRP Automatizado</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Produção Inteligente</h1>
          <p className="text-slate-300 mt-1 max-w-xl text-sm leading-relaxed">
            Formule receitas, execute ordens com verificação automática de estoque, calcule custos em tempo real e decole seu planejamento industrial em múltiplos canais.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenRecipeModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md hover:shadow-emerald-900/30 transition-all border border-emerald-500/30 active:scale-95"
            id="btn-novas-receita"
          >
            <Plus className="w-4 h-4" /> Nova Receita
          </button>
        </div>
      </div>

      {/* MRP Quick Indicators / Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Cost Value Produced */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custo Industrial Gerado</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              {hideValues ? 'R$ ••••' : `R$ ${stats.totalRunsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Em produtos inteligentes</p>
          </div>
        </div>

        {/* Volume Produced */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-500 dark:text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lotes Concluídos</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              {stats.totalVolume.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-500">units</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Integrados 100% ao estoque</p>
          </div>
        </div>

        {/* Key Product Highlight */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-500 dark:text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item Mais Configurado</p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px] tracking-tight mt-0.5">
              {stats.mostProducedName}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {stats.maxQty > 0 ? `${stats.maxQty} unidades produzidas` : 'Nenhum ciclo automático'}
            </p>
          </div>
        </div>

        {/* Forecast depleted */}
        <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${stats.lowStockIngredients > 0 ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
          <div className={`p-3.5 rounded-xl ${stats.lowStockIngredients > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Insumos Críticos</p>
            <h3 className={`text-2xl font-bold tracking-tight mt-0.5 ${stats.lowStockIngredients > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
              {stats.lowStockIngredients} {stats.lowStockIngredients === 1 ? 'Alerta' : 'Alertas'}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Abaixo do estoque mínimo</p>
          </div>
        </div>
      </div>

      {/* Main navigation switcher tabs inside view */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveSubTab('execute')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeSubTab === 'execute' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2 px-1">
            <Play className="w-4 h-4" /> Executar Produção
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('recipes')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeSubTab === 'recipes' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2 px-1">
            <Layers className="w-4 h-4" /> Fórmulas & Receitas ({recipes.length})
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeSubTab === 'logs' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4" /> Histórico Automatizado ({smartProductionLogs.length})
          </div>
        </button>
      </div>

      {/* Action panel switcher */}
      {activeSubTab === 'execute' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form execution panel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-500" />
                Configurar Produção
              </h2>
              {selectedRecipe && (
                <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900">
                  Previsão Máxima: {getRecipeForecast(selectedRecipe)} unidades
                </span>
              )}
            </div>

            {recipes.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200/50">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Nenhuma fórmula encontrada</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Você precisa criar receitas de fabricação antes de poder utilizá-las para abater estoque automaticamente.
                </p>
                <button
                  onClick={() => handleOpenRecipeModal()}
                  className="mt-4 px-4 py-2 font-semibold text-xs text-white bg-emerald-600 rounded-lg hover:bg-emerald-500"
                >
                  Criar Primeira Receita
                </button>
              </div>
            ) : (
              <form onSubmit={handleExecuteProduction} className="space-y-4">
                {runError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2 whitespace-pre-line">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{runError}</span>
                  </div>
                )}

                {runSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-start gap-2.5 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold">Ciclo Concluído!</p>
                      <p className="text-emerald-700/85 font-normal mt-0.5">Estoque de matérias-primas deduzido e produto final incrementado com sucesso em tempo real.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Escolher Receita</label>
                  <select
                    value={runRecipeId}
                    onChange={(e) => setRunRecipeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {recipes.map(r => {
                      const prodCheck = products.find(p => p.id === r.productId);
                      return (
                        <option key={r.id} value={r.id}>
                          {r.name} ({prodCheck?.unit || 'unidades'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Qtd Produzida</label>
                    <input
                      type="number"
                      value={runQuantity || ''}
                      onChange={(e) => setRunQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Encarregado</label>
                    <select
                      value={runResponsible}
                      onChange={(e) => setRunResponsible(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedRecipe && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                      <span>Custo Unitário da Receita:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        R$ {getRecipeUnitCost(selectedRecipe).toFixed(2)} / unidade
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Custo Total de Matéria-Prima:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {hideValues ? 'R$ ••••' : `R$ ${(getRecipeUnitCost(selectedRecipe) * runQuantity).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canExecute}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${canExecute ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                >
                  <Play className={`w-4 h-4 ${canExecute ? '' : 'text-slate-400 dark:text-slate-600'}`} /> Iniciar Produção Inteligente
                </button>
              </form>
            )}
          </div>

          {/* Insumos list verification checklist panel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-7 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-500" />
              Verificação em Tempo Real do Estoque de Insumos
            </h2>
            <p className="text-xs text-slate-500">
              O painel abaixo monitora e calcula dinamicamente se você possui os materiais exigidos no estoque atual. O botão de execução só é habilitado se houver volumes suficientes.
            </p>

            {recipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Boxes className="w-12 h-12 mb-2 text-slate-300" />
                <p className="text-sm">Associe uma receita para simular itens e insumos necessários.</p>
              </div>
            ) : selectedRecipe ? (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 border-b pb-2">
                  <span>Insumo Necessário</span>
                  <span className="text-right">Demanda vs. Disponível</span>
                </div>
                {runIngredientsState.map(ing => (
                  <div key={ing.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-lg">
                        {ing.icon}
                      </span>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{ing.name}</h4>
                        <span className="text-xs text-slate-400 font-mono">Consumo: {ing.needed} {ing.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                          {ing.needed} / {ing.current}
                        </span>
                        {ing.hasStock ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Estoque seguro" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" title="Estoque insuficiente" />
                        )}
                      </div>
                      {!ing.hasStock && (
                        <p className="text-xs text-rose-500 font-medium mt-0.5 flex items-center justify-end gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Falta {ing.shortage} {ing.unit}!
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Previsão visual badge */}
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 flex gap-3 text-slate-700 dark:text-slate-300">
                  <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-bold text-indigo-800 dark:text-indigo-400 mb-0.5">Previsão Inteligente de Fornecimento:</p>
                    {getRecipeForecast(selectedRecipe) > 0 ? (
                      <span>Com base no seu estoque de insumos, você ainda pode produzir até <strong className="text-indigo-600 dark:text-indigo-300">{getRecipeForecast(selectedRecipe)} unidades</strong> de <strong>{products.find(p => p.id === selectedRecipe.productId)?.name}</strong> de forma contínua.</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Produção bloqueada! Um ou mais insumos essenciais da fórmula estão zerados ou insuficientes no estoque. Reabasteça para prosseguir.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {activeSubTab === 'recipes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Formule a composição dos seus produtos finais determinando insumos e custos agregados.</p>
            </div>
          </div>

          {recipes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-150 rounded-2xl p-6 shadow-sm">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">Não há receitas registradas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Configure a proporção ideal para dar baixa instantânea nos insumos quando fabricar.
              </p>
              <button
                onClick={() => handleOpenRecipeModal()}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500"
              >
                Cadastrar Receita
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recipes.map(recipe => {
                const finalProduct = products.find(p => p.id === recipe.productId);
                const isCritDepleted = getRecipeForecast(recipe) === 0;

                return (
                  <div
                    key={recipe.id}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-2xl shadow-sm">
                            {finalProduct?.imageUrl || '🧉'}
                          </span>
                          <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-slate-100">{finalProduct?.name}</h3>
                            <p className="text-xs font-mono text-slate-400">SKU: {finalProduct?.sku}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenRecipeModal(recipe)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            title="Editar Receita"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRecipe(recipe.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Excluir Receita"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-b border-slate-50 dark:border-slate-800/60 py-3 space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Insumos da Receita</h4>
                        {recipe.ingredients.map(ing => {
                          const item = products.find(p => p.id === ing.productId);
                          const belowMin = item ? item.stock <= item.minStock : false;
                          return (
                            <div key={ing.productId} className="flex justify-between text-xs items-center">
                              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                {item?.imageUrl} {item?.name || 'Insumo'}
                                {belowMin && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-100 dark:bg-red-950/40 text-red-600 font-bold ml-1.5 border border-red-200">
                                    Baixo Estoque!
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-slate-800 dark:text-slate-250 font-semibold">{ing.quantityNeeded} {item?.unit || 'unid'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 text-xs gap-3">
                      <div>
                        <p className="text-slate-500">Custo Total Unid. Estimado:</p>
                        <p className="font-bold text-slate-800 dark:text-stone-200 text-sm">
                          R$ {getRecipeUnitCost(recipe).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 bg-gradient-to-r text-[10px] uppercase shadow-sm ${isCritDepleted ? 'from-amber-50 to-orange-50 border border-amber-200 text-orange-600 dark:from-red-950/20 dark:to-orange-950/35' : 'from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-600 dark:from-emerald-950/25 dark:to-teal-950/25'}`}>
                          {isCritDepleted ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" /> Insumo em Falta
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> {getRecipeForecast(recipe)} Disponíveis
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              Histórico de Produção Inteligente
            </h2>
            <p className="text-xs text-slate-500 mt-1">Registros das produções processadas logicamente integrada ao estoque.</p>
          </div>

          {smartProductionLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <RotateCcw className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhum lote inteligente fabricado mecanicamente ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="px-5 py-4 text-xs tracking-wider uppercase">Data</th>
                    <th className="px-5 py-4 text-xs tracking-wider uppercase">Produto Final</th>
                    <th className="px-5 py-4 text-xs tracking-wider uppercase">Qtd Fabricada</th>
                    <th className="px-5 py-4 text-xs tracking-wider uppercase">Custo Gerado</th>
                    <th className="px-5 py-4 text-xs tracking-wider uppercase">Encarregado</th>
                    <th className="px-5 py-4 text-xs tracking-wider uppercase text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {smartProductionLogs.map(log => {
                    const finalProd = products.find(p => p.id === log.productId);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(log.date).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span>{finalProd?.imageUrl}</span>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{finalProd?.name || 'Produto'}</p>
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Fórmula de Produção</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-250">
                          {log.quantityProduced} {finalProd?.unit || 'unidades'}
                        </td>
                        <td className="px-5 py-4 font-mono text-emerald-600 font-bold">
                          {hideValues ? 'R$ ••••' : `R$ ${log.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                            <User className="w-3.5 h-3.5" />
                            {log.responsible}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => deleteSmartProductionLog(log.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
                            title="Desfazer lote e devolver insumos para estoque"
                          >
                            <Undo2 className="w-3.5 h-3.5" /> Desfazer Lote
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECEPT MODAL / FORMULA CONFIGURATION CREATOR */}
      {recipeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-150 dark:border-slate-800 bg-gradient-to-r from-slate-900 to-black text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  {selectedRecipeForEdit ? 'Editar Fórmula' : 'Cadastrar Receita de Produção'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Configure matérias primas que serão abatidas do estoque.</p>
              </div>
              <button
                onClick={() => setRecipeModalOpen(false)}
                className="p-1 px-2.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="p-6 space-y-4">
              {recipeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{recipeError}</span>
                </div>
              )}

              {/* Product selector final */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Produto Fabricado</label>
                <select
                  value={recipeProductId}
                  onChange={(e) => setRecipeProductId(e.target.value)}
                  disabled={!!selectedRecipeForEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-150 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed font-semibold"
                >
                  <option value="">Selecione o Produto Final...</option>
                  {finalProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.imageUrl} {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name formula input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Nome da Fórmula (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Tereré Completo, Biomate Mistura"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Composition lists */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Composição & Insumos Utilizados</label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 px-2 py-1.5 rounded-lg border border-emerald-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> Insumo
                  </button>
                </div>

                <div className="max-h-[340px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {recipeIngredients.map((ing, index) => {
                    const currentProd = products.find(p => p.id === ing.productId);
                    const selectedCatId = ing.tempCategoryId || currentProd?.categoryId || '';
                    const searchForThisRow = (rowSearchTerms[index] || '').trim().toLowerCase();
                    
                    const filteredIngProducts = ingredientProducts.filter(p => {
                      const matchesCategory = !selectedCatId || p.categoryId === selectedCatId;
                      const matchesSearch = !searchForThisRow || 
                        p.name.toLowerCase().includes(searchForThisRow) || 
                        p.sku.toLowerCase().includes(searchForThisRow);
                      return matchesCategory && matchesSearch;
                    });
                    
                    const currentStock = currentProd ? currentProd.stock : 0;
                    const minStock = currentProd ? currentProd.minStock : 0;
                    const isLowStock = currentProd ? (currentStock <= minStock) : false;
                    const isNoStock = currentProd ? (currentStock <= 0) : true;
                    const costPrice = currentProd ? currentProd.costPrice : 0;

                    return (
                      <div key={index} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-3.5 relative shadow-sm">
                        {recipeIngredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIngredientRow(index)}
                            className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-all"
                            title="Remover Insumo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Categoria Selector */}
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                              1. Categoria
                            </label>
                            <select
                              value={selectedCatId}
                              onChange={(e) => {
                                const newCatId = e.target.value;
                                const catProds = ingredientProducts.filter(p => !newCatId || p.categoryId === newCatId);
                                const nextProdId = catProds[0]?.id || '';
                                updateIngredientRow(index, { 
                                  productId: nextProdId,
                                  tempCategoryId: newCatId 
                                });
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">Todas as Categorias</option>
                              {categoriesWithInsumos.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Busca Inteligente Input */}
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                              2. Busca Rápida
                            </label>
                            <input
                              type="text"
                              placeholder="Filtro de busca..."
                              value={rowSearchTerms[index] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRowSearchTerms(prev => ({ ...prev, [index]: val }));
                              }}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          {/* Produto Selector (Filtered by Categoria & marked as Insumo/Ambos) */}
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                              3. Produto / Insumo
                            </label>
                            <select
                              value={ing.productId}
                              onChange={(e) => {
                                const prodId = e.target.value;
                                const prodObj = products.find(p => p.id === prodId);
                                updateIngredientRow(index, { 
                                  productId: prodId,
                                  tempCategoryId: prodObj ? prodObj.categoryId : selectedCatId
                                });
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">Selecione o Insumo...</option>
                              {filteredIngProducts.map(p => (
                                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                  {p.imageUrl} {p.name} {p.stock <= 0 ? '(SEM ESTOQUE)' : `(${p.stock} ${p.unit})`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Inventory Stats & Quantity Used input */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1.5 items-center">
                          <div className="col-span-2 flex flex-wrap gap-2">
                            {/* Stock Available Indicator */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 px-2.5 py-1.5 rounded-xl text-[11px] shadow-2xs">
                              <span className="font-semibold text-slate-405 dark:text-slate-500 uppercase text-[9px] tracking-wider">Estoque:</span>
                              {isNoStock ? (
                                <span className="font-extrabold text-rose-600 dark:text-rose-455 uppercase text-[9px] bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/30">Zerado</span>
                              ) : (
                                <span className={`font-mono font-bold ${isLowStock ? 'text-amber-500' : 'text-slate-700 dark:text-slate-250'}`}>
                                  {currentStock} {currentProd?.unit}
                                </span>
                              )}
                              {isLowStock && !isNoStock && (
                                <span className="font-extrabold text-red-500 dark:text-red-400 uppercase text-[8px] bg-red-50 dark:bg-red-950/20 px-1.5 -my-0.5 rounded border border-red-200 dark:border-red-900/40">Abaixo do Mínimo</span>
                              )}
                            </div>

                            {/* Cost item price */}
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 px-2.5 py-1.5 rounded-xl text-[11px] shadow-2xs">
                              <span className="font-semibold text-slate-405 dark:text-slate-500 uppercase text-[9px] tracking-wider">Custo Unid:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                R$ {costPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Quantity selector input */}
                          <div className="col-span-1">
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="Qtd"
                                value={ing.quantityNeeded || ''}
                                onChange={(e) => updateIngredientRow(index, { quantityNeeded: Math.max(0.001, Number(e.target.value)) })}
                                className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                min="0.001"
                                step="any"
                              />
                              {currentProd && (
                                <span className="absolute right-2 top-2 text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                                  {currentProd.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Maximum Live Forecast summary banner */}
              {recipeIngredients.length > 0 && recipeIngredients.every(ing => !!ing.productId) && (
                <div className="p-3 px-4 bg-gradient-to-r from-emerald-950/10 to-teal-950/10 dark:from-emerald-950/20 dark:to-teal-950/30 rounded-2xl border border-emerald-500/20 dark:border-emerald-800/20 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <span className="font-bold text-slate-600 dark:text-emerald-400">
                    Capacidade de produção com o estoque atual:
                  </span>
                  <span className={`font-mono font-black text-xs text-center whitespace-nowrap px-3 py-1 rounded-full ${
                    getModalRecipeForecast() === 0 
                      ? 'text-rose-600 bg-rose-100 dark:bg-rose-950/40 border border-rose-200' 
                      : getModalRecipeForecast() <= 10 
                        ? 'text-amber-500 bg-amber-100 dark:bg-amber-950/30 border border-amber-200' 
                        : 'text-[#00C984] bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-500/35'
                  }`}>
                    Você consegue produzir apenas {getModalRecipeForecast()} {finalProducts.find(p => p.id === recipeProductId)?.unit || 'unidades'}
                  </span>
                </div>
              )}

              {/* Unit cost summary preview */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 uppercase tracking-wider text-[10px] font-bold text-slate-500 dark:text-slate-400 flex justify-between items-center">
                <span>Custo Unitário Estimado:</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
                  R${' '}
                  {recipeIngredients
                    .reduce((sum, ing) => {
                      const item = products.find(p => p.id === ing.productId);
                      return sum + ((item?.costPrice || 0) * ing.quantityNeeded);
                    }, 0)
                    .toFixed(2)}
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRecipeModalOpen(false)}
                  className="flex-1 py-2 rounded-xl text-center text-xs font-bold hover:bg-slate-100 transition border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-center text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition"
                >
                  Save Recipe Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
