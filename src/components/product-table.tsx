"use client";

import * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Product } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type ProductTableProps = {
  products: Product[];
  onStockChange: (productId: string, newStock: number) => void;
  onRecordSale: (productId: string, quantity: number) => { success: boolean, message: string };
};

export function ProductTable({ products, onStockChange, onRecordSale }: ProductTableProps) {
  const [activeDialog, setActiveDialog] = React.useState<
    'adjust-stock' | 'record-sale' | null
  >(null);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const { toast } = useToast();

  const handleOpenDialog = (
    dialog: 'adjust-stock' | 'record-sale',
    product: Product
  ) => {
    setSelectedProduct(product);
    setQuantity(dialog === 'adjust-stock' ? product.stock : 1);
    setActiveDialog(dialog);
  };

  const handleCloseDialog = () => {
    setActiveDialog(null);
    setSelectedProduct(null);
    setQuantity(1);
  };

  const handleAdjustStock = () => {
    if (selectedProduct) {
      onStockChange(selectedProduct.id, quantity);
      toast({ title: 'Success', description: `Stock for ${selectedProduct.name} updated to ${quantity}.` });
      handleCloseDialog();
    }
  };

  const handleRecordSale = () => {
    if (selectedProduct) {
      const result = onRecordSale(selectedProduct.id, quantity);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        handleCloseDialog();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {product.description}
                  </TableCell>
                  <TableCell>{formatPrice(product.price)}</TableCell>
                  <TableCell>
                    <Badge variant={product.stock > 10 ? 'default' : 'destructive'} className="bg-opacity-20 text-foreground">
                      {product.stock} in stock
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog('record-sale', product)}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Record Sale
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDialog('adjust-stock', product)}>
                          <Plus className="mr-2 h-4 w-4" />
                          <Minus className="absolute left-2.5 top-2.5 h-4 w-4" />
                          Adjust Stock
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!activeDialog} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeDialog === 'adjust-stock'
                ? 'Adjust Stock'
                : 'Record Sale'}{' '}
              for {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="col-span-3"
                min={activeDialog === 'record-sale' ? 1 : 0}
                max={activeDialog === 'record-sale' ? selectedProduct?.stock : undefined}
              />
            </div>
            {activeDialog === 'record-sale' && selectedProduct && (
              <div className="text-right text-lg font-semibold">
                Total: {formatPrice(selectedProduct.price * quantity)}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={activeDialog === 'adjust-stock' ? handleAdjustStock : handleRecordSale}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
