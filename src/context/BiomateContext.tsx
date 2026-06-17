import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category, Product, Sale, Expense, ProductionBatch, SidebarTab, Recipe, SmartProductionLog, StockTransaction, Announcement } from '../types';
import { db, auth, OperationType, handleFirestoreError, isMockFirebase } from '../firebase';
import { 
  addStockMovementTransaction,
  registerSaleTransaction,
  deleteSaleTransaction,
  executeSmartProductionTransaction,
  deleteSmartProductionLogTransaction
} from '../services/firestore';
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
  stockTransactions: StockTransaction[];
  announcements: Announcement[];

  // CRUD actions
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;

  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, prod: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;

  registerSale: (sale: Omit<Sale, 'id' | 'date' | 'totalAmount' | 'productionCost' | 'profit'> & { date?: string }) => boolean;
  deleteSale: (id: string) => void;

  registerExpense: (exp: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  registerProductionBatch: (batch: Omit<ProductionBatch, 'id' | 'date'> & { date?: string }) => void;
  deleteProductionBatch: (id: string) => void;
  concludeProductionBatch: (id: string) => void;

  addStockTransaction: (tx: Omit<StockTransaction, 'id' | 'date'> & { date?: string }) => void;
  deleteStockTransaction: (id: string) => void;

  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'> & { date?: string }) => void;
  updateAnnouncement: (id: string, announcement: Partial<Omit<Announcement, 'id'>>) => void;
  deleteAnnouncement: (id: string) => void;

  // Smart recipes and actions
  addRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  updateRecipe: (id: string, recipe: Omit<Recipe, 'id'>) => void;
  deleteRecipe: (id: string) => void;
  executeSmartProduction: (recipeId: string, quantityToProduce: number, responsible: string) => { success: boolean; error?: string };
  deleteSmartProductionLog: (id: string) => void;

  resetDatabase: () => void;

  // Authentication & Cloud Sync
  isAuthenticated: boolean;
  currentUser: any;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isCloudReady: boolean;
  authLoading: boolean;
  authError: string | null;

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => auth.currentUser !== null);
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [isCloudReady, setIsCloudReady] = useState<boolean>(false);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
  // isMockFirebase is now imported directly from firebase.ts

  // Helper to remove any 'undefined' property fields recursively so Firestore setDoc does not throw unsupported value errors
  const cleanData = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(cleanData);
    }
    if (typeof obj === 'object') {
      const clean: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== undefined) {
          clean[key] = cleanData(val);
        }
      }
      return clean;
    }
    return obj;
  };

  // Ref to track local updates and avoid real-time snapshots overwriting them with delayed state
  const localProductUpdates = React.useRef<Record<string, { stock: number; timestamp: number }>>({});

  // Ref to keep track of recently added/edited IDs to prevent them from being discarded by lagging server snapshots
  const recentlyUpdatedIds = React.useRef<Record<string, { item: any; timestamp: number }>>({});

  // Helper to register a local update/creation
  const registerLocalUpdate = (collName: string, id: string, item: any) => {
    const key = `${collName}:${id}`;
    recentlyUpdatedIds.current[key] = {
      item,
      timestamp: Date.now()
    };
    console.log(`[REALTIME MERGE] Registered local hold for ${key}`, item);
  };

  // Helper to merge the incoming Firestore snapshot list with the recently updated local list
  const mergeRealtimeList = <T extends { id: string }>(collName: string, snapshotList: T[], currentLocalList: T[]): T[] => {
    const mergedMap = new Map<string, T>();
    
    // 1. First, populate from current local state (this holds everything in memory, including any unsynced or newly created items)
    currentLocalList.forEach(item => {
      mergedMap.set(item.id, item);
    });
    
    // 2. Overwrite and enrich with latest Firestore snapshot data (the absolute source of truth)
    snapshotList.forEach(item => {
      mergedMap.set(item.id, item);
    });
    
    const result = Array.from(mergedMap.values());
    console.log(`[REALTIME MERGE] Merged ${collName}. Local count: ${currentLocalList.length}. Firestore snapshot count: ${snapshotList.length}. Merged count: ${result.length}`);
    return result;
  };

  // Firebase Firestore write helpers
  const saveDoc = async (coll: string, id: string, data: any) => {
    // Hold local records as soon as we save/update them
    const fullItem = { ...data, id };
    registerLocalUpdate(coll, id, fullItem);

    if (coll === 'products' && data && typeof data.stock === 'number') {
      localProductUpdates.current[id] = {
        stock: data.stock,
        timestamp: Date.now()
      };
      console.log(`[OPTIMISTIC HOLD] Registered local hold for product ${id}: stock = ${data.stock}`);
    }
    if (isMockFirebase || !isAuthenticated) return;
    try {
      const cleaned = cleanData(data);
      console.log("Firestore Save:", cleaned);
      await setDoc(doc(db, coll, id), cleaned, { merge: true });
    } catch (error) {
      console.error(`Error saving document to Firestore at ${coll}/${id}:`, error);
      handleFirestoreError(error, OperationType.WRITE, `${coll}/${id}`);
    }
  };

  const removeDoc = async (coll: string, id: string) => {
    if (isMockFirebase || !isAuthenticated) return;
    try {
      console.log("Firestore Delete:", id);
      await deleteDoc(doc(db, coll, id));
    } catch (error) {
      console.error(`Error deleting document from Firestore at ${coll}/${id}:`, error);
      handleFirestoreError(error, OperationType.DELETE, `${coll}/${id}`);
    }
  };

  // Save user profile state
  const saveUserProfile = async (user: any) => {
    if (isMockFirebase || !user) return;
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const userProfile = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', user.uid), userProfile);
      console.log("User profile saved successfully in Firestore users collection.");
    } catch (err: any) {
      console.warn("Could not save user profile to Firestore users collection:", err);
    }
  };

  // Google Authentication actions
  const signInWithGoogle = async () => {
    if (isMockFirebase) {
      setAuthError("Firebase está em modo mock.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      console.log("Attempting Google Sign-In with popup...");
      try {
        const result = await signInWithPopup(auth, provider);
        console.log("Successfully logged in with Google Popup:", result.user);
        await saveUserProfile(result.user);
        setAuthLoading(false);
      } catch (popupError: any) {
        console.warn("Popup blocked or failed. Attempting fallback with signInWithRedirect:", popupError);
        
        let customErrorMsg = `Popup falhou (${popupError.code || popupError.message}). `;
        
        if (popupError.code === 'auth/unauthorized-domain') {
          customErrorMsg = `Domínio não autorizado. Adicione "${window.location.hostname}" no Firebase Console -> Authentication -> Domínios Autorizados. `;
        }
        
        setAuthError(customErrorMsg + "Redirecionando para login seguro...");
        
        // Dynamic fallback fallback to redirect
        await signInWithRedirect(auth, provider);
      }
    } catch (error: any) {
      console.error("Google Authentication flow failed:", error);
      setAuthError(error.message || String(error));
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    if (isMockFirebase) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      console.log("User logged out successfully.");
    } catch (error: any) {
      console.error("Logout failed:", error);
      setAuthError(error.message || String(error));
    } finally {
      setAuthLoading(false);
    }
  };

  // Check for Redirect Result on boot
  useEffect(() => {
    if (isMockFirebase) return;
    const checkRedirect = async () => {
      try {
        const { getRedirectResult } = await import('firebase/auth');
        setAuthLoading(true);
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Google session restored via redirect:", result.user);
          await saveUserProfile(result.user);
        }
      } catch (err: any) {
        console.error("Error retrieving redirect auth result:", err);
        if (err.code === 'auth/unauthorized-domain') {
          setAuthError(`Domínio não autorizado. Adicione "${window.location.hostname}" nas configurações do Firebase Console.`);
        } else {
          setAuthError(`Falha no redirecionamento: ${err.message || String(err)}`);
        }
      } finally {
        setAuthLoading(false);
      }
    };
    checkRedirect();
  }, [isMockFirebase]);

  // Seed default data or upload local data of user to Firestore if it is a real connection and Firestore is completely empty
  useEffect(() => {
    const syncDatabaseOnStart = async () => {
      if (isMockFirebase) {
        setIsCloudReady(true);
        return;
      }
      
      // Wait until auth state is initially loaded/evaluated
      if (!authInitialized) {
        return;
      }
      
      // If auth is resolved but the user is not authenticated, we transition to locally-ready mode
      if (!isAuthenticated) {
        setIsCloudReady(true);
        return;
      }
      
      console.log("Starting secure sequential synchronization with Firebase Firestore...");
      setAuthLoading(true);
      try {
        const { getDocs, query, collection } = await import('firebase/firestore');

        // Helper to check and sync each collection individually so we never lose local data nor partial-write syncs
        const syncCollection = async (
          colName: string,
          setStateFn: (items: any[]) => void
        ) => {
          try {
            const snap = await getDocs(query(collection(db, colName)));
            console.log(`[BOOTSTRAP] Checking '${colName}'... snap.empty=${snap.empty}`);
            
            if (snap.empty) {
              console.log(`[BOOTSTRAP] Collection '${colName}' is blank in Firestore. Keeping empty.`);
              if (colName === 'categories') {
                console.log("Database Empty");
                console.log("Seed Prevented");
                console.log("Categories Loaded:", []);
              } else if (colName === 'stockTransactions') {
                console.log("History empty");
                console.log("Seed prevented");
                console.log("History loaded:", []);
              } else if (colName === 'internal_board') {
                console.log("Board Loaded:", []);
              } else {
                console.log("Firestore Load:", []);
              }
              setStateFn([]);
            } else {
              const fetchedItems: any[] = [];
              snap.forEach(d => {
                fetchedItems.push({ ...d.data(), id: d.id });
              });
              
              const docs = fetchedItems;
              // Sort to maintain correct descending orders
              if (colName === 'sales' || colName === 'productionBatches' || colName === 'smartProductionLogs' || colName === 'stockTransactions' || colName === 'internal_board') {
                fetchedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              }
              
              if (colName === 'categories') {
                console.log("Categories Loaded:", fetchedItems);
              } else if (colName === 'stockTransactions') {
                console.log("History loaded:", docs);
              } else if (colName === 'internal_board') {
                console.log("Board Loaded:", docs);
              } else {
                console.log("Firestore Load:", fetchedItems);
              }
              setStateFn(fetchedItems);
            }
          } catch (colError: any) {
            console.error(`Collection level bootstrap sync error inside '${colName}'`, colError);
          }
        };

        // Bootstrap load and sync each schema domain sequence (NO automatic seeding on start)
        await syncCollection('categories', setCategories);
        await syncCollection('products', setProducts);
        await syncCollection('sales', setSales);
        await syncCollection('expenses', setExpenses);
        await syncCollection('productionBatches', setProductionBatches);
        await syncCollection('recipes', setRecipes);
        await syncCollection('smartProductionLogs', setSmartProductionLogs);
        await syncCollection('stockTransactions', setStockTransactions);
        await syncCollection('internal_board', setAnnouncements);

        console.log("All collections synced successfully.");
      } catch (error) {
        console.error("Firestore global bootstrap operation failing: ", error);
      } finally {
        setIsCloudReady(true);
        setAuthLoading(false);
      }
    };

    syncDatabaseOnStart();
  }, [isMockFirebase, isAuthenticated, authInitialized]);

  // Auth anonymous fallback state and state listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthInitialized(true);
      if (user) {
        setIsAuthenticated(true);
        setCurrentUser(user);
        // Sync user details to Firestore if signed in with Google
        if (user && !user.isAnonymous) {
          saveUserProfile(user);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthLoading(true);
        signInAnonymously(auth).then(() => {
          setAuthLoading(false);
        }).catch((err) => {
          console.warn("Anonymous sign-in not enabled or failed:", err);
          setAuthLoading(false);
        });
      }
    });
    return unsubAuth;
  }, []);

  // Live Firestore listeners
  useEffect(() => {
    if (isMockFirebase || !isAuthenticated || !isCloudReady) return;

    console.log("Registering live synchronized Firestore listeners...");

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Category);
      });
      console.log("Realtime Snapshot categories:", snapshot);
      if (list.length > 0 || isCloudReady) {
        setCategories(list);
      }
    }, (err) => {
      console.error("onSnapshot error for categories:", err);
      handleFirestoreError(err, OperationType.GET, 'categories');
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach(d => {
        const data = d.data() as Product;
        const localHold = localProductUpdates.current[d.id];
        let finalStock = data.stock;
        
        if (localHold && (Date.now() - localHold.timestamp < 3000)) {
          console.log(`[OPTIMISTIC HOLD] Realtime Snapshot stock ${data.stock} for ${d.id}, holding local stock: ${localHold.stock} (age: ${Date.now() - localHold.timestamp}ms)`);
          finalStock = localHold.stock;
        } else if (localHold) {
          // Cleanup expired hold
          delete localProductUpdates.current[d.id];
        }
        
        list.push({ ...data, id: d.id, stock: finalStock } as Product);
      });
      console.log("Realtime Snapshot products:", snapshot);
      if (list.length > 0 || isCloudReady) {
        setProducts(list);
      }
    }, (err) => {
      console.error("onSnapshot error for products:", err);
      handleFirestoreError(err, OperationType.GET, 'products');
    });

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const list: Sale[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Sale);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log("Realtime Snapshot sales:", snapshot);
      if (list.length > 0 || isCloudReady) {
        setSales(list);
      }
    }, (err) => {
      console.error("onSnapshot error for sales:", err);
      handleFirestoreError(err, OperationType.GET, 'sales');
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const list: Expense[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Expense);
      });
      console.log("Realtime Snapshot expenses:", snapshot);
      if (list.length > 0 || isCloudReady) {
        setExpenses(list);
      }
    }, (err) => {
      console.error("onSnapshot error for expenses:", err);
      handleFirestoreError(err, OperationType.GET, 'expenses');
    });

    const unsubBatches = onSnapshot(collection(db, 'productionBatches'), (snapshot) => {
      const list: ProductionBatch[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as ProductionBatch);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log("Realtime Snapshot productionBatches:", snapshot);
      if (list.length > 0 || isCloudReady) {
        setProductionBatches(list);
      }
    }, (err) => {
      console.error("onSnapshot error for productionBatches:", err);
      handleFirestoreError(err, OperationType.GET, 'productionBatches');
    });

    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const list: Recipe[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Recipe);
      });
      console.log("Realtime Snapshot recipes:", snapshot);
      if (list.length > 0 || isCloudReady) {
        setRecipes(list);
      }
    }, (err) => {
      console.error("onSnapshot error for recipes:", err);
      handleFirestoreError(err, OperationType.GET, 'recipes');
    });

    const unsubSmartLogs = onSnapshot(collection(db, 'smartProductionLogs'), (snapshot) => {
      const list: SmartProductionLog[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as SmartProductionLog);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log("Realtime Snapshot smartProductionLogs:", snapshot);
      if (list.length > 0 || isCloudReady) {
        setSmartProductionLogs(list);
      }
    }, (err) => {
      console.error("onSnapshot error for smartProductionLogs:", err);
      handleFirestoreError(err, OperationType.GET, 'smartProductionLogs');
    });

    const unsubStockTransactions = onSnapshot(collection(db, 'stockTransactions'), (snapshot) => {
      const list: StockTransaction[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as StockTransaction);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      console.log("Realtime Snapshot stockTransactions loaded:", list);
      
      if (list.length > 0 || isCloudReady) {
        setStockTransactions(list);
      }
    }, (err) => {
      console.error("onSnapshot error for stockTransactions:", err);
      handleFirestoreError(err, OperationType.GET, 'stockTransactions');
    });

    const unsubAnnouncements = onSnapshot(collection(db, 'internal_board'), (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Announcement);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log("Realtime Board:", snapshot);
      if (list.length > 0 || isCloudReady) {
        setAnnouncements(list);
      }
    }, (err) => {
      console.error("onSnapshot error for internal_board:", err);
      handleFirestoreError(err, OperationType.GET, 'internal_board');
    });

    return () => {
      console.log("Cleaning up and unmounting Firestore live listeners...");
      unsubCategories();
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubBatches();
      unsubRecipes();
      unsubSmartLogs();
      unsubStockTransactions();
      unsubAnnouncements();
    };
  }, [isMockFirebase, isAuthenticated, isCloudReady]);

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

  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(() => {
    const local = localStorage.getItem('biomate_stock_transactions');
    return local ? JSON.parse(local) : [];
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const local = localStorage.getItem('biomate_internal_board');
    return local ? JSON.parse(local) : [];
  });

  // Persist values
  useEffect(() => {
    localStorage.setItem('biomate_internal_board', JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem('biomate_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('biomate_stock_transactions', JSON.stringify(stockTransactions));
  }, [stockTransactions]);

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
    console.log(`[deleteCategory] Called for ID: "${id}"`);
    setCategories(prev => {
      const filtered = prev.filter(c => c.id !== id);
      console.log(`[deleteCategory] Local state filtered. Remaining count: ${filtered.length}. Removals:`, prev.filter(c => c.id === id));
      return filtered;
    });
    
    console.log(`[deleteCategory] Dispatching permanent deletion from Firestore...`);
    removeDoc('categories', id);

    // Set associated products categories to empty string if deleted
    setProducts(prev => {
      console.log(`[deleteCategory] Scanning products to update associations...`);
      return prev.map(p => {
        if (p.categoryId === id) {
          console.log(`[deleteCategory] Auto-clearing category field on product: "${p.name}" (ID: ${p.id})`);
          const updatedProd = { ...p, categoryId: '' };
          saveDoc('products', p.id, updatedProd);
          return updatedProd;
        }
        return p;
      });
    });
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

  const registerSale = (saleData: Omit<Sale, 'id' | 'date' | 'totalAmount' | 'productionCost' | 'profit'> & { date?: string }) => {
    const targetProduct = products.find(p => p.id === saleData.productId);
    if (!targetProduct) return false;

    const quantity = Number(saleData.quantity);
    const cost = targetProduct.costPrice * quantity;
    const totalAmount = Number(saleData.unitPrice) * quantity;
    const profit = totalAmount - cost;

    // Pre-generate client-side real Firestore IDs
    const realSaleId = doc(collection(db, 'sales')).id;
    const realStockTxId = doc(collection(db, 'stockTransactions')).id;

    const finalSale: Sale = {
      id: realSaleId,
      date: saleData.date || new Date().toISOString(),
      productId: saleData.productId,
      quantity,
      unitPrice: Number(saleData.unitPrice),
      customerName: saleData.customerName || 'Cliente Consumidor',
      totalAmount,
      productionCost: cost,
      profit
    };

    // Optimistic product stock reduction
    setProducts(prev => prev.map(p => {
      if (p.id === saleData.productId) {
        return { ...p, stock: Math.max(0, p.stock - quantity) };
      }
      return p;
    }));

    // Optimistic sale append
    setSales(prev => [finalSale, ...prev]);

    if (isMockFirebase || !isAuthenticated) {
      console.log("Local/Mock Sale Registered:", finalSale);
      return true;
    }

    // Perform atomic transaction on the database using pre-generated IDs
    registerSaleTransaction(saleData, realSaleId, realStockTxId).then(savedSale => {
      console.log("Firestore Sale Registered atomically with pre-generated matching ID:", savedSale);
    }).catch(err => {
      console.error("Failed to complete sale transactionally:", err);
      // Revert optimistic updates on error
      setSales(prev => prev.filter(s => s.id !== realSaleId));
      setProducts(prev => prev.map(p => {
        if (p.id === saleData.productId) {
          return { ...p, stock: p.stock + quantity };
        }
        return p;
      }));
    });

    return true;
  };

  const deleteSale = (id: string) => {
    const saleToDelete = sales.find(s => s.id === id);
    if (!saleToDelete) return;

    // Optimistic revert of product stock
    setProducts(prev => prev.map(p => {
      if (p.id === saleToDelete.productId) {
        return { ...p, stock: p.stock + saleToDelete.quantity };
      }
      return p;
    }));

    // Optimistic deletion of sale
    setSales(prev => prev.filter(s => s.id !== id));

    if (isMockFirebase || !isAuthenticated) {
      console.log("Local/Mock Sale Deleted:", id);
      return;
    }

    // Execute transactional deletion
    deleteSaleTransaction(id).catch(err => {
      console.error("Failed to delete sale transactionally:", err);
      // Revert optimistic updates on error
      setSales(prev => [saleToDelete, ...prev]);
      setProducts(prev => prev.map(p => {
        if (p.id === saleToDelete.productId) {
          return { ...p, stock: Math.max(0, p.stock - saleToDelete.quantity) };
        }
        return p;
      }));
    });
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

  const registerProductionBatch = (batch: Omit<ProductionBatch, 'id' | 'date'> & { date?: string }) => {
    const newBatch: ProductionBatch = {
      ...batch,
      id: `prod-b-${Date.now()}`,
      date: batch.date || new Date().toISOString()
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

    // Pre-generate client-side real Firestore ID
    const realLogId = doc(collection(db, 'smartProductionLogs')).id;

    const finalLog: SmartProductionLog = {
      id: realLogId,
      recipeId: recipe.id,
      productId: recipe.productId,
      quantityProduced: quantityToProduce,
      totalCost: totalIngredientsCost,
      date: new Date().toISOString(),
      responsible: responsible || 'Rosana'
    };

    // Optimistically update products stock local cache
    setProducts(prev => prev.map(p => {
      if (p.id === recipe.productId) {
        return {
          ...p,
          stock: p.stock + quantityToProduce,
          costPrice: Number(unitCostPrice.toFixed(2))
        };
      }
      const ingUsage = ingredientCostBreakdown.find(item => item.id === p.id);
      if (ingUsage) {
        return {
          ...p,
          stock: Math.max(0, p.stock - ingUsage.totalNeeded)
        };
      }
      return p;
    }));

    // Optimistically append the log
    setSmartProductionLogs(prev => [finalLog, ...prev]);

    if (isMockFirebase || !isAuthenticated) {
      console.log("Local/Mock Smart Production Registered:", finalLog);
      return { success: true };
    }

    // Execute the database transaction using pre-generated ID
    executeSmartProductionTransaction(
      recipe,
      quantityToProduce,
      responsible,
      ingredientCostBreakdown,
      realLogId
    ).then(savedLog => {
      console.log("Firestore Smart Production Registered atomically with matching pre-generated ID:", savedLog);
    }).catch(err => {
      console.error("Failed to complete smart production transactionally:", err);
      // Revert optimistic updates
      setSmartProductionLogs(prev => prev.filter(l => l.id !== realLogId));
      setProducts(prev => prev.map(p => {
        if (p.id === recipe.productId) {
          return { ...p, stock: Math.max(0, p.stock - quantityToProduce) };
        }
        const ingUsage = ingredientCostBreakdown.find(item => item.id === p.id);
        if (ingUsage) {
          return { ...p, stock: p.stock + ingUsage.totalNeeded };
        }
        return p;
      }));
    });

    return { success: true };
  };

  const deleteSmartProductionLog = (id: string) => {
    const logToDelete = smartProductionLogs.find(l => l.id === id);
    if (!logToDelete) return;
    
    const recipe = recipes.find(r => r.id === logToDelete.recipeId);
    if (!recipe) return;

    // Optimistically revert product and raw material stock
    setProducts(prev => prev.map(p => {
      if (p.id === logToDelete.productId) {
        return { ...p, stock: Math.max(0, p.stock - logToDelete.quantityProduced) };
      }
      const ing = recipe.ingredients.find(i => i.productId === p.id);
      if (ing) {
        return { ...p, stock: p.stock + (ing.quantityNeeded * logToDelete.quantityProduced) };
      }
      return p;
    }));

    // Optimistically delete log from local state
    setSmartProductionLogs(prev => prev.filter(l => l.id !== id));

    if (isMockFirebase || !isAuthenticated) {
      console.log("Local/Mock Smart Production Log Deleted:", id);
      return;
    }

    // Execute transaction database operation
    deleteSmartProductionLogTransaction(logToDelete, recipes).catch(err => {
      console.log("Failed to revert smart production transactionally:", err);
      // Revert optimistic updates on error
      setSmartProductionLogs(prev => [logToDelete, ...prev]);
      setProducts(prev => prev.map(p => {
        if (p.id === logToDelete.productId) {
          return { ...p, stock: p.stock + logToDelete.quantityProduced };
        }
        const ing = recipe.ingredients.find(i => i.productId === p.id);
        if (ing) {
          return { ...p, stock: Math.max(0, p.stock - (ing.quantityNeeded * logToDelete.quantityProduced)) };
        }
        return p;
      }));
    });
  };

  const addStockTransaction = async (tx: Omit<StockTransaction, 'id' | 'date'> & { date?: string }) => {
    // Generate a valid real Firestore document ID synchronously on the client
    const realId = doc(collection(db, 'stockTransactions')).id;
    const finalTx: StockTransaction = {
      ...tx,
      id: realId,
      date: tx.date || new Date().toISOString()
    };
    
    // Optimistically update stockTransactions with the matching real ID
    setStockTransactions(prev => [finalTx, ...prev]);

    // Optimistically update product stock list state & local hold cache to avoid latency gaps
    const qty = Number(tx.quantity);
    let originalStock = 0;
    setProducts(prev => prev.map(p => {
      if (p.id === tx.productId) {
        originalStock = p.stock;
        const nextStock = tx.type === 'entrada' 
          ? p.stock + qty 
          : Math.max(0, p.stock - qty);
        
        // Register hold for real-time onSnapshot listener
        localProductUpdates.current[tx.productId] = {
          stock: nextStock,
          timestamp: Date.now()
        };
        return { ...p, stock: nextStock };
      }
      return p;
    }));

    if (isMockFirebase || !isAuthenticated) {
      console.log("Local/Mock Stock Movement Added:", finalTx);
      return;
    }

    try {
      const savedTx = await addStockMovementTransaction(
        tx.productId,
        tx.type,
        tx.quantity,
        tx.reason,
        tx.operator,
        tx.date,
        realId
      );
      
      console.log("Firestore Movement Added atomically with pre-generated matching ID:", savedTx);
    } catch (err) {
      console.error("Failed to append stock transaction transactionally:", err);
      // Revert optimistic log
      setStockTransactions(prev => prev.filter(t => t.id !== realId));
      
      // Revert optimistic product stock
      setProducts(prev => prev.map(p => {
        if (p.id === tx.productId) {
          delete localProductUpdates.current[tx.productId];
          return { ...p, stock: originalStock };
        }
        return p;
      }));
    }
  };

  const deleteStockTransaction = (id: string) => {
    console.log("Deleting history item:", id);
    setStockTransactions(prev => prev.filter(t => t.id !== id));
    removeDoc('stockTransactions', id);
  };

  const addAnnouncement = (announce: Omit<Announcement, 'id' | 'date'> & { date?: string }) => {
    const newNote: Announcement = {
      ...announce,
      id: `announce-${Date.now()}`,
      date: announce.date || new Date().toISOString()
    };
    setAnnouncements(prev => [newNote, ...prev]);
    console.log("Board Saved:", newNote);
    saveDoc('internal_board', newNote.id, newNote);
  };

  const updateAnnouncement = (id: string, updatedFields: Partial<Omit<Announcement, 'id'>>) => {
    setAnnouncements(prev => prev.map(note => {
      if (note.id === id) {
        const updated = { ...note, ...updatedFields };
        console.log("Board Saved:", updated);
        saveDoc('internal_board', id, updated);
        return updated;
      }
      return note;
    }));
  };

  const deleteAnnouncement = (id: string) => {
    console.log("Board Deleted:", id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    removeDoc('internal_board', id);
  };

  const resetDatabase = async () => {
    setCategories(DEFAULT_CATEGORIES);
    setProducts(DEFAULT_PRODUCTS);
    setSales(DEFAULT_SALES);
    setExpenses(DEFAULT_EXPENSES);
    setProductionBatches(DEFAULT_PRODUCTION_BATCHES);
    setRecipes(DEFAULT_RECIPES);
    setSmartProductionLogs(DEFAULT_SMART_LOGS);
    setStockTransactions([]);
    setAnnouncements([]);
    setClientFilter('all');
    setShowFixedExpensesToggle(true);
    setShowProductionCostToggle(true);
    setActiveTab('painel');

    if (!isMockFirebase) {
      try {
        const { getDocs, deleteDoc, doc } = await import('firebase/firestore');
        const collections = ['categories', 'products', 'sales', 'expenses', 'productionBatches', 'recipes', 'smartProductionLogs', 'stockTransactions', 'internal_board'];
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
      stockTransactions,
      announcements,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      executeSmartProduction,
      deleteSmartProductionLog,
      addStockTransaction,
      deleteStockTransaction,
      addAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      resetDatabase,
      isAuthenticated,
      currentUser,
      signInWithGoogle,
      logout,
      isCloudReady,
      authLoading,
      authError,
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
