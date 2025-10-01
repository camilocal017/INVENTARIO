export type Product = {
  id: string;
  name: string;
  description: string;
  stock: number;
  price: number;
};

export type Sale = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  date: string;
};
