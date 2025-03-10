import { Card, Descriptions, Table, Button, Space, message, Modal, Form, Select, Input, Tag } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import InvoicePDF from '../components/InvoicePDF';
import ReactDOMServer from 'react-dom/server';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CheckOutlined, ArrowLeftOutlined, ShareAltOutlined } from '@ant-design/icons';


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

interface CompanyData {
  name: string;
  address: string;
  bank_name: string;
  bank_account: string;
  email: string;
  phone: string;
  logo_url?: string;
}

interface CustomerData {
  email: string;
  phone: string;
  address: string;
}

const InvoiceDetailContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [paymentForm] = Form.useForm();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

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
              companyData.logo_url = canvas.toDataURL('image/png');
            }
            resolve(null);
          };
          img.onerror = () => {
            console.warn('Failed to load company logo');
            companyData.logo_url = undefined;
            resolve(null);
          };
          img.src = companyData.logo_url;
        });
      }
  
      setCompanyData(companyData);
      setCustomerData(customerData);
      setIsPreviewModalVisible(true);
      
    } catch (error) {
      console.error('Error generating preview:', error);
      message.error('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  const handlePaymentSubmit = async () => {
    if (!invoice) return;
    try {
      const values = await paymentForm.validateFields();
      const updateData = {
        status: 'paid',
        payment_method: values.payment_method,
        payment_remarks: values.payment_remarks
      };

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id);

      if (error) throw error;

      message.success('Invoice marked as paid successfully');
      setIsPaymentModalVisible(false);
      paymentForm.resetFields();
      fetchInvoiceDetails();
    } catch (error) {
      console.error('Error updating payment status:', error);
      message.error('Failed to update payment status');
    }
  };

  const handleUnpaidSubmit = async () => {
    if (!invoice) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'unpaid',
          payment_method: null,
          payment_remarks: null
        })
        .eq('id', invoice.id);

      if (error) throw error;

      message.success('Invoice marked as unpaid successfully');
      fetchInvoiceDetails();
    } catch (error) {
      console.error('Error updating payment status:', error);
      message.error('Failed to update payment status');
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    try {
      setShareLoading(true);
      
      const { data, error } = await supabase
        .from('invoice_shares')
        .insert([{
          invoice_id: invoice.id,
          token: crypto.randomUUID(),
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      const shareUrl = `${window.location.origin}/hippo/invoice/share/${data.token}`;
      setPreviewUrl(shareUrl);
      setIsShareModalVisible(true);
      message.success('Share link generated successfully');
    } catch (error) {
      console.error('Error sharing invoice:', error);
      message.error('Failed to generate share link');
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/invoices')}
        >
          Back to Invoices
        </Button>

        <Card>
          <Descriptions 
            title="Invoice Details" 
            bordered 
            column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }}
          >
            <Descriptions.Item label="Invoice Number">{invoice?.invoice_number}</Descriptions.Item>
            <Descriptions.Item label="Date">{invoice?.date}</Descriptions.Item>
            <Descriptions.Item label="Due Date">{invoice?.due_date}</Descriptions.Item>
            <Descriptions.Item label="Customer">{invoice?.customer_name}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={
                invoice?.status === 'paid' ? 'success' :
                invoice?.status === 'overdue' ? 'error' :
                invoice?.status === 'sent' ? 'processing' :
                'default'
              }>
                {invoice?.status?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">{invoice?.payment_method || '-'}</Descriptions.Item>
            <Descriptions.Item label="Payment Remarks">{invoice?.payment_remarks || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Items" bodyStyle={{ padding: '0' }}>
          <div style={{ overflowX: 'auto' }}>
            <Table
            dataSource={items}
            columns={[
              {
                title: 'Description',
                dataIndex: 'description',
                key: 'description',
                ellipsis: true
              },
              {
                title: 'Quantity',
                dataIndex: 'quantity',
                key: 'quantity',
                width: 100
              },
              {
                title: 'Unit Price',
                dataIndex: 'unit_price',
                key: 'unit_price',
                width: 120,
                render: (price: number) => `$${price.toFixed(2)}`,
              },
              {
                title: 'Amount',
                dataIndex: 'amount',
                key: 'amount',
                width: 120,
                render: (amount: number) => `$${amount.toFixed(2)}`,
              },
            ]}
            pagination={false}
            summary={() => (
              <Table.Summary>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>Subtotal</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>${invoice?.subtotal.toFixed(2)}</Table.Summary.Cell>
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>Tax ({invoice?.tax_rate}%)</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>${invoice?.tax_amount.toFixed(2)}</Table.Summary.Cell>
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>Total</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>${invoice?.total.toFixed(2)}</Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
          </div>
        </Card>

        <Space wrap>
          <Button
            type="primary"
            onClick={() => handleDownloadPDF()}
            loading={loading}
          >
            Download PDF
          </Button>
          <Button
            icon={<ShareAltOutlined />}
            onClick={handleShare}
            loading={shareLoading}
          >
            Share
          </Button>
          <Button
            onClick={handlePreviewPDF}
            loading={loading}
          >
            Preview PDF
          </Button>
          <Button
            type="default"
            icon={<CheckOutlined />}
            onClick={() => invoice?.status === 'paid' ? handleUnpaidSubmit() : setIsPaymentModalVisible(true)}
          >
            {invoice?.status === 'paid' ? 'Mark as Unpaid' : 'Record Payment'}
          </Button>
        </Space>
      </Space>

      <Modal
        title={invoice?.status === 'paid' ? 'Mark as Unpaid' : 'Record Payment'}
        open={isPaymentModalVisible}
        onOk={handlePaymentSubmit}
        onCancel={() => setIsPaymentModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item
            name="payment_method"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select>
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
              <Select.Option value="credit_card">Credit Card</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="payment_remarks"
            label="Remarks"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Share Invoice"
        open={isShareModalVisible}
        onOk={() => {
          navigator.clipboard.writeText(previewUrl).then(() => {
            message.success('Share link copied to clipboard');
            setIsShareModalVisible(false);
          }).catch(() => {
            message.error('Failed to copy link to clipboard');
          });
        }}
        onCancel={() => setIsShareModalVisible(false)}
        okText="Copy Link"
      >
        <p>Share this link to allow others to view the invoice:</p>
        <Input 
          value={previewUrl} 
          readOnly 
          style={{ width: '100%' }}
        />
      </Modal>
      <Modal
        title="Preview Invoice"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        footer={null}
        width={1000}
        bodyStyle={{ padding: '20px', maxHeight: '80vh', overflow: 'auto' }}
      >
        <div style={{ padding: '20px', backgroundColor: 'white' }}>
          {companyData && customerData && <InvoicePDF
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
              address: customerData.address || '',
              email: customerData.email || '',
              phone: customerData.phone || ''
            }}
            items={items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              amount: item.amount
            }))}
          />}
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceDetailContent;