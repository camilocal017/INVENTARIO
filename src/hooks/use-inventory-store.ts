"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product, Sale } from "@/lib/types";
import { INITIAL_PRODUCTS } from "@/lib/data";

const PRODUCTS_STORAGE_KEY = "kitchen-command-products";

export function useInventoryStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1) Productos: se leen de localStorage (con fallback a INITIAL_PRODUCTS)
      try {
        const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
        if (storedProducts) {
          setProducts(JSON.parse(storedProducts));
        } else {
          setProducts(INITIAL_PRODUCTS);
          localStorage.setItem(
            PRODUCTS_STORAGE_KEY,
            JSON.stringify(INITIAL_PRODUCTS)
          );
        }
      } catch (error) {
        console.error("Failed to access localStorage:", error);
        setProducts(INITIAL_PRODUCTS);
      }

      // 2) Ventas: se leen desde la API (/api/sales -> Supabase)
      try {
        const res = await fetch("/api/sales");
        if (res.ok) {
          const data = await res.json();
          setSales(data.sales ?? []);
        } else {
          console.error(
            "Failed to load sales from API:",
            await res.text()
          );
        }
      } catch (error) {
        console.error("Failed to load sales from API:", error);
      }

      setIsInitialized(true);
    };

    void init();
  }, []);

  const updateProducts = useCallback((newProducts: Product[]) => {
    setProducts(newProducts);
    try {
      localStorage.setItem(
        PRODUCTS_STORAGE_KEY,
        JSON.stringify(newProducts)
      );
    } catch (error) {
      console.error("Failed to save products to localStorage:", error);
    }
  }, []);

  const updateSales = useCallback((newSales: Sale[]) => {
    setSales(newSales);
  }, []);

  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct: Product = { ...product, id: `prod_${Date.now()}` };
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
    if (!product) return { success: false, message: "Product not found" };
    if (product.stock < quantity)
      return { success: false, message: "Not enough stock" };

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      productId,
      productName: product.name,
      quantity,
      totalAmount: product.price * quantity,
      date: new Date().toISOString(),
    };

    // Actualizamos UI inmediatamente
    updateProductStock(productId, product.stock - quantity);
    updateSales([newSale, ...sales]);

    // Sin cambiar la firma de la función: sincronizamos con Supabase "en segundo plano"
    (async () => {
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSale),
        });

        if (!res.ok) {
          console.error(
            "Failed to persist sale in Supabase:",
            await res.text()
          );
        }
      } catch (error) {
        console.error("Failed to persist sale in Supabase:", error);
      }
    })();

    return { success: true, message: "Sale recorded successfully" };
  };

  const deleteSale = async (saleId: string) => {
    try {
      const res = await fetch(`/api/sales?id=${encodeURIComponent(saleId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error(
          "Failed to delete sale in Supabase:",
          await res.text()
        );
        return false;
      }

      setSales((prev) => prev.filter((sale) => sale.id !== saleId));
      return true;
    } catch (error) {
      console.error("Failed to delete sale in Supabase:", error);
      return false;
    }
  };

  const removeProduct = async (productId: string) => {
    // Quitamos las ventas relacionadas y el producto del estado inmediatamente
    setSales((prev) => prev.filter((s) => s.productId !== productId));
    setProducts((prev) => {
      const filtered = prev.filter((p) => p.id !== productId);
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(filtered));
      } catch (error) {
        console.error("Failed to save products to localStorage:", error);
      }
      return filtered;
    });

    // Eliminamos las ventas asociadas en Supabase
    try {
      const res = await fetch(
        `/api/sales?productId=${encodeURIComponent(productId)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        console.error(
          "Failed to delete related sales from Supabase:",
          await res.text()
        );
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to delete related sales from Supabase:", error);
      return { success: false };
    }
  };

  return {
    isInitialized,
    products,
    sales,
    addProduct,
    updateProductStock,
    recordSale,
    deleteSale,
    removeProduct,
  };
}
