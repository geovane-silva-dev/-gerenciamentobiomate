export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number; // Sale price
  costPrice: number; // Production/Acquisition cost
  stock: number;
  minStock: number;
  imageUrl?: string;
  unit: string; // e.g., "kg", "unidades", "litros"
  productType?: 'Produto Final' | 'Insumo' | 'Ambos';
}

export interface Sale {
  id: string;
  date: string; // ISO String
  productId: string;
  quantity: number;
  unitPrice: number;
  customerName: string;
  totalAmount: number;
  productionCost: number; // computed at time of sale
  profit: number; // calculated as totalAmount - productionCost
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string; // e.g., "Aluguel", "Eletricidade", "Salários", "Marketing", "Insumos"
  type: 'fixo' | 'variavel';
}

export interface ProductionBatch {
  id: string;
  date: string;
  productId: string;
  quantityProduced: number;
  rawMaterialCost: number; // overall cost of raw material consumed
  responsible: string;
  status: 'Concluído' | 'Em Andamento' | 'Planejado';
}

export interface RecipeIngredient {
  productId: string; // ID check in products list
  quantityNeeded: number; // quantity per ONE unit of final product
}

export interface Recipe {
  id: string;
  productId: string; // ID check in products list
  name: string;
  ingredients: RecipeIngredient[];
}

export interface SmartProductionLog {
  id: string;
  recipeId: string;
  productId: string;
  quantityProduced: number;
  totalCost: number;
  date: string;
  responsible: string;
}

export interface UserSession {
  username: string;
  role: string;
  avatarUrl?: string;
}

export type SidebarTab =
  | 'painel'
  | 'relatorios'
  | 'estoque'
  | 'vendas'
  | 'despesas'
  | 'producao'
  | 'producao_inteligente'
  | 'categorias'
  | 'produtos';
