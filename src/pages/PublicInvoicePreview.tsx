import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import InvoicePDF from '../components/InvoicePDF';
import { Spin, Result } from 'antd';

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  customer_id: string;
  company_id: string;
  customer_name?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Company {
    name: string;
    address: string;
    bank_name: string;
    bank_account: string;
    email: string;
    phone: string;
    logo_url?: string; // 可选
  }
  
  interface Customer {
    email: string;
    phone: string;
    address: string;
  }
  

const PublicInvoicePreview = () => {
  const { shareToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [customerData, setCustomerData] = useState<Customer | null >(null);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        // Fetch invoice data using share token
        const { data: shareData, error: shareError } = await supabase
          .from('invoice_shares')
          .select('invoice_id')
          .eq('token', shareToken)
          .single();

        if (shareError) throw new Error('Invalid or expired share link');

        // Fetch invoice details
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            *,
            customers (name)
          `)
          .eq('id', shareData.invoice_id)
          .single();

        if (invoiceError) throw invoiceError;

        // Fetch invoice items
        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', shareData.invoice_id);

        if (itemsError) throw itemsError;

        // Fetch company details
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('name, address, bank_name, bank_account, email, phone, logo_url')
          .eq('id', invoiceData.company_id)
          .single();

        if (companyError) throw companyError;

        // Fetch customer details
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('email, phone, address')
          .eq('id', invoiceData.customer_id)
          .single();

        if (customerError) throw customerError;

        setInvoice({
          ...invoiceData,
          customer_name: invoiceData.customers?.name
        });
        setItems(itemsData || []);
        setCompanyData(company);
        setCustomerData(customer);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        setError(error instanceof Error ? error.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    if (shareToken) {
      fetchInvoiceData();
    }
  }, [shareToken]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !invoice || !companyData || !customerData) {
    return (
      <Result
        status="error"
        title="Failed to load invoice"
        subTitle={error || 'The invoice could not be found or has expired'}
      />
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <InvoicePDF
        invoice={{
          invoice_number: invoice.invoice_number,
          date: invoice.date,
          due_date: invoice.due_date,
          subtotal: invoice.subtotal,
          tax_rate: invoice.tax_rate,
          tax_amount: invoice.tax_amount,
          total: invoice.total
        }}
        company={companyData}
        customer={{
          name: invoice.customer_name || '',
          address: customerData?.address || '',
          email: customerData?.email || '',
          phone: customerData?.phone || ''
        }}
        items={items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount
        }))}
      />
    </div>
  );
};

export default PublicInvoicePreview;