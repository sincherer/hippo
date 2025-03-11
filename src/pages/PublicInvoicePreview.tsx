import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import InvoicePDF from '../components/InvoicePDF';
import { Spin, Result } from 'antd';
import { PDFViewer } from '@react-pdf/renderer';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax_type: string;
  tax_rate: number;
  tax_amount: number;
  total: number;
  customer_id: string;
  company_id: string;
  customer_name?: string;
  currency: string;
  notes?: string;
  customers?: {
    name: string;
  };
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
    logo_url?: string;
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
  const [customerData, setCustomerData] = useState<Customer | null>(null);


  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        // Set the share token in the database session
        await supabase.rpc('set_share_token', { input_token: shareToken });


        // Fetch invoice data using share token
        const { data: shareData, error: shareError } = await supabase
          .from('invoice_shares')
          .select('invoice_id, expires_at')
          .eq('token', shareToken)
          .maybeSingle();

        if (!shareData || shareError) {
          throw new Error('Invalid share link');
        }

        if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
          throw new Error('Share link has expired');
        }

        // Fetch invoice details
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            date,
            due_date,
            subtotal,
            tax_type,
            tax_rate,
            tax_amount,
            total,
            currency,
            notes,
            customer_id,
            company_id,
            customers (name)
          `)
          .eq('id', shareData.invoice_id)
          .single();

        if (!invoiceData || invoiceError) throw invoiceError || new Error('Invoice not found');

        // Fetch invoice items
        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', shareData.invoice_id)
          .throwOnError();

        if (itemsError) throw itemsError;

        // Fetch company details
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('name, address, bank_name, bank_account, email, phone, logo_url')
          .eq('id', invoiceData.company_id)
          .single()
          .throwOnError();

        if (companyError) throw companyError;

        // Preload and encode company logo if it exists
        if (company.logo_url) {
          try {
            await new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0);
                  company.logo_url = canvas.toDataURL('image/png');
                }
                resolve(null);
              };
              img.onerror = () => {
                console.warn('Failed to load company logo');
                company.logo_url = undefined;
                resolve(null);
              };
              img.src = company.logo_url;
            });
          } catch (error) {
            console.warn('Error processing company logo:', error);
            company.logo_url = undefined;
          }
        }

        // Fetch customer details
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('email, phone, address')
          .eq('id', invoiceData.customer_id)
          .single()
          .throwOnError();

        if (customerError) throw customerError;

        setInvoice({
          id: invoiceData.id,
          invoice_number: invoiceData.invoice_number,
          date: invoiceData.date,
          due_date: invoiceData.due_date,
          subtotal: invoiceData.subtotal,
          tax_rate: invoiceData.tax_rate,
          tax_amount: invoiceData.tax_amount,
          total: invoiceData.total,
          customer_id: invoiceData.customer_id,
          company_id: invoiceData.company_id,
          customer_name: invoiceData.customers?.[0]?.name


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

  const invoiceData = {
    invoice: {
      invoice_number: invoice.invoice_number,
      date: invoice.date,
      due_date: invoice.due_date,
      subtotal: invoice.subtotal,
      tax_type: invoice.tax_type || 'SST',
      tax_rate: invoice.tax_rate,
      tax_amount: invoice.tax_amount,
      total: invoice.total,
      currency: invoice.currency || 'MYR',
      notes: invoice.notes
    },
    company: companyData,
    customer: {
      name: invoice.customer_name || '',
      address: customerData?.address || '',
      email: customerData?.email || '',
      phone: customerData?.phone || ''
    },
    items: items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount
    }))
  };

  const fallbackRender = ({ error }: { error: Error }) => (
    <Result
      status="error"
      title="Failed to render PDF"
      subTitle={error?.message || 'An unexpected error occurred while rendering the PDF'}
    />
  );

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ReactErrorBoundary fallbackRender={fallbackRender}>
        <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }} />}>
          <PDFViewer width="100%" height="100%">
            <InvoicePDF {...invoiceData} />
          </PDFViewer>
        </Suspense>
      </ReactErrorBoundary>
    </div>
  );
};

export default PublicInvoicePreview;