"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Product, Sale } from '@/lib/types';
import { INITIAL_PRODUCTS } from '@/lib/data';

const PRODUCTS_STORAGE_KEY = 'kitchen-command-products';
const SALES_STORAGE_KEY = 'kitchen-command-sales';

export function useInventoryStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
      }

      const storedSales = localStorage.getItem(SALES_STORAGE_KEY);
      if (storedSales) {
        setSales(JSON.parse(storedSales));
      }
    } catch (error) {
      console.error("Failed to access localStorage:", error);
      setProducts(INITIAL_PRODUCTS);
    }
    setIsInitialized(true);
  }, []);

  const updateProducts = useCallback((newProducts: Product[]) => {
    setProducts(newProducts);
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(newProducts));
    } catch (error) {
      console.error("Failed to save products to localStorage:", error);
    }
  }, []);

  const updateSales = useCallback((newSales: Sale[]) => {
    setSales(newSales);
     try {
      localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(newSales));
    } catch (error) {
      console.error("Failed to save sales to localStorage:", error);
    }
  }, []);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: `prod_${Date.now()}` };
    updateProducts([...products, newProduct]);
  };

  const updateProductStock = (productId: string, newStock: number) => {
    const newProducts = products.map((p) =>
      p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p
    );
    updateProducts(newProducts);
  };

  const recordSale = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return { success: false, message: 'Product not found' };
    if (product.stock < quantity) return { success: false, message: 'Not enough stock' };

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      productId,
      productName: product.name,
      quantity,
      totalAmount: product.price * quantity,
      date: new Date().toISOString(),
    };

    updateProductStock(productId, product.stock - quantity);
    updateSales([newSale, ...sales]);
    return { success: true, message: 'Sale recorded successfully' };
  };

  return {
    isInitialized,
    products,
    sales,
    addProduct,
    updateProductStock,
    recordSale,
  };
}
