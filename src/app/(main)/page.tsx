"use client";

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import { ProductTable } from '@/components/product-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AddProductForm } from '@/components/add-product-form';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { isInitialized, products, addProduct, updateProductStock, recordSale } = useInventoryStore();
  const [isAddDialogOpen, setAddDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = (product: Omit<Product, 'id'>) => {
    addProduct(product);
  };
  
  if (!isInitialized) {
    return (
      <>
        <PageHeader title="Dashboard">
           <Skeleton className="h-10 w-40" />
           <Skeleton className="h-10 w-32" />
        </PageHeader>
        <main className="flex-1 p-4 sm:p-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Products">
        <div className="relative ml-auto flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </PageHeader>
      <main className="flex-1 p-4 sm:p-6">
        <ProductTable products={filteredProducts} onStockChange={updateProductStock} onRecordSale={recordSale} />
      </main>

      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Fill in the details for the new kitchen implement.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <AddProductForm
              onAddProduct={handleAddProduct}
              onFinished={() => setAddDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
