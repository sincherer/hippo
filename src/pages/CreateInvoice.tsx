import { Form, Input, Select, Button, DatePicker, Space, InputNumber, Card, message, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';
import FeedbackModal from '../components/FeedbackModal';


interface Customer {
  id: string;
  name: string;
  email: string;
  company_id: string;
}

interface FormValues {
  company_id: string;
  customer_id: string;
  due_date: moment.Moment;
  items: InvoiceItem[];
  tax_type: string;
  tax_rate: string;
  currency: string;
  notes: string;
}


interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}
const CreateInvoice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<{ id: string; name: string; }[]>([]);
  const [createCustomerModalVisible, setCreateCustomerModalVisible] = useState(false);
  const [createCustomerForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [createCompanyModalVisible, setCreateCompanyModalVisible] = useState(false);
  const [createCompanyForm] = Form.useForm();

  const handleCreateCustomerSubmit = async () => {
    try {
      setLoading(true);
      const values = await createCustomerForm.validateFields();

      const { error } = await supabase
        .from('customers')
        .insert([{
          ...values,
          company_id: selectedCompanyId,
          user_id: user?.id
        }]);

      if (error) throw error;

      message.success('Customer created successfully');
      setCreateCustomerModalVisible(false);
      createCustomerForm.resetFields();
      fetchCustomers(selectedCompanyId);
    } catch (error) {
      console.error('Error creating customer:', error);
      message.error('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('user_id', user?.id);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      message.error('Failed to fetch companies');
    }
  }, [user]);

  const fetchCustomers = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, company_id')
        .eq('company_id', companyId);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error('Failed to fetch customers');
    }
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchCustomers(selectedCompanyId);
    } else {
      setCustomers([]);
    }
  }, [selectedCompanyId, fetchCustomers]);

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user, fetchCompanies]);
  const onFinish = async (values: FormValues) => {
    try {
      // Validate items exist
      if (!values.items || values.items.length === 0) {
        message.error('Please add at least one item to the invoice');
        return;
      }

      // Validate each item has valid quantity and unit price
      const invalidItems = values.items.filter(
        item => !item.quantity || !item.unit_price || item.quantity <= 0 || item.unit_price <= 0
      );
      if (invalidItems.length > 0) {
        message.error('Please ensure all items have valid quantity and price');
        return;
      }

      // Calculate subtotal and total
      const items = values.items;
      const subtotal = items.reduce((sum: number, item: InvoiceItem) => {
        return sum + (item.quantity * item.unit_price);
      }, 0);
      const tax_rate = parseFloat(values.tax_rate) || 0; // Initialize from form values
      const tax_amount = subtotal * (tax_rate / 100);
      const total = subtotal + tax_amount;

      // First, create the invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: `INV-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          due_date: values.due_date.format('YYYY-MM-DD'),
          user_id: user?.id,
          customer_id: values.customer_id,
          company_id: values.company_id,
          status: 'unpaid',
          subtotal,
          tax_type: values.tax_type,
          tax_rate: values.tax_rate,
          tax_amount,
          currency: values.currency,
          total,
          notes: values.notes
        }])
        .select()
        .single();
  
      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        throw new Error('Failed to create invoice');
      }
  
      if (!invoiceData) {
        throw new Error('No invoice data returned after creation');
      }
  
      // Then, create invoice items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map((item: InvoiceItem) => ({
              invoice_id: invoiceData.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              amount: item.quantity * item.unit_price
            }))
          );
  
        if (itemsError) {
          console.error('Error creating invoice items:', itemsError);
          throw new Error('Failed to create invoice items');
        }
      }
  
      message.success('Invoice created successfully');

      // Check if we should show the feedback modal
      const { data: feedbackData } = await supabase
        .from('user_feedback')
        .select('invoice_count, feedback_skipped')
        .eq('user_id', user?.id)
        .single();

      if (!feedbackData) {
        // First invoice, show feedback modal
        setShowFeedbackModal(true);
        await supabase
          .from('user_feedback')
          .insert([{ user_id: user?.id, invoice_count: 1 }]);
      } else {
        const newCount = (feedbackData.invoice_count || 0) + 1;
        await supabase
          .from('user_feedback')
          .update({ invoice_count: newCount })
          .eq('user_id', user?.id);

        // Show feedback modal on third invoice if previously skipped
        if (newCount === 3 && feedbackData.feedback_skipped) {
          setShowFeedbackModal(true);
        }
      }

      navigate('/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      message.error(error instanceof Error ? error.message : 'Failed to create invoice');
    }
  };
  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
  };

  return (
    <div style={{ width: '100%' }}>
      <h2>Create New Invoice</h2>
      
        <Form 
          form={form}
          style={{ paddingRight: '64px'}} 
          layout="vertical" 
          onFinish={onFinish}
        >
          <Form.Item
            label="Company"
            name="company_id"
            rules={[{ required: true, message: 'Please select a company!' }]}
          >
            <Select 
              showSearch
              placeholder="Select company" 
              size="large" 
              style={{ width: '100%' }}
              onChange={(value) => {
                setSelectedCompanyId(value);
                form.setFieldValue('company_id', value);
              }}
            >
              {companies.map(company => (
                <Select.Option key={company.id} value={company.id}>
                  {company.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button 
              type="default" 
              style={{ marginTop: '16px' }}
              icon={<PlusOutlined />}
              onClick={() => setCreateCompanyModalVisible(true)}
            >
              Add New Company
            </Button>
          </Form.Item>

          <Form.Item 
            label="Customer" 
            name="customer_id" 
            rules={[{ required: true, message: 'Please select a customer!' }]}
          >
            <Select 
              placeholder="Select customer" 
              size="large" 
              style={{ width: '100%' }}
              disabled={!selectedCompanyId}
              onChange={(value) => form.setFieldValue('customer_id', value)}
            >
              {customers.map(customer => (
                <Select.Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button 
              type="default" 
              style={{ marginTop: '16px' }}
              icon={<PlusOutlined />}
              onClick={() => setCreateCustomerModalVisible(true)}
            >
              Add New Customer
            </Button>
          </Form.Item>

          <Form.Item 
            label="Due Date" 
            name="due_date" 
            rules={[{ required: true }]}
          >
            <DatePicker size="large" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Currency"
            name="currency"
            rules={[{ required: true, message: 'Please select a currency!' }]}
          >
            <Select
              showSearch
              placeholder="Select currency"
              size="large"
              style={{ width: '100%' }}
            >
              <Select.Option value="USD">USD - United States Dollar</Select.Option> 
              <Select.Option value="EUR">EUR - Euro</Select.Option> 
              <Select.Option value="GBP">GBP - British Pound Sterling</Select.Option> 
              <Select.Option value="JPY">JPY - Japanese Yen</Select.Option> 
              <Select.Option value="CNY">CNY - Chinese Yuan</Select.Option> 
              <Select.Option value="AUD">AUD - Australian Dollar</Select.Option> 
              <Select.Option value="CAD">CAD - Canadian Dollar</Select.Option> 
              <Select.Option value="CHF">CHF - Swiss Franc</Select.Option> 
              <Select.Option value="HKD">HKD - Hong Kong Dollar</Select.Option> 
              <Select.Option value="SGD">SGD - Singapore Dollar</Select.Option> 
              <Select.Option value="NZD">NZD - New Zealand Dollar</Select.Option> 
              <Select.Option value="SEK">SEK - Swedish Krona</Select.Option> 
              <Select.Option value="NOK">NOK - Norwegian Krone</Select.Option> 
              <Select.Option value="DKK">DKK - Danish Krone</Select.Option> 
              <Select.Option value="KRW">KRW - South Korean Won</Select.Option> 
              <Select.Option value="INR">INR - Indian Rupee</Select.Option> 
              <Select.Option value="IDR">IDR - Indonesian Rupiah</Select.Option> 
              <Select.Option value="MYR">MYR - Malaysian Ringgit</Select.Option> 
              <Select.Option value="THB">THB - Thai Baht</Select.Option> 
              <Select.Option value="PHP">PHP - Philippine Peso</Select.Option> 
              <Select.Option value="VND">VND - Vietnamese Dong</Select.Option> 
              <Select.Option value="ZAR">ZAR - South African Rand</Select.Option> 
              <Select.Option value="RUB">RUB - Russian Ruble</Select.Option> 
              <Select.Option value="BRL">BRL - Brazilian Real</Select.Option> 
              <Select.Option value="MXN">MXN - Mexican Peso</Select.Option> 
              <Select.Option value="TRY">TRY - Turkish Lira</Select.Option> 
              <Select.Option value="SAR">SAR - Saudi Riyal</Select.Option> 
              <Select.Option value="AED">AED - United Arab Emirates Dirham</Select.Option> 
            </Select>
          </Form.Item>

          <Form.Item
            label="Tax type"
            name="tax_type"
            rules={[{ required: false }]}
            >
              <Select
              placeholder='Select tax type'
              size="large"
              style={{ width: '100%' }}
              >
              <Select.Option value="SST">SST</Select.Option>
              <Select.Option value="VAT">VAT</Select.Option>
              <Select.Option value="GST">GST</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            label="Tax Rate (%)"
            name="tax_rate"
            rules={[{ required:false }]}
            >
            <InputNumber 
                min={1} 
                size="large"
                style={{ width: '100%' }} 
              />
            </Form.Item>
            
          <Form.Item
            label="Notes"
            name="notes"
            rules={[{ required: false }]}
          >
          
            <Input.TextArea
              rows={4}
              placeholder="Add any additional notes or payment instructions"
            />
          </Form.Item>

          <Form.Item label="Items">
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Card 
                      key={key} 
                      style={{ marginBottom: 16 }} 
                      size="small"
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Form.Item 
                          name={[name, 'description']} 
                          label="Description"
                          rules={[{ required: true }]}
                        >
                          <Input.TextArea rows={2} />
                        </Form.Item>
                        <Space>
                          <Form.Item 
                            name={[name, 'quantity']} 
                            label="Quantity"
                            rules={[{ required: true }]}
                          >
                            <InputNumber 
                              min={1} 
                              size="large"
                              style={{ width: '150px' }} 
                            />
                          </Form.Item>
                          <Form.Item 
                            name={[name, 'unit_price']} 
                            label="Price"
                            rules={[{ required: true }]}
                          >
                            <InputNumber 
                              min={0} 
                              size="large"
                              style={{ width: '150px' }}
                              prefix={form.getFieldValue('currency') || '$'}
                            />
                          </Form.Item>
                          <Button 
                            type="link" 
                            danger 
                            onClick={() => remove(name)}
                          >
                            Delete
                          </Button>
                        </Space>
                      </Space>
                    </Card>
                  ))}
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    block
                  >
                    Add Item
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                Create Invoice
              </Button>
              <Button size="large" onClick={() => navigate('/invoices')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      <Modal
        title="Create Customer"
        open={createCustomerModalVisible}
        onOk={handleCreateCustomerSubmit}
        onCancel={() => {
          setCreateCustomerModalVisible(false);
          createCustomerForm.resetFields();
        }}
        confirmLoading={loading}
        width="95%"
        style={{ maxWidth: '500px' }}
      >
        <Form
          form={createCustomerForm}
          layout="vertical"
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input customer name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please input customer email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Phone"
            name="phone"
            rules={[{ required: true, message: 'Please input customer phone!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Address"
            name="address"
            rules={[{ required: false }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Create Company"
        open={createCompanyModalVisible}
        onOk={async () => {
          try {
            setLoading(true);
            const values = await createCompanyForm.validateFields();
            const { error } = await supabase
              .from('companies')
              .insert([{
                ...values,
                user_id: user?.id
              }]);

            if (error) throw error;

            message.success('Company created successfully');
            setCreateCompanyModalVisible(false);
            createCompanyForm.resetFields();
            fetchCompanies();
          } catch (error) {
            console.error('Error creating company:', error);
            message.error('Failed to create company');
          } finally {
            setLoading(false);
          }
        }}
        onCancel={() => {
          setCreateCompanyModalVisible(false);
          createCompanyForm.resetFields();
        }}
        confirmLoading={loading}
        width="95%"
        style={{ maxWidth: '500px' }}
      >
        <Form
          form={createCompanyForm}
          layout="vertical"
        >
          <Form.Item
            label="Company Name"
            name="name"
            rules={[{ required: true, message: 'Please input company name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Address"
            name="address"
            rules={[{ required: true, message: 'Please input company address!' }]}
          >
            <Input.TextArea />
          </Form.Item>
          <Form.Item
            label="Phone"
            name="phone"
            rules={[{ required: true, message: 'Please input company phone!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Please input valid company email!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Logo URL"
            name="logo_url"
            rules={[{ type: 'url', message: 'Please input a valid URL!' }]}
          >
            <Input placeholder="Enter the URL of your company logo" />
          </Form.Item>
          <Form.Item
            label="Bank Name"
            name="bank_name"
          >
            <Input placeholder="Enter your company's bank name"/>
          </Form.Item>
          <Form.Item
            label="Bank Account"
            name="bank_account"
          >
            <Input placeholder="Enter your company's bank account details"/>
          </Form.Item>
        </Form>
      </Modal>
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={handleFeedbackClose}
        onSkip={handleFeedbackClose}
      />
    </div>
  );
};

export default CreateInvoice;