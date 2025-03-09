import { Form, Input, Select, Button, DatePicker, Space, InputNumber, Card,  message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';


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
}

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

const CreateInvoice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<{ id: string; name: string; }[]>([]);

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
      // Calculate subtotal and total
      const items = values.items || [];
      const subtotal = items.reduce((sum: number, item: InvoiceItem) => {
        return sum + (item.quantity * item.price);
      }, 0);
      const tax_rate = 0; // You can make this configurable later
      const tax_amount = subtotal * (tax_rate / 100);
      const total = subtotal + tax_amount;

      // First, create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: `INV-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          due_date: values.due_date.format('YYYY-MM-DD'),
          user_id: user?.id,
          customer_id: values.customer_id,
          company_id: values.company_id,
          status: 'draft',
          subtotal,
          tax_rate,
          tax_amount,
          total,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Then, create invoice items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map((item: InvoiceItem) => ({
              invoice_id: invoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.price,
              amount: item.quantity * item.price
            }))
          );

        if (itemsError) throw itemsError;
      }

      message.success('Invoice created successfully');
      navigate('/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      message.error('Failed to create invoice');
    }
  };
  return (
    <div style={{ width: '100vw' }}>
      <h2>Create New Invoice</h2>
      
        <Form style={{ paddingRight: '64px'}} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Company"
            name="company_id"
            rules={[{ required: true, message: 'Please select a company!' }]}
          >
            <Select 
              placeholder="Select company" 
              size="large" 
              style={{ width: '100%' }}
              onChange={(value) => setSelectedCompanyId(value)}
            >
              {companies.map(company => (
                <Select.Option key={company.id} value={company.id}>
                  {company.name}
                </Select.Option>
              ))}
            </Select>
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
            >
              {customers.map(customer => (
                <Select.Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            label="Due Date" 
            name="due_date" 
            rules={[{ required: true }]}
          >
            <DatePicker size="large" style={{ width: '100%' }} />
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
                            name={[name, 'price']} 
                            label="Price"
                            rules={[{ required: true }]}
                          >
                            <InputNumber 
                              min={0} 
                              size="large"
                              style={{ width: '150px' }}
                              prefix="$" 
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
      
    </div>
  );
};

export default CreateInvoice;