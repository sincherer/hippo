import { Card, Descriptions, Table, Button, Space, message, Row, Modal, Form, Select, Input } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import InvoicePDF from '../components/InvoicePDF';
import ReactDOMServer from 'react-dom/server';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import React from 'react';

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: 'unpaid' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  customer_id: string;
  company_id: string;
  customer_name?: string;
  payment_method?: string;
  payment_remarks?: string;
}

interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <Button onClick={() => this.setState({ hasError: false })}>Try again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const InvoiceDetailContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [paymentForm] = Form.useForm();

  const fetchInvoiceDetails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setInvoice({
          ...data,
          customer_name: data.customers?.name
        });
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      message.error('Failed to fetch invoice details');
    }
  }, [id]);

  const fetchInvoiceItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      message.error('Failed to fetch invoice items');
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      fetchInvoiceDetails();
      fetchInvoiceItems();
    }
  }, [id, user, fetchInvoiceDetails, fetchInvoiceItems]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    try {
      setLoading(true);
      
      // Fetch additional customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email, phone, address')
        .eq('id', invoice?.customer_id)
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
        await new Promise((resolve, reject) => {
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
              resolve(null);
            } else {
              reject(new Error('Failed to get canvas context'));
            }
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
          items={items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount
          }))}
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
        logging: false
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
      setLoading(false);

    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF');
      setLoading(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!invoice) return;
    
    try {
      setLoading(true);
      
      // Reuse the same data fetching logic as handleDownloadPDF
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email, phone, address')
        .eq('id', invoice?.customer_id)
        .single();

      if (customerError) throw customerError;

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('name, address, bank_name, bank_account, email, phone, logo_url')
        .eq('id', invoice.company_id)
        .single();

      if (companyError) throw companyError;

      // Handle logo preloading
      if (companyData.logo_url) {
        await new Promise((resolve, reject) => {
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
              companyData.logo_url = canvas.toDataURL('image/png');
              resolve(null);
            } else {
              reject(new Error('Failed to get canvas context'));
            }
          };
          img.onerror = () => {
            console.warn('Failed to load company logo');
            companyData.logo_url = undefined;
            resolve(null);
          };
          img.src = companyData.logo_url;
        });
      }

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
          items={items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount
          }))}
        />
      );

      const htmlString = ReactDOMServer.renderToString(invoicePDFComponent);

      const container = document.createElement('div');
      container.innerHTML = htmlString;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container.firstChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png', 1.0);
      setPreviewUrl(imgData);
      setIsPreviewModalVisible(true);
      setLoading(false);

    } catch (error) {
      console.error('Error generating PDF preview:', error);
      message.error('Failed to generate PDF preview');
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Description', dataIndex: 'description' },
    { title: 'Quantity', dataIndex: 'quantity' },
    { 
      title: 'Unit Price', 
      dataIndex: 'unit_price',
      render: (price: number) => `$${price.toFixed(2)}`
    },
    { 
      title: 'Amount', 
      dataIndex: 'amount',
      render: (amount: number) => `$${amount.toFixed(2)}`
    },
  ];

  if (!invoice) return null;

  interface UpdateInvoiceData {
    status: 'paid' | 'unpaid';
    payment_method?: string | null;
    payment_remarks?: string | null;
  }

  const handleStatusUpdate = async (newStatus: 'paid' | 'unpaid', paymentMethod?: string, remarks?: string) => {
    try {
      setStatusLoading(true);
      const updateData: UpdateInvoiceData = { status: newStatus };
      
      if (newStatus === 'paid') {
        updateData.payment_method = paymentMethod;
        updateData.payment_remarks = remarks;
      } else {
        updateData.payment_method = null;
        updateData.payment_remarks = null;
      }
  
      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id);
  
      if (error) throw error;
  
      message.success(`Invoice marked as ${newStatus}`);
      await fetchInvoiceDetails();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      message.error('Failed to update invoice status');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div id="invoice-content">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Row gutter={24}>
        <ArrowLeftOutlined style={{ fontSize: '18px', cursor: 'pointer' }} onClick={() => navigate(-1)} />
        <h2 style={{ margin:'0 24px' }}>{invoice.invoice_number}</h2>
      </Row>
        <Card title="Invoice Details">
          <Descriptions>
            <Descriptions.Item label="Invoice Number">{invoice.invoice_number}</Descriptions.Item>
            <Descriptions.Item label="Customer">{invoice.customer_name}</Descriptions.Item>
            <Descriptions.Item label="Date">{invoice.date}</Descriptions.Item>
            <Descriptions.Item label="Due Date">{invoice.due_date}</Descriptions.Item>
            <Descriptions.Item label="Status">{invoice.status}</Descriptions.Item>
            {invoice.status === 'paid' && (
              <>
                <Descriptions.Item label="Payment Method">{invoice.payment_method}</Descriptions.Item>
                <Descriptions.Item label="Remarks">{invoice.payment_remarks}</Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>

        <Card title="Items">
          <Table
            columns={columns}
            dataSource={items}
            pagination={false}
            rowKey="id"
            summary={() => (
              <Table.Summary>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>Subtotal</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>${invoice.subtotal.toFixed(2)}</Table.Summary.Cell>
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>Tax ({invoice.tax_rate}%)</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>${invoice.tax_amount.toFixed(2)}</Table.Summary.Cell>
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}><strong>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}><strong>${invoice.total.toFixed(2)}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Card>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Space>
            <Button type="primary" onClick={handleDownloadPDF} loading={loading}>Download PDF</Button>
            <Button onClick={handlePreviewPDF} loading={loading}>Preview PDF</Button>
            <Button 
              onClick={() => {
                if (invoice.status === 'paid') {
                  handleStatusUpdate('unpaid');
                } else {
                  setIsPaymentModalVisible(true);
                  paymentForm.resetFields();
                }
              }}
              loading={statusLoading}
              type={invoice.status === 'paid' ? 'default' : 'default'}
              icon={invoice.status === 'paid' ? null : <CheckOutlined />}
              danger={invoice.status === 'paid'}
            >
              {invoice.status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
            </Button>
          </Space>
        </Space>

        <Modal
          title="PDF Preview"
          open={isPreviewModalVisible}
          onCancel={() => setIsPreviewModalVisible(false)}
          width={1000}
          footer={[
            <Button key="close" onClick={() => setIsPreviewModalVisible(false)}>
              Close
            </Button>,
            <Button key="download" type="primary" onClick={handleDownloadPDF} loading={loading}>
              Download
            </Button>
          ]}
        >
          {previewUrl && (
            <div style={{ width: '100%', overflowX: 'auto', textAlign: 'center' }}>
              <img src={previewUrl} alt="Invoice Preview" style={{ maxWidth: '100%' }} />
            </div>
          )}
        </Modal>

        <Modal
              title="Payment Details"
              open={isPaymentModalVisible}
              onOk={() => paymentForm.submit()}
              onCancel={() => setIsPaymentModalVisible(false)}
              confirmLoading={statusLoading}
            >
              <Form
                form={paymentForm}
                layout="vertical"
                onFinish={async (values) => {
                  await handleStatusUpdate('paid', values.payment_method, values.remarks);
                  setIsPaymentModalVisible(false);
                }}
              >
                <Form.Item
                  name="payment_method"
                  label="Payment Method"
                  rules={[{ required: true, message: 'Please select payment method' }]}
                >
                  <Select>
                    <Select.Option value="cash">Cash</Select.Option>
                    <Select.Option value="check">Check</Select.Option>
                    <Select.Option value="bank">Bank Transfer</Select.Option>
                    <Select.Option value="paypal">PayPal</Select.Option>
                    <Select.Option value="cashapp">Cash App</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="remarks"
                  label="Remarks"
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Form>
            </Modal>
          
        </Space>
      </div>
    );
};

const InvoiceDetail = () => {
  return (
    <ErrorBoundary>
      <InvoiceDetailContent />
    </ErrorBoundary>
  );
};

export default InvoiceDetail;