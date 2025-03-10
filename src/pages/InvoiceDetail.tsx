import { Card, Descriptions, Table, Button, Space, message as antdMessage, Modal, Form, Select, Input, Tag } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import InvoicePDF from '../components/InvoicePDF';
import * as ReactPDF from '@react-pdf/renderer';
import { ArrowLeftOutlined, ShareAltOutlined } from '@ant-design/icons';
import { PDFViewer } from '@react-pdf/renderer';


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
  const [previewUrl] = useState<string>('');
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
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
      antdMessage.error('Failed to fetch invoice details');
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
      antdMessage.error('Failed to fetch invoice items');
    }
  }, [id]);

  useEffect(() => {
    if (id && user && id !== 'new') {
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

      // Create PDF document
      const pdfContent = (
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

      // Use react-pdf's pdf method to generate PDF
      const blob = await ReactPDF.pdf(pdfContent).toBlob();
      const url = URL.createObjectURL(blob);
      
      // Create a link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);

      antdMessage.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      antdMessage.error('Failed to generate PDF');
    } finally {
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

      setCompanyData(companyData);
      setCustomerData(customerData);
      setIsPreviewModalVisible(true);
    } catch (error) {
      console.error('Error preparing PDF preview:', error);
      antdMessage.error('Failed to prepare PDF preview');
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

      antdMessage.success('Invoice marked as paid successfully');
      setIsPaymentModalVisible(false);
      paymentForm.resetFields();
      fetchInvoiceDetails();
    } catch (error) {
      console.error('Error updating payment status:', error);
      antdMessage.error('Failed to update payment status');
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

      antdMessage.success('Invoice marked as unpaid successfully');
      fetchInvoiceDetails();
    } catch (error) {
      console.error('Error updating payment status:', error);
      antdMessage.error('Failed to update payment status');
    }
  };

  const handleWhatsAppShare = async () => {
    if (!invoice) return;

    try {
      setShareLoading(true);
      
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

      // Create PDF document
      const pdfContent = (
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

      // Generate PDF blob
      const blob = await ReactPDF.pdf(pdfContent).toBlob();
      const file = new File([blob], `invoice-${invoice.invoice_number}.pdf`, { type: 'application/pdf' });

      // Create a message with company details
      const message = `Invoice #${invoice.invoice_number} from ${companyData.name}\n\n`
        + `Amount: $${invoice.total.toFixed(2)}\n`
        + `Due Date: ${invoice.due_date}`;

      // Check if the browser supports the Web Share API with files
      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Invoice #${invoice.invoice_number}`,
            text: message
          });
          antdMessage.success('Invoice shared successfully');
        } catch (error) {
          console.error('Error sharing via Web Share API:', error);
          // Fallback to WhatsApp Web link
          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        }
      } else {
        // Fallback to WhatsApp Web link
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      antdMessage.error('Failed to share invoice via WhatsApp');
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

        <Space wrap>
          {invoice?.status === 'unpaid' && (
            <Button
              type="primary"
              onClick={() => setIsPaymentModalVisible(true)}
            >
              Mark as Paid
            </Button>
          )}    

          {invoice?.status === 'paid' && (
            <Button
              type="primary"
              onClick={handleUnpaidSubmit}
            >
              Mark as unpaid
            </Button>
          )} 

          <Button
            type="default"
            onClick={handlePreviewPDF}
            loading={loading}
          >
            Preview
          </Button>
          <Button
            onClick={handleDownloadPDF}
            loading={loading}
          >
            Download
          </Button>
          <Button
            type="default"
            icon={<ShareAltOutlined />}
            onClick={handleWhatsAppShare}
            loading={shareLoading}
          >
            Share via WhatsApp
          </Button>
        </Space>

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

        

        <Card title="Items" styles={{ body: { padding: '0' } }}>
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
        

        

        {companyData && (
          <Card title="Company Information" style={{ marginTop: '24px' }}>
            <Descriptions bordered column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }}>
              <Descriptions.Item label="Company Name">{companyData.name}</Descriptions.Item>
              <Descriptions.Item label="Address">{companyData.address}</Descriptions.Item>
              <Descriptions.Item label="Phone">{companyData.phone}</Descriptions.Item>
              <Descriptions.Item label="Email">{companyData.email}</Descriptions.Item>
              <Descriptions.Item label="Bank Name">{companyData.bank_name}</Descriptions.Item>
              <Descriptions.Item label="Bank Account">{companyData.bank_account}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}
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
            antdMessage.success('Share link copied to clipboard');
            setIsShareModalVisible(false);
          }).catch(() => {
            antdMessage.error('Failed to copy link to clipboard');
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
        width="100%"
        style={{ top: 20 }}
        footer={null}
      >
        {invoice && companyData && customerData && (
          <PDFViewer style={{ width: '100%', height: '90vh' }}>
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
                name: invoice?.customer_name || '',
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
          </PDFViewer>
        )}
      </Modal>
    </div>
  );
};

export default InvoiceDetailContent;