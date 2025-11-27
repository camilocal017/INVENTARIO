"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product, Sale } from "@/lib/types";
import { INITIAL_PRODUCTS } from "@/lib/data";

export function useInventoryStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1) Productos: se leen desde la API (/api/products -> Supabase) con fallback local
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products ?? []);
        } else {
          console.error("Failed to load products from API:", await res.text());
          setProducts(INITIAL_PRODUCTS);
        }
      } catch (error) {
        console.error("Failed to load products from API:", error);
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

  const updateSales = useCallback((newSales: Sale[]) => {
    setSales(newSales);
  }, []);

  const addProduct = async (product: Omit<Product, "id">) => {
    const tempId = `temp_${Date.now()}`;
    const optimistic: Product = { ...product, id: tempId };
    setProducts((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!res.ok) {
        console.error("Failed to create product in Supabase:", await res.text());
        setProducts((prev) => prev.filter((p) => p.id !== tempId));
        return;
      }

      const data = await res.json();
      const created: Product = data.product;
      setProducts((prev) =>
        prev.map((p) => (p.id === tempId ? created : p))
      );
    } catch (error) {
      console.error("Failed to create product in Supabase:", error);
      setProducts((prev) => prev.filter((p) => p.id !== tempId));
    }
  };

  const updateProductStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p
      )
    );

    // Sin esperar el resultado: sincronizamos stock con Supabase
    void fetch(`/api/products?id=${encodeURIComponent(productId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: Math.max(0, newStock) }),
    }).then(async (res) => {
      if (!res.ok) {
        console.error(
          "Failed to update product stock in Supabase:",
          await res.text()
        );
      }
    });
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
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    // Eliminamos las ventas asociadas en Supabase
    try {
      const salesRes = await fetch(
        `/api/sales?productId=${encodeURIComponent(productId)}`,
        { method: "DELETE" }
      );

      if (!salesRes.ok) {
        console.error(
          "Failed to delete related sales from Supabase:",
          await salesRes.text()
        );
        return { success: false };
      }

      const prodRes = await fetch(
        `/api/products?id=${encodeURIComponent(productId)}`,
        { method: "DELETE" }
      );

      if (!prodRes.ok) {
        console.error(
          "Failed to delete product from Supabase:",
          await prodRes.text()
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
