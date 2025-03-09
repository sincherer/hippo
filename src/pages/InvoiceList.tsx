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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
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
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

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
        .select('name, address, bank_name, bank_account, email, phone, logo_url')
        .eq('id', invoice.company_id)
        .single();

      if (companyError) throw companyError;

      // Preload company logo if exists
      if (companyData.logo_url) {
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Create a canvas to properly encode the image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              // Update the logo URL with properly encoded data
              companyData.logo_url = canvas.toDataURL('image/png');
            }
            resolve(null);
          };
          img.onerror = () => {
            console.warn('Failed to load company logo');
            companyData.logo_url = undefined; // Remove the logo URL if it fails to load
            resolve(null); // Resolve anyway to continue with PDF generation
          };
          img.src = companyData.logo_url;
        });
      }

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
            address: customerData?.address || '',
            email: customerData?.email || '',
            phone: customerData?.phone || '',
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
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      // Wait for a short moment to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use html2canvas with better options
      const canvas = await html2canvas(container.firstChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000, // Increase timeout for image loading
        onclone: (clonedDoc) => {
          // Ensure all images are loaded in the cloned document
          const images = clonedDoc.getElementsByTagName('img');
          Array.from(images).forEach(img => {
            img.crossOrigin = 'anonymous';
          });
        }
      });
      document.body.removeChild(container);

      // Create PDF from canvas with proper image format handling
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

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

  const handleDelete = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvoice) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      message.success('Invoice deleted successfully');
      setDeleteModalVisible(false);
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      message.error('Failed to delete invoice');
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
                </Button>,
                <Button 
                  type="link" 
                  danger 
                  onClick={() => handleDelete(invoice)}
                  key="delete"
                >
                  Delete
                </Button>
              ]}
            >
              <Card.Meta
                avatar={invoice.company_logo ? (
                  <Avatar size={64} src={invoice.company_logo} />
                ) : (
                  <Avatar size={64} style={{ backgroundColor: '#1890ff' }}>
                    {invoice.company_name ? invoice.company_name.charAt(0).toUpperCase() : '?'}
                  </Avatar>
                )}
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

      <Modal
        title="Delete Invoice"
        open={deleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this invoice? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default InvoiceList;