import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc,
  deleteDoc, 
  getDoc,
  getDocs,
  runTransaction,
  writeBatch,
  query,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product, StockTransaction, Sale, Expense, ProductionBatch, Recipe, SmartProductionLog, Category, Announcement } from '../types';

/**
 * Professional transactional helper for stock adjustments.
 * This guarantees atomic correctness, avoiding state leaks or race conditions.
 */
export async function addStockMovementTransaction(
  productId: string,
  type: 'entrada' | 'saida',
  quantity: number,
  reason: string,
  operator: string,
  dateString?: string,
  customTxId?: string
): Promise<StockTransaction> {
  const productRef = doc(db, 'products', productId);
  const transactionsColl = collection(db, 'stockTransactions');
  const txRef = customTxId ? doc(db, 'stockTransactions', customTxId) : doc(transactionsColl);

  let createdTx: StockTransaction | null = null;

  await runTransaction(db, async (transaction) => {
    // 1. Fetch latest product from server to ensure fresh stock reading
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error(`Product not found with id: ${productId}`);
    }

    const currentStock = Number(productSnap.data().stock || 0);
    const nextStock = type === 'entrada' 
      ? currentStock + quantity 
      : Math.max(0, currentStock - quantity);

    console.log(`[TRANSACTION] Product stock before: ${currentStock}, Movement: ${type === 'entrada' ? '+' : '-'}${quantity}, Resulting Stock: ${nextStock}`);

    // Log the transaction
    const finalDate = dateString || new Date().toISOString();
    createdTx = {
      id: txRef.id,
      date: finalDate,
      productId,
      type,
      quantity,
      reason,
      operator
    };

    // 2. Write updates atomically
    transaction.update(productRef, { stock: nextStock });
    transaction.set(txRef, createdTx);
  });

  if (!createdTx) {
    throw new Error("Transaction execution returned empty payload.");
  }

  console.log("Firestore Movement Added:", createdTx);
  console.log("Movement Persisted Successfully");
  return createdTx;
}

/**
 * Register a sale transaction. Deducts product stock and records the sale atomically.
 */
export async function registerSaleTransaction(
  saleData: Omit<Sale, 'id' | 'date' | 'totalAmount' | 'productionCost' | 'profit'> & { date?: string },
  customSaleId?: string,
  customStockTxId?: string
): Promise<Sale> {
  const productRef = doc(db, 'products', saleData.productId);
  const saleRef = customSaleId ? doc(db, 'sales', customSaleId) : doc(collection(db, 'sales'));
  const txRef = customStockTxId ? doc(db, 'stockTransactions', customStockTxId) : doc(collection(db, 'stockTransactions'));

  let createdSale: Sale | null = null;

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error(`Product not found: ${saleData.productId}`);
    }

    const product = productSnap.data() as Product;
    const currentStock = Number(product.stock || 0);
    const quantity = Number(saleData.quantity);
    const cost = (product.costPrice || 0) * quantity;
    const totalAmount = Number(saleData.unitPrice) * quantity;
    const profit = totalAmount - cost;
    const nextStock = Math.max(0, currentStock - quantity);

    const date = saleData.date || new Date().toISOString();

    createdSale = {
      id: saleRef.id,
      date,
      productId: saleData.productId,
      quantity,
      unitPrice: Number(saleData.unitPrice),
      customerName: saleData.customerName || 'Cliente Consumidor',
      totalAmount,
      productionCost: cost,
      profit
    };

    // 1. Update product stock
    transaction.update(productRef, { stock: nextStock });

    // 2. Save sale record
    transaction.set(saleRef, createdSale);

    // 3. Create stock movement log
    const stockLog: StockTransaction = {
      id: txRef.id,
      date,
      productId: saleData.productId,
      type: 'saida',
      quantity,
      reason: `Venda - Cliente: ${createdSale.customerName}`,
      operator: 'Venda Automática'
    };
    transaction.set(txRef, stockLog);
  });

  if (!createdSale) {
    throw new Error("Sale transaction failed.");
  }

  console.log("Firestore Sale Registered atomically:", createdSale);
  return createdSale;
}

/**
 * Delete sale transaction. Restores product stock and deletes the sale record.
 */
export async function deleteSaleTransaction(saleId: string): Promise<void> {
  const saleRef = doc(db, 'sales', saleId);

  await runTransaction(db, async (transaction) => {
    const saleSnap = await transaction.get(saleRef);
    if (!saleSnap.exists()) {
      throw new Error(`Sale not found with ID: ${saleId}`);
    }

    const sale = saleSnap.data() as Sale;
    const productRef = doc(db, 'products', sale.productId);

    const productSnap = await transaction.get(productRef);
    if (productSnap.exists()) {
      const currentStock = Number(productSnap.data().stock || 0);
      const nextStock = currentStock + sale.quantity;
      transaction.update(productRef, { stock: nextStock });
    }

    // Delete sale
    transaction.delete(saleRef);

    // Write a corresponding refund movement
    const txColl = collection(db, 'stockTransactions');
    const txRef = doc(txColl);
    const refundLog: StockTransaction = {
      id: txRef.id,
      date: new Date().toISOString(),
      productId: sale.productId,
      type: 'entrada',
      quantity: sale.quantity,
      reason: `Estorno de Venda ID: ${saleId}`,
      operator: 'Sistema'
    };
    transaction.set(txRef, refundLog);
  });
}

/**
 * Execute smart recipe production transaction. Correctly registers production run,
 * increments finished product stock, and decrements ingredients stock atomically.
 */
export async function executeSmartProductionTransaction(
  recipe: Recipe,
  quantityToProduce: number,
  responsible: string,
  ingredientCostBreakdown: { id: string; cost: number; totalNeeded: number }[],
  customLogId?: string
): Promise<SmartProductionLog> {
  const resultLogRef = customLogId ? doc(db, 'smartProductionLogs', customLogId) : doc(collection(db, 'smartProductionLogs'));
  const finalProductRef = doc(db, 'products', recipe.productId);

  const totalIngredientsCost = ingredientCostBreakdown.reduce((sum, item) => sum + (item.cost * item.totalNeeded), 0);
  const unitCostPrice = quantityToProduce > 0 ? (totalIngredientsCost / quantityToProduce) : 0;

  const date = new Date().toISOString();
  let createdLog: SmartProductionLog | null = null;

  await runTransaction(db, async (transaction) => {
    // 1. Fetch and update final product
    const finalProductSnap = await transaction.get(finalProductRef);
    if (!finalProductSnap.exists()) {
      throw new Error(`recipe target product not found: ${recipe.productId}`);
    }
    const currentProdStock = Number(finalProductSnap.data().stock || 0);
    const nextProdStock = currentProdStock + quantityToProduce;

    transaction.update(finalProductRef, {
      stock: nextProdStock,
      costPrice: Number(unitCostPrice.toFixed(2))
    });

    // Create entry log for final product
    const finalProductTxRef = doc(collection(db, 'stockTransactions'));
    const finalProductTx: StockTransaction = {
      id: finalProductTxRef.id,
      date,
      productId: recipe.productId,
      type: 'entrada',
      quantity: quantityToProduce,
      reason: `Produção Inteligente - Receita: ${recipe.name}`,
      operator: responsible || 'Rosana'
    };
    transaction.set(finalProductTxRef, finalProductTx);

    // 2. Fetch and update ingredients
    for (const ing of ingredientCostBreakdown) {
      const ingRef = doc(db, 'products', ing.id);
      const ingSnap = await transaction.get(ingRef);
      if (ingSnap.exists()) {
        const currentIngStock = Number(ingSnap.data().stock || 0);
        const nextIngStock = Math.max(0, currentIngStock - ing.totalNeeded);
        transaction.update(ingRef, { stock: nextIngStock });

        // Log ingredient deduction
        const ingTxRef = doc(collection(db, 'stockTransactions'));
        const ingTx: StockTransaction = {
          id: ingTxRef.id,
          date,
          productId: ing.id,
          type: 'saida',
          quantity: ing.totalNeeded,
          reason: `Consumo na receita: ${recipe.name}`,
          operator: responsible || 'Rosana'
        };
        transaction.set(ingTxRef, ingTx);
      }
    }

    // 3. Register smart log
    createdLog = {
      id: resultLogRef.id,
      recipeId: recipe.id,
      productId: recipe.productId,
      quantityProduced: quantityToProduce,
      totalCost: totalIngredientsCost,
      date,
      responsible: responsible || 'Rosana'
    };

    transaction.set(resultLogRef, createdLog);
  });

  if (!createdLog) {
    throw new Error("Smart production transaction failed.");
  }

  return createdLog;
}

/**
 * Delete a smart production log and revert product and ingredient stock atomically.
 */
export async function deleteSmartProductionLogTransaction(
  log: SmartProductionLog,
  recipes: Recipe[]
): Promise<void> {
  const logRef = doc(db, 'smartProductionLogs', log.id);
  const recipe = recipes.find(r => r.id === log.recipeId);

  await runTransaction(db, async (transaction) => {
    // Revert final product stock
    const prodRef = doc(db, 'products', log.productId);
    const prodSnap = await transaction.get(prodRef);
    if (prodSnap.exists()) {
      const currentStock = Number(prodSnap.data().stock || 0);
      const nextStock = Math.max(0, currentStock - log.quantityProduced);
      transaction.update(prodRef, { stock: nextStock });
    }

    // Revert ingredients if recipe is available
    if (recipe) {
      for (const ing of recipe.ingredients) {
        const ingRef = doc(db, 'products', ing.productId);
        const ingSnap = await transaction.get(ingRef);
        if (ingSnap.exists()) {
          const currentIngStock = Number(ingSnap.data().stock || 0);
          const restoredStock = currentIngStock + (ing.quantityNeeded * log.quantityProduced);
          transaction.update(ingRef, { stock: restoredStock });
        }
      }
    }

    // Delete Log
    transaction.delete(logRef);
  });
}
