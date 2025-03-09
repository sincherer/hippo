import { Form, Input, Button, message, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';

interface Company {
  id: string;
  name: string;
  user_id: string;
}

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  company_id: string;
  address: string;
}

const CreateCustomer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, user_id')
        .eq('user_id', user?.id);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      message.error('Failed to fetch companies');
    }
  }, [user]);
  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user, fetchCompanies]);
  const onFinish = async (values: CustomerForm) => {
    try {
      const { error } = await supabase
        .from('customers')
        .insert([{
          ...values,
          user_id: user?.id
        }]);

      if (error) throw error;

      message.success('Customer created successfully');
      navigate('/customers');
    } catch (error) {
      console.error('Error creating customer:', error);
      message.error('Failed to create customer');
    }
  };

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '0 16px' }}>
      <h2>Create New Customer</h2>
      <Form
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item
          label="Company"
          name="company_id"
          rules={[{ required: true, message: 'Please select a company!' }]}
        >
          <Select placeholder="Select a company">
            {companies.map(company => (
              <Select.Option key={company.id} value={company.id}>
                {company.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

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
          rules={[{ required: true, message: 'Please input customer address!' }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Create Customer
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default CreateCustomer;