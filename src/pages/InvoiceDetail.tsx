import { Card, Descriptions, Table, Button, Space, message, Modal, Form, Select, Input, Tag, Segmented, Dropdown, Menu } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import InvoicePDF from '../components/InvoicePDF';
import PaymentSection from '../components/PaymentSection';
import * as ReactPDF from '@react-pdf/renderer';
import { ArrowLeftOutlined, ShareAltOutlined,  DownloadOutlined, MoreOutlined } from '@ant-design/icons';
import { PDFViewer } from '@react-pdf/renderer';


interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: 'unpaid' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_type: string;
  tax_rate: number;
  tax_amount: number;
  total: number;
  customer_id: string;
  company_id: string;
  customer_name?: string;
  payment_method?: string;
  payment_remarks?: string;
  currency: string;
  notes: string;
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

interface PaymentRecord {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_remarks?: string;
}

const InvoiceDetailContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('invoice');
  const [paymentForm] = Form.useForm();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);




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

        // Fetch company data
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('name, address, bank_name, bank_account, email, phone, logo_url')
          .eq('id', data.company_id)
          .single();

        if (companyError) throw companyError;
        setCompanyData(companyData);

        // Fetch customer data
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('email, phone, address')
          .eq('id', data.customer_id)
          .single();

        if (customerError) throw customerError;
        setCustomerData(customerData);
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

  const fetchPayments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      message.error('Failed to fetch payment records');
    }
  }, [id]);

  useEffect(() => {
    if (id && user && id !== 'new') {
      fetchInvoiceDetails();
      fetchInvoiceItems();
      fetchPayments();
    }
  }, [id, user, fetchInvoiceDetails, fetchInvoiceItems, fetchPayments]);

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
            tax_type: invoice.tax_type,
            tax_rate: invoice.tax_rate,
            tax_amount: invoice.tax_amount,
            currency: invoice.currency,
            total: invoice.total,
            notes: invoice.notes
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

      message.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  /*======================Preview PDF SPOILEDDDD===================//
  const handlePreviewPDF = async () => {
    if (!invoice) return;
    
    try {
      setLoading(true);
  
      // Debugging: Log invoice ID
      console.log("Invoice ID:", invoice.id);
  
      const { data: shareData, error: shareError } = await supabase
        .rpc('generate_share_token', { invoice_id: invoice.id });
  
      if (shareError) {
        console.error('Supabase RPC Error:', shareError);
        throw new Error(shareError.message);
      }
  
      console.log("Share Token Data:", shareData);

     
  
      // Open the public preview in a new window
      const previewUrl = `/preview/${shareData.token}`;
      window.open(previewUrl, '_blank');
    } catch (error) {
      console.error('Error preparing PDF preview:', error);
      message.error('Failed to prepare PDF preview');
    } finally {
      setLoading(false);
    }
  };
   */


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

  const handleWhatsAppShare = async () => {
    if (!invoice || !companyData || !customerData) return;

    try {
      setLoading(true);
      
      // Create PDF document
      const pdfContent = (
        <InvoicePDF
          invoice={{
            invoice_number: invoice.invoice_number,
            date: invoice.date,
            due_date: invoice.due_date,
            subtotal: invoice.subtotal,
            tax_type: invoice.tax_type,
            tax_rate: invoice.tax_rate,
            tax_amount: invoice.tax_amount,
            currency: invoice.currency,
            total: invoice.total,
            notes: invoice.notes
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
        />
      );

      // Generate PDF blob
      const blob = await ReactPDF.pdf(pdfContent).toBlob();
      const pdfFile = new File([blob], `invoice-${invoice.invoice_number}.pdf`, { type: 'application/pdf' });

      // Format the message with invoice details
      const messageText = `Invoice #${invoice.invoice_number} from ${companyData.name}\n\n`
        + `Amount: ${invoice.currency} ${invoice.total.toFixed(2)}\n`
        + `Due Date: ${invoice.due_date}\n\n`
        + `Please contact us for any questions:\n`
        + `Phone: ${companyData.phone}\n`
        + `Email: ${companyData.email}`;

      // Check if the Web Share API is available and supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Invoice #${invoice.invoice_number}`,
          text: messageText
        });
        message.success('Invoice shared successfully');
      } else {
        // Fallback to traditional WhatsApp sharing
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
        window.open(whatsappUrl, '_blank');

        // Also trigger PDF download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoice.invoice_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success('Invoice downloaded and shared via WhatsApp');
      }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      message.error('Failed to share invoice via WhatsApp');
    } finally {
      setLoading(false);
    }
  };


  //handle delete invoice===============================//
  const handleDelete = () => {
    setDeleteModalVisible(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!invoice) return;
  
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);
  
      if (error) throw error;
  
      message.success('Invoice deleted successfully');
      setDeleteModalVisible(false);
      navigate(-1); // Navigate back after successful deletion
    } catch (error) {
      console.error('Error deleting invoice:', error);
      message.error('Failed to delete invoice');
    }
  };


    //handle Dropdown menu============================//
    const menu = (
      <Menu>
        <Menu.Item key="1" icon={<DownloadOutlined />} onClick={handleDownloadPDF}>
          Download
        </Menu.Item>
        
        <Menu.Item key="2" onClick={handleUnpaidSubmit}>
          Mark as Unpaid
        </Menu.Item>
    
        <Menu.Item key="3" onClick={handleDelete} danger>
          Delete
        </Menu.Item>
      </Menu>
    );


    
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            type='text'
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <Space>
            
            
            <Button
            icon={<ShareAltOutlined />}
            onClick={handleWhatsAppShare}
          >
            Share
          </Button>
          
          <Dropdown overlay={menu} trigger={["click"]} placement="bottomRight">
          <Button icon={<MoreOutlined />} />
          </Dropdown>
          </Space>
        </div>

        <Segmented
          options={[
            { label: 'Invoice Detail', value: 'invoice' },
            { label: 'Payment', value: 'payment' }
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value.toString())}
          style={{ marginBottom: '24px' }}
        />

        {activeTab === 'invoice' ? (
          <>
            <Card>
              <Descriptions title="Invoice Information" bordered column={{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}>
                <Descriptions.Item label="Invoice Number">{invoice?.invoice_number}</Descriptions.Item>
                <Descriptions.Item label="Date">{invoice?.date}</Descriptions.Item>
                <Descriptions.Item label="Due Date">{invoice?.due_date}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={invoice?.status === 'paid' ? 'green' : 'orange'}>
                    {invoice?.status?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Customer">{invoice?.customer_name}</Descriptions.Item>
                <Descriptions.Item label="Subtotal">{invoice.currency}{invoice?.subtotal.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="Tax Rate">{invoice?.tax_rate}%</Descriptions.Item>
                <Descriptions.Item label="Tax Amount">{invoice.currency}{invoice?.tax_amount.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="Total Amount">{invoice.currency}{invoice?.total.toFixed(2)}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Items" style={{ marginTop: '24px' }}>
              <Table
                dataSource={items}
                columns={[
                  {
                    title: 'Description',
                    dataIndex: 'description',
                    key: 'description',
                  },
                  {
                    title: 'Quantity',
                    dataIndex: 'quantity',
                    key: 'quantity',
                  },
                  {
                    title: 'Unit Price',
                    dataIndex: 'unit_price',
                    key: 'unit_price',
                    render: (value) => `${invoice.currency}${value.toFixed(2)}`,
                  },
                  {
                    title: 'Amount',
                    dataIndex: 'amount',
                    key: 'amount',
                    render: (value) => `${invoice.currency}${value.toFixed(2)}`,
                  },
                ]}
                pagination={false}
              />
            </Card>
          </>
        ) : (
          <PaymentSection
            invoice={invoice}
            payments={payments}
            onPaymentAdded={fetchPayments}
            fetchInvoiceDetails={fetchInvoiceDetails}
          />
        )}


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
        title="Preview Invoice"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        footer={null}
        width="80%"
        style={{ top: 20 }}
        styles={{ body: { padding: 0, height: 'calc(100vh - 100px)' } }}
      >
        {companyData && customerData && (
          <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
            <InvoicePDF
              invoice={{
                invoice_number: invoice!.invoice_number,
                date: invoice!.date,
                due_date: invoice!.due_date,
                subtotal: invoice!.subtotal,
                tax_type: invoice!.tax_type,
                tax_rate: invoice!.tax_rate,
                tax_amount: invoice!.tax_amount,
                currency:invoice!.currency,
                total: invoice!.total
              }}
              company={companyData}
              customer={{
                name: invoice!.customer_name || '',
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
            />
          </PDFViewer>
        )}
      </Modal>
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

export default InvoiceDetailContent;
