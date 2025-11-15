import { useState, useEffect, useCallback } from 'react';
import { columnConfigService } from '../services/columnConfigService';

export const useProducts = (tenantId?: string) => {
  const [products, setProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Load products from Supabase as the single source of truth
  useEffect(() => {
    const loadProductsFromSupabase = async () => {
      if (!tenantId) return;

      try {
        setIsLoading(true);
        const configs = await columnConfigService.getColumnConfigurations(tenantId);
        const uniqueProducts = [...new Set(configs.map(c => c.product_name))];
        console.log('🔄 Loaded products from Supabase:', uniqueProducts);
        setProducts(uniqueProducts);
        if (uniqueProducts.length > 0 && !selectedProduct) {
          setSelectedProduct(uniqueProducts[0]);
        }
      } catch (error) {
        console.error('Error loading products from Supabase:', error);
        // Fallback to empty array if database fails
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductsFromSupabase();
  }, [tenantId]);

  // Update selectedProduct if it's not in the list
  useEffect(() => {
    if (products.length > 0 && !products.includes(selectedProduct)) {
      setSelectedProduct(products[0]);
    }
  }, [products, selectedProduct]);

  // Save products to localStorage whenever they change (for backward compatibility)
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('companyProducts', JSON.stringify(products));
    }
  }, [products]);

  const addProduct = useCallback(async (name: string, tenantId: string) => {
    if (products.includes(name.trim())) {
      throw new Error('Product already exists');
    }

    try {
      setIsLoading(true);
      const updatedProducts = [...products, name.trim()];
      setProducts(updatedProducts);
      setSelectedProduct(name.trim());

      // Initialize default columns for the new product
      await columnConfigService.initializeDefaultColumns(tenantId, name.trim());

      return true;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [products]);

  const updateProduct = useCallback(async (oldName: string, newName: string, tenantId: string) => {
    if (products.includes(newName.trim()) && newName.trim() !== oldName) {
      throw new Error('Product already exists');
    }

    try {
      setIsLoading(true);
      const updatedProducts = products.map(p => p === oldName ? newName.trim() : p);
      setProducts(updatedProducts);
      setSelectedProduct(newName.trim());
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [products]);

  const deleteProduct = useCallback(async (productName: string, tenantId: string) => {
    try {
      setIsLoading(true);

      // Delete from database first
      await columnConfigService.deleteProductConfigurations(tenantId, productName);

      // Update local state
      const updatedProducts = products.filter(p => p !== productName);
      setProducts(updatedProducts);
      setSelectedProduct(updatedProducts[0] || '');

      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [products]);

  return {
    products,
    selectedProduct,
    setSelectedProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    isLoading,
  };
};