import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category, Product, Sale, Expense, ProductionBatch, SidebarTab, Recipe, SmartProductionLog } from '../types';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

interface BiomateContextType {
  // Navigation & UI state
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  hideValues: boolean;
  setHideValues: (hide: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  showProductionCostToggle: boolean;
  setShowProductionCostToggle: (show: boolean) => void;
  showFixedExpensesToggle: boolean;
  setShowFixedExpensesToggle: (show: boolean) => void;
  clientFilter: string;
  setClientFilter: (client: string) => void;

  // Data state
  categories: Category[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  productionBatches: ProductionBatch[];
  recipes: Recipe[];
  smartProductionLogs: SmartProductionLog[];

  // CRUD actions
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;

  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, prod: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;

  registerSale: (sale: Omit<Sale, 'id' | 'date' | 'totalAmount' | 'productionCost' | 'profit'>) => boolean;
  deleteSale: (id: string) => void;

  registerExpense: (exp: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  registerProductionBatch: (batch: Omit<ProductionBatch, 'id' | 'date'>) => void;
  deleteProductionBatch: (id: string) => void;
  concludeProductionBatch: (id: string) => void;

  // Smart recipes and actions
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  updateRecipe: (id: string, recipe: Omit<Recipe, 'id'>) => void;
  deleteRecipe: (id: string) => void;
  executeSmartProduction: (recipeId: string, quantityToProduce: number, responsible: string) => { success: boolean; error?: string };
  deleteSmartProductionLog: (id: string) => void;

  resetDatabase: () => void;

  // Custom accessible modal confirmation helpers
  confirmConfig: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null;
  confirmAction: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }) => void;
  closeConfirm: () => void;
}

const BiomateContext = createContext<BiomateContextType | undefined>(undefined);

// Core Data Seeding
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Bioestimulantes', description: 'Produtos orgânicos que estimulam o crescimento radicular e foliar.' },
  { id: 'cat-2', name: 'Fertilizantes Foliares', description: 'Garante rápida absorção de macro e micronutrientes essenciais.' },
  { id: 'cat-3', name: 'Protetores Ecológicos', description: 'Defensores naturais que fortalecem a imunidade da lavoura.' },
  { id: 'cat-4', name: 'Corretivos de Solo', description: 'Reguladores biológicos para condicionamento de microbiota.' },
  { id: 'cat-insumos', name: 'Insumos e Embalagens', description: 'Matérias-primas e componentes manufaturados no processo de produção inteligente.' }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Biomate Max Booster',
    sku: 'BM-MAX-001',
    categoryId: 'cat-1',
    price: 185.00,
    costPrice: 55.00,
    stock: 240,
    minStock: 50,
    imageUrl: '🧪',
    unit: 'L',
    productType: 'Produto Final'
  },
  {
    id: 'prod-2',
    name: 'FitoShield Ecológico',
    sku: 'BM-FIT-002',
    categoryId: 'cat-3',
    price: 320.00,
    costPrice: 98.00,
    stock: 12, // low stock!
    minStock: 25,
    imageUrl: '🛡️',
    unit: 'L',
    productType: 'Produto Final'
  },
  {
    id: 'prod-3',
    name: 'NPK Organomineral Active',
    sku: 'BM-NPK-003',
    categoryId: 'cat-2',
    price: 115.00,
    costPrice: 38.00,
    stock: 450,
    minStock: 100,
    imageUrl: '🍂',
    unit: 'kg',
    productType: 'Produto Final'
  },
  {
    id: 'prod-4',
    name: 'Humus Humificando Solo',
    sku: 'BM-HUM-004',
    categoryId: 'cat-4',
    price: 75.00,
    costPrice: 22.00,
    stock: 80,
    minStock: 40,
    imageUrl: '🪴',
    unit: 'kg',
    productType: 'Produto Final'
  },
  {
    id: 'prod-canudo',
    name: 'Canudo Biodegradável',
    sku: 'BM-CAN-101',
    categoryId: 'cat-insumos',
    price: 0.00,
    costPrice: 0.20,
    stock: 500,
    minStock: 100,
    imageUrl: '🥤',
    unit: 'unidades',
    productType: 'Insumo'
  },
  {
    id: 'prod-erva',
    name: 'Erva-mate Premium',
    sku: 'BM-ERV-202',
    categoryId: 'cat-insumos',
    price: 0.00,
    costPrice: 6.50,
    stock: 200,
    minStock: 25,
    imageUrl: '🌿',
    unit: 'unidades',
    productType: 'Insumo'
  },
  {
    id: 'prod-adesivo',
    name: 'Adesivo Biomate Tereré',
    sku: 'BM-ADE-303',
    categoryId: 'cat-insumos',
    price: 0.00,
    costPrice: 0.30,
    stock: 600,
    minStock: 50,
    imageUrl: '🏷️',
    unit: 'unidades',
    productType: 'Insumo'
  },
  {
    id: 'prod-embalagem',
    name: 'Embalagem Reciclável',
    sku: 'BM-EMB-404',
    categoryId: 'cat-insumos',
    price: 0.00,
    costPrice: 1.50,
    stock: 300,
    minStock: 30,
    imageUrl: '📦',
    unit: 'unidades',
    productType: 'Insumo'
  },
  {
    id: 'prod-terere',
    name: 'Tereré Completo',
    sku: 'BM-TER-505',
    categoryId: 'cat-1',
    price: 35.00,
    costPrice: 8.50, // unit cost price sum: 0.2 + 6.5 + 0.3 + 1.5 = 8.50
    stock: 25,
    minStock: 50, // configured default minStock so alerts tag it beautifully
    imageUrl: '🧉',
    unit: 'unidades',
    productType: 'Produto Final'
  }
];

const DEFAULT_SALES: Sale[] = [
  { id: 'sale-1', date: '2026-05-10T14:30:00Z', productId: 'prod-1', quantity: 20, unitPrice: 185, customerName: 'Fazenda Rio Verde', totalAmount: 3700, productionCost: 1100, profit: 2600 },
  { id: 'sale-2', date: '2026-05-12T09:15:00Z', productId: 'prod-2', quantity: 5, unitPrice: 320, customerName: 'Agropecuária Sul', totalAmount: 1600, productionCost: 490, profit: 1110 },
  { id: 'sale-3', date: '2026-05-15T11:45:00Z', productId: 'prod-3', quantity: 50, unitPrice: 115, customerName: 'Sítio Novo Horizonte', totalAmount: 5750, productionCost: 1900, profit: 3850 },
  { id: 'sale-4', date: '2026-05-16T16:20:00Z', productId: 'prod-1', quantity: 15, unitPrice: 185, customerName: 'Cooperativa Orgânica', totalAmount: 2775, productionCost: 825, profit: 1950 },
  { id: 'sale-5', date: '2026-05-18T10:00:00Z', productId: 'prod-4', quantity: 30, unitPrice: 75, customerName: 'Fazenda Rio Verde', totalAmount: 2250, productionCost: 660, profit: 1590 },
  { id: 'sale-6', date: '2026-05-19T15:30:00Z', productId: 'prod-3', quantity: 12, unitPrice: 115, customerName: 'Cooperativa Orgânica', totalAmount: 1380, productionCost: 456, profit: 924 },
  { id: 'sale-7', date: '2026-05-19T17:00:00Z', productId: 'prod-terere', quantity: 5, unitPrice: 35.00, customerName: 'Geovane Silva', totalAmount: 175.00, productionCost: 42.50, profit: 132.50 },
];

const DEFAULT_EXPENSES: Expense[] = [
  { id: 'exp-1', description: 'Aluguel do Galpão Industrial', amount: 3500, date: '2026-05-01', category: 'Aluguel', type: 'fixo' },
  { id: 'exp-2', description: 'Folha de Pagamento Equipe', amount: 8200, date: '2026-05-05', category: 'Salários', type: 'fixo' },
  { id: 'exp-3', description: 'Conta de Energia Elétrica', amount: 1450, date: '2026-05-12', category: 'Utilidades', type: 'variavel' },
  { id: 'exp-4', description: 'Embalagens Ecológicas para Biomate Max', amount: 1200, date: '2026-05-14', category: 'Insumos', type: 'variavel' },
  { id: 'exp-5', description: 'Manutenção de Equipamento', amount: 950, date: '2026-05-17', category: 'Manutenção', type: 'variavel' },
  { id: 'exp-6', description: 'Assinatura Software ERP', amount: 450, date: '2026-05-02', category: 'Tecnologia', type: 'fixo' },
];

const DEFAULT_PRODUCTION_BATCHES: ProductionBatch[] = [
  { id: 'prod-b1', date: '2026-05-08T08:00:00Z', productId: 'prod-1', quantityProduced: 120, rawMaterialCost: 3500, responsible: 'Geovane', status: 'Concluído' },
  { id: 'prod-b2', date: '2026-05-11T13:00:00Z', productId: 'prod-2', quantityProduced: 15, rawMaterialCost: 1100, responsible: 'Rosana', status: 'Concluído' },
  { id: 'prod-b3', date: '2026-05-14T07:30:00Z', productId: 'prod-3', quantityProduced: 200, rawMaterialCost: 4200, responsible: 'Andrielly', status: 'Concluído' },
  { id: 'prod-b4', date: '2026-05-19T08:00:00Z', productId: 'prod-4', quantityProduced: 100, rawMaterialCost: 1500, responsible: 'Cristian', status: 'Em Andamento' },
];

const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    productId: 'prod-terere',
    name: 'Fórmulas Tereré Completo',
    ingredients: [
      { productId: 'prod-canudo', quantityNeeded: 1 },
      { productId: 'prod-erva', quantityNeeded: 1 },
      { productId: 'prod-adesivo', quantityNeeded: 1 },
      { productId: 'prod-embalagem', quantityNeeded: 1 }
    ]
  }
];

const DEFAULT_SMART_LOGS: SmartProductionLog[] = [
  {
    id: 'slog-1',
    recipeId: 'rec-1',
    productId: 'prod-terere',
    quantityProduced: 25,
    totalCost: 212.50, // 25 * 8.50
    date: '2026-05-19T10:00:00Z',
    responsible: 'Rosana'
  },
  {
    id: 'slog-2',
    recipeId: 'rec-1',
    productId: 'prod-terere',
    quantityProduced: 10,
    totalCost: 85.00,
    date: '2026-05-19T16:45:00Z',
    responsible: 'Geovane'
  }
];

export const BiomateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('painel');
  const [hideValues, setHideValues] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('biomate_theme');
    return saved ? saved === 'dark' : false;
  });
  const [showProductionCostToggle, setShowProductionCostToggle] = useState<boolean>(true);
  const [showFixedExpensesToggle, setShowFixedExpensesToggle] = useState<boolean>(true);
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Accessible custom confirmation modal states
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const confirmAction = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }) => {
    setConfirmConfig(config);
  };

  const closeConfirm = () => {
    setConfirmConfig(null);
  };

  // Firebase configuration validation
  const isMockFirebase = !db.app.options.apiKey || db.app.options.apiKey.includes('mock');

  // Firebase Firestore write helpers
  const saveDoc = async (coll: string, id: string, data: any) => {
    if (isMockFirebase) return;
    try {
      await setDoc(doc(db, coll, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${coll}/${id}`);
    }
  };

  const removeDoc = async (coll: string, id: string) => {
    if (isMockFirebase) return;
    try {
      await deleteDoc(doc(db, coll, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${coll}/${id}`);
    }
  };

  // Seed default data to Firestore if it is a real connection and is empty
  useEffect(() => {
    const seedFirestoreIfEmpty = async () => {
      if (isMockFirebase) return;
      try {
        const { getDocs, query, limit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'categories'), limit(1)));
        if (snap.empty) {
          console.log("Seeding default data to Firestore...");
          for (const cat of DEFAULT_CATEGORIES) {
            await setDoc(doc(db, 'categories', cat.id), cat);
          }
          for (const prod of DEFAULT_PRODUCTS) {
            await setDoc(doc(db, 'products', prod.id), prod);
          }
          for (const sale of DEFAULT_SALES) {
            await setDoc(doc(db, 'sales', sale.id), sale);
          }
          for (const exp of DEFAULT_EXPENSES) {
            await setDoc(doc(db, 'expenses', exp.id), exp);
          }
          for (const pb of DEFAULT_PRODUCTION_BATCHES) {
            await setDoc(doc(db, 'productionBatches', pb.id), pb);
          }
          for (const rec of DEFAULT_RECIPES) {
            await setDoc(doc(db, 'recipes', rec.id), rec);
          }
          for (const slog of DEFAULT_SMART_LOGS) {
            await setDoc(doc(db, 'smartProductionLogs', slog.id), slog);
          }
          console.log("Firestore seeding completed successfully!");
        }
      } catch (error) {
        console.warn("Seeding Firestore failed (likely unauthenticated or missing rules):", error);
      }
    };
    seedFirestoreIfEmpty();
  }, [isMockFirebase]);

  // Auth anonymous state
  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.warn("Anonymous sign-in not enabled or failed:", err);
        });
      }
    });
  }, []);

  // Live Firestore listeners
  useEffect(() => {
    if (isMockFirebase) return;

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as Category);
      });
      if (list.length > 0) {
        setCategories(list);
      }
    }, (err) => {
      console.warn("Firestore categories snap error:", err);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as Product);
      });
      if (list.length > 0) {
        setProducts(list);
      }
    }, (err) => {
      console.warn("Firestore products snap error:", err);
    });

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const list: Sale[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as Sale);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (list.length > 0) {
        setSales(list);
      }
    }, (err) => {
      console.warn("Firestore sales snap error:", err);
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const list: Expense[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as Expense);
      });
      if (list.length > 0) {
        setExpenses(list);
      }
    }, (err) => {
      console.warn("Firestore expenses snap error:", err);
    });

    const unsubBatches = onSnapshot(collection(db, 'productionBatches'), (snapshot) => {
      const list: ProductionBatch[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as ProductionBatch);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (list.length > 0) {
        setProductionBatches(list);
      }
    }, (err) => {
      console.warn("Firestore productionBatches snap error:", err);
    });

    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const list: Recipe[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as Recipe);
      });
      if (list.length > 0) {
        setRecipes(list);
      }
    }, (err) => {
      console.warn("Firestore recipes snap error:", err);
    });

    const unsubSmartLogs = onSnapshot(collection(db, 'smartProductionLogs'), (snapshot) => {
      const list: SmartProductionLog[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as SmartProductionLog);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (list.length > 0) {
        setSmartProductionLogs(list);
      }
    }, (err) => {
      console.warn("Firestore smartProductionLogs snap error:", err);
    });

    return () => {
      unsubCategories();
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubBatches();
      unsubRecipes();
      unsubSmartLogs();
    };
  }, [isMockFirebase]);

  // Load from LocalStorage or seed with default data
  const [categories, setCategories] = useState<Category[]>(() => {
    const local = localStorage.getItem('biomate_categories');
    return local ? JSON.parse(local) : DEFAULT_CATEGORIES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const local = localStorage.getItem('biomate_products');
    let loaded: Product[] = local ? JSON.parse(local) : DEFAULT_PRODUCTS;
    const catLocal = localStorage.getItem('biomate_categories');
    const loadedCategories: Category[] = catLocal ? JSON.parse(catLocal) : DEFAULT_CATEGORIES;
    const insumosCategoryIds = new Set(
      loadedCategories
        .filter(c => c.id === 'cat-insumos' || c.name.toLowerCase().includes('insumo'))
        .map(c => c.id)
    );

    loaded = loaded.map(p => {
      if (!p.productType) {
        const type = insumosCategoryIds.has(p.categoryId) ? 'Insumo' : 'Produto Final';
        return { ...p, productType: type };
      }
      return p;
    });
    return loaded;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const local = localStorage.getItem('biomate_sales');
    return local ? JSON.parse(local) : DEFAULT_SALES;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const local = localStorage.getItem('biomate_expenses');
    return local ? JSON.parse(local) : DEFAULT_EXPENSES;
  });

  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>(() => {
    const local = localStorage.getItem('biomate_production_batches');
    return local ? JSON.parse(local) : DEFAULT_PRODUCTION_BATCHES;
  });

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const local = localStorage.getItem('biomate_recipes');
    return local ? JSON.parse(local) : DEFAULT_RECIPES;
  });

  const [smartProductionLogs, setSmartProductionLogs] = useState<SmartProductionLog[]>(() => {
    const local = localStorage.getItem('biomate_smart_logs');
    return local ? JSON.parse(local) : DEFAULT_SMART_LOGS;
  });

  // Persist values
  useEffect(() => {
    localStorage.setItem('biomate_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('biomate_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('biomate_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('biomate_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('biomate_production_batches', JSON.stringify(productionBatches));
  }, [productionBatches]);

  useEffect(() => {
    localStorage.setItem('biomate_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('biomate_smart_logs', JSON.stringify(smartProductionLogs));
  }, [smartProductionLogs]);

  // Dark Mode side effects
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('biomate_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('biomate_theme', 'light');
    }
  }, [darkMode]);

  // CRUD Implementations
  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat = { ...cat, id: `cat-${Date.now()}` };
    setCategories(prev => [...prev, newCat]);
    saveDoc('categories', newCat.id, newCat);
  };

  const updateCategory = (id: string, updated: Omit<Category, 'id'>) => {
    const updatedCat = { ...updated, id };
    setCategories(prev => prev.map(c => c.id === id ? updatedCat : c));
    saveDoc('categories', id, updatedCat);
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    removeDoc('categories', id);
    // Set associated products categories to empty string if deleted
    setProducts(prev => prev.map(p => {
      if (p.categoryId === id) {
        const updatedProd = { ...p, categoryId: '' };
        saveDoc('products', p.id, updatedProd);
        return updatedProd;
      }
      return p;
    }));
  };

  const addProduct = (prod: Omit<Product, 'id'>) => {
    const newProd = { ...prod, id: `prod-${Date.now()}` };
    setProducts(prev => [...prev, newProd]);
    saveDoc('products', newProd.id, newProd);
  };

  const updateProduct = (id: string, updated: Omit<Product, 'id'>) => {
    const updatedProd = { ...updated, id };
    setProducts(prev => prev.map(p => p.id === id ? updatedProd : p));
    saveDoc('products', id, updatedProd);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    removeDoc('products', id);
  };

  const registerSale = (saleData: Omit<Sale, 'id' | 'date' | 'totalAmount' | 'productionCost' | 'profit'>) => {
    const targetProduct = products.find(p => p.id === saleData.productId);
    if (!targetProduct) return false;

    // Check inventory availability (allow fallback/selling with warnings but deduct correctly)
    const quantity = Number(saleData.quantity);
    const cost = targetProduct.costPrice * quantity;
    const totalAmount = Number(saleData.unitPrice) * quantity;
    const profit = totalAmount - cost;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      date: new Date().toISOString(),
      productId: saleData.productId,
      quantity,
      unitPrice: Number(saleData.unitPrice),
      customerName: saleData.customerName || 'Cliente Consumidor',
      totalAmount,
      productionCost: cost,
      profit
    };

    // Deduct stock
    setProducts(prev => prev.map(p => {
      if (p.id === saleData.productId) {
        const updatedProd = { ...p, stock: Math.max(0, p.stock - quantity) };
        saveDoc('products', p.id, updatedProd);
        return updatedProd;
      }
      return p;
    }));

    setSales(prev => [newSale, ...prev]);
    saveDoc('sales', newSale.id, newSale);
    return true;
  };

  const deleteSale = (id: string) => {
    const saleToDelete = sales.find(s => s.id === id);
    if (saleToDelete) {
      // Revert product stock
      setProducts(prev => prev.map(p => {
        if (p.id === saleToDelete.productId) {
          const updatedProd = { ...p, stock: p.stock + saleToDelete.quantity };
          saveDoc('products', p.id, updatedProd);
          return updatedProd;
        }
        return p;
      }));
    }
    setSales(prev => prev.filter(s => s.id !== id));
    removeDoc('sales', id);
  };

  const registerExpense = (exp: Omit<Expense, 'id'>) => {
    const newExp = { ...exp, id: `exp-${Date.now()}` };
    setExpenses(prev => [...prev, newExp]);
    saveDoc('expenses', newExp.id, newExp);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    removeDoc('expenses', id);
  };

  const registerProductionBatch = (batch: Omit<ProductionBatch, 'id' | 'date'>) => {
    const newBatch: ProductionBatch = {
      ...batch,
      id: `prod-b-${Date.now()}`,
      date: new Date().toISOString()
    };

    // Add produced quantity to inventory only if the batch is concluded
    if (batch.status === 'Concluído') {
      setProducts(prev => prev.map(p => {
        if (p.id === batch.productId) {
          const updatedProd = { ...p, stock: p.stock + Number(batch.quantityProduced) };
          saveDoc('products', p.id, updatedProd);
          return updatedProd;
        }
        return p;
      }));
    }

    setProductionBatches(prev => [newBatch, ...prev]);
    saveDoc('productionBatches', newBatch.id, newBatch);
  };

  const deleteProductionBatch = (id: string) => {
    const batch = productionBatches.find(b => b.id === id);
    if (batch && batch.status === 'Concluído') {
      // Deduct stock back
      setProducts(prev => prev.map(p => {
        if (p.id === batch.productId) {
          const updatedProd = { ...p, stock: Math.max(0, p.stock - batch.quantityProduced) };
          saveDoc('products', p.id, updatedProd);
          return updatedProd;
        }
        return p;
      }));
    }
    setProductionBatches(prev => prev.filter(b => b.id !== id));
    removeDoc('productionBatches', id);
  };

  const concludeProductionBatch = (id: string) => {
    setProductionBatches(prev => prev.map(b => {
      if (b.id === id && b.status === 'Em Andamento') {
        const updatedBatch = { ...b, status: 'Concluído' as const };
        // Convert status and update stock
        setProducts(pPrev => pPrev.map(p => {
          if (p.id === b.productId) {
            const updatedProd = { ...p, stock: p.stock + Number(b.quantityProduced) };
            saveDoc('products', p.id, updatedProd);
            return updatedProd;
          }
          return p;
        }));
        saveDoc('productionBatches', id, updatedBatch);
        return updatedBatch;
      }
      return b;
    }));
  };

  const addRecipe = (rec: Omit<Recipe, 'id'>) => {
    const newRec = { ...rec, id: `rec-${Date.now()}` };
    setRecipes(prev => [...prev, newRec]);
    saveDoc('recipes', newRec.id, newRec);
  };

  const updateRecipe = (id: string, updated: Omit<Recipe, 'id'>) => {
    const updatedRecipe = { ...updated, id };
    setRecipes(prev => prev.map(r => r.id === id ? updatedRecipe : r));
    saveDoc('recipes', id, updatedRecipe);
  };

  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    removeDoc('recipes', id);
  };

  const executeSmartProduction = (recipeId: string, quantityToProduce: number, responsible: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, error: 'Receita não encontrada.' };
    }

    const finalProduct = products.find(p => p.id === recipe.productId);
    if (!finalProduct) {
      return { success: false, error: 'Produto final não encontrado no cadastro.' };
    }

    // 1. Calculate and verify stock of all ingredients
    const missingIngredients: string[] = [];
    const ingredientCostBreakdown = recipe.ingredients.map(ing => {
      const ingProd = products.find(p => p.id === ing.productId);
      const totalNeeded = ing.quantityNeeded * quantityToProduce;
      const currentStock = ingProd ? ingProd.stock : 0;
      
      if (!ingProd || currentStock < totalNeeded) {
        const missingQty = totalNeeded - currentStock;
        const name = ingProd ? ingProd.name : 'Insumo Desconhecido';
        const unit = ingProd ? ingProd.unit : '';
        missingIngredients.push(`• ${name}: Necessário ${totalNeeded} ${unit}, disponível apenas ${currentStock} ${unit} (Falta ${missingQty} ${unit})`);
      }

      return {
        id: ing.productId,
        cost: ingProd ? ingProd.costPrice : 0,
        totalNeeded
      };
    });

    if (missingIngredients.length > 0) {
      return {
        success: false,
        error: `Estoque insuficiente para os seguintes insumos de "${finalProduct.name}":\n${missingIngredients.join('\n')}`
      };
    }

    // 2. Decrement raw materials, increment final product, update cost price
    const totalIngredientsCost = ingredientCostBreakdown.reduce((sum, item) => sum + (item.cost * item.totalNeeded), 0);
    const unitCostPrice = quantityToProduce > 0 ? (totalIngredientsCost / quantityToProduce) : 0;

    setProducts(prev => prev.map(p => {
      if (p.id === recipe.productId) {
        const updatedProd = {
          ...p,
          stock: p.stock + quantityToProduce,
          costPrice: Number(unitCostPrice.toFixed(2))
        };
        saveDoc('products', p.id, updatedProd);
        return updatedProd;
      }
      
      const ingUsage = ingredientCostBreakdown.find(item => item.id === p.id);
      if (ingUsage) {
        const updatedProd = {
          ...p,
          stock: Math.max(0, p.stock - ingUsage.totalNeeded)
        };
        saveDoc('products', p.id, updatedProd);
        return updatedProd;
      }

      return p;
    }));

    // Register smart log
    const newLog: SmartProductionLog = {
      id: `slog-${Date.now()}`,
      recipeId: recipe.id,
      productId: recipe.productId,
      quantityProduced: quantityToProduce,
      totalCost: totalIngredientsCost,
      date: new Date().toISOString(),
      responsible: responsible || 'Rosana'
    };

    setSmartProductionLogs(prev => [newLog, ...prev]);
    saveDoc('smartProductionLogs', newLog.id, newLog);

    return { success: true };
  };

  const deleteSmartProductionLog = (id: string) => {
    const logToDelete = smartProductionLogs.find(l => l.id === id);
    if (logToDelete) {
      const recipe = recipes.find(r => r.id === logToDelete.recipeId);
      if (recipe) {
        setProducts(prev => prev.map(p => {
          if (p.id === logToDelete.productId) {
            const updatedProd = {
              ...p,
              stock: Math.max(0, p.stock - logToDelete.quantityProduced)
            };
            saveDoc('products', p.id, updatedProd);
            return updatedProd;
          }
          const ing = recipe.ingredients.find(i => i.productId === p.id);
          if (ing) {
            const updatedProd = {
              ...p,
              stock: p.stock + (ing.quantityNeeded * logToDelete.quantityProduced)
            };
            saveDoc('products', p.id, updatedProd);
            return updatedProd;
          }
          return p;
        }));
      }
    }
    setSmartProductionLogs(prev => prev.filter(l => l.id !== id));
    removeDoc('smartProductionLogs', id);
  };

  const resetDatabase = async () => {
    setCategories(DEFAULT_CATEGORIES);
    setProducts(DEFAULT_PRODUCTS);
    setSales(DEFAULT_SALES);
    setExpenses(DEFAULT_EXPENSES);
    setProductionBatches(DEFAULT_PRODUCTION_BATCHES);
    setRecipes(DEFAULT_RECIPES);
    setSmartProductionLogs(DEFAULT_SMART_LOGS);
    setClientFilter('all');
    setShowFixedExpensesToggle(true);
    setShowProductionCostToggle(true);
    setActiveTab('painel');

    if (!isMockFirebase) {
      try {
        const { getDocs, deleteDoc, doc } = await import('firebase/firestore');
        const collections = ['categories', 'products', 'sales', 'expenses', 'productionBatches', 'recipes', 'smartProductionLogs'];
        for (const colName of collections) {
          const snap = await getDocs(collection(db, colName));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, colName, d.id));
          }
        }
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(db, 'categories', cat.id), cat);
        }
        for (const prod of DEFAULT_PRODUCTS) {
          await setDoc(doc(db, 'products', prod.id), prod);
        }
        for (const sale of DEFAULT_SALES) {
          await setDoc(doc(db, 'sales', sale.id), sale);
        }
        for (const exp of DEFAULT_EXPENSES) {
          await setDoc(doc(db, 'expenses', exp.id), exp);
        }
        for (const pb of DEFAULT_PRODUCTION_BATCHES) {
          await setDoc(doc(db, 'productionBatches', pb.id), pb);
        }
        for (const rec of DEFAULT_RECIPES) {
          await setDoc(doc(db, 'recipes', rec.id), rec);
        }
        for (const slog of DEFAULT_SMART_LOGS) {
          await setDoc(doc(db, 'smartProductionLogs', slog.id), slog);
        }
      } catch (err) {
        console.warn("Resetting Firestore database failed:", err);
      }
    }
  };

  return (
    <BiomateContext.Provider value={{
      activeTab,
      setActiveTab,
      hideValues,
      setHideValues,
      darkMode,
      setDarkMode,
      showProductionCostToggle,
      setShowProductionCostToggle,
      showFixedExpensesToggle,
      setShowFixedExpensesToggle,
      clientFilter,
      setClientFilter,
      categories,
      products,
      sales,
      expenses,
      productionBatches,
      addCategory,
      updateCategory,
      deleteCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      registerSale,
      deleteSale,
      registerExpense,
      deleteExpense,
      registerProductionBatch,
      deleteProductionBatch,
      concludeProductionBatch,
      recipes,
      smartProductionLogs,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      executeSmartProduction,
      deleteSmartProductionLog,
      resetDatabase,
      confirmConfig,
      confirmAction,
      closeConfirm
    }}>
      {children}
    </BiomateContext.Provider>
  );
};

export const useBiomate = () => {
  const context = useContext(BiomateContext);
  if (context === undefined) {
    throw new Error('useBiomate must be used within a BiomateProvider');
  }
  return context;
};
