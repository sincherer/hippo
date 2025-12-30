interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
}

interface Item {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  taxId?: string;
  logo?: string;
}

interface Invoice {
  id: string;
  timestamp: string;
  customerId: string;
  items: {
    id: string;
    quantity: number;
    price: number;
    description?: string;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  dueDate: string;
}

export type { Customer, Item, CompanyInfo, Invoice };