import { useBiomate } from '../context/BiomateContext';

/**
 * Custom hook to access product catalog and inventory stock state.
 */
export function useInventory() {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    hideValues
  } = useBiomate();

  return {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    hideValues
  };
}
