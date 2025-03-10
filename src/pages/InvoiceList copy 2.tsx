import { Button, Space, Tag, message, Row, Col, Card, Avatar, Segmented } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import InvoicePDF from '../components/InvoicePDF';
import ReactDOMServer from 'react-dom/server';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  customer_id: string;
  company_id: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  user_id: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  customer_name?: string;
  company_name?: string;
  company_logo?: string;
}

const InvoiceList = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    return invoice.status.toLowerCase() === filter.toLowerCase();
  });
  
  const fetchInvoices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name),
          companies (name, logo_url)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      if (data) {
        setInvoices(data.map(invoice => ({
          ...invoice,
          customer_name: invoice.customers?.name,
          company_name: invoice.companies?.name,
          company_logo: invoice.companies?.logo_url
        })));
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to fetch invoices');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user, fetchInvoices]);

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      setLoading(prev => ({ ...prev, [invoice.id]: true }));
      
      // Fetch invoice items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) throw itemsError;

      // Fetch additional customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email, phone, address')
        .eq('id', invoice.customer_id)
        .single();

      if (customerError) throw customerError;

      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('name, address, bank_name, bank_account')
        .eq('id', invoice.company_id)
        .single();

      if (companyError) throw companyError;

      // Render InvoicePDF component to string
      const invoicePDFComponent = (
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
            email: customerData?.email || '',
            phone: customerData?.phone || '',
            address: customerData?.address || ''
          }}
          items={items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount
          })) || []}
        />
      );

      // Convert component to HTML string
      const htmlString = ReactDOMServer.renderToString(invoicePDFComponent);

      // Create a temporary container
      const container = document.createElement('div');
      container.innerHTML = htmlString;
      document.body.appendChild(container);

      // Use html2canvas to capture the rendered component
      const canvas = await html2canvas(container.firstChild as HTMLElement);
      document.body.removeChild(container);

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoice.invoice_number}.pdf`);

      message.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF');
    } finally {
      setLoading(prev => ({ ...prev, [invoice.id]: false }));
    }
  };

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%', marginTop: '24px' }} size="large"/>
      <Space direction="horizontal" align="center" style={{ width: '100%', marginTop: '24px', justifyContent: 'space-between' }} size="large">
      <h2 style={{ margin: 8 }}>Invoices</h2> 
      <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
      Create Invoice</Button></Space>
      <Space direction="vertical" style={{ width: '100%', marginTop: '24px' }} size="large"></Space>
        <Segmented
          options={[
            { label: 'All', value: 'all' },
            { label: 'Paid', value: 'paid' },
            { label: 'Unpaid', value: 'unpaid' }
          ]}
          value={filter}
          onChange={value => setFilter(value.toString())}
        />
        
     
      <Space direction="vertical" style={{ width: '100%', marginTop: '24px' }} size="large"></Space>
      <div style={{ marginBottom: 16 }}>
      </div>
      <Row gutter={[16, 16]}>
        {filteredInvoices.map(invoice => (
          <Col xs={24} key={invoice.id}>
            <Card
              hoverable
              actions={[
                <Link to={`/invoices/${invoice.id}`} key="view">View</Link>,
                <Button 
                  type="link" 
                  onClick={() => handleDownloadPDF(invoice)}
                  loading={loading[invoice.id]}
                  key="download"
                >
                  Download
                </Button>
              ]}
            >
              <Card.Meta
                avatar={invoice.company_logo ? <Avatar size={64} src={invoice.company_logo} /> : null}
                title={<Space direction="vertical" size={0}>
                  <div>{invoice.invoice_number}</div>
                  <Tag color={invoice.status === 'paid' ? 'green' : 'orange'}>
                    {invoice.status.toUpperCase()}
                  </Tag>
                </Space>}
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <strong>Customer:</strong> {invoice.customer_name}
                    </div>
                    <div>
                      <strong>Date:</strong> {invoice.date}
                    </div>
                    <div>
                      <strong>Amount:</strong> ${invoice.total.toFixed(2)}
                    </div>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default InvoiceList;