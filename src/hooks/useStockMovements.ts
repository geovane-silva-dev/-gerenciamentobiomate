import { useBiomate } from '../context/BiomateContext';

/**
 * Custom hook to track real-time stock movements history.
 */
export function useStockMovements() {
  const {
    stockTransactions,
    addStockTransaction,
    deleteStockTransaction
  } = useBiomate();

  return {
    stockTransactions,
    addStockTransaction,
    deleteStockTransaction
  };
}
