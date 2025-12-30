import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Company {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
  bank_name?: string;
  bank_account?: string;
  user_id: string;
}

const CreateCompany = () => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: Omit<Company, 'id' | 'user_id'>) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('companies')
        .insert([{
          ...values,
          user_id: user?.id
        }]);

      if (error) throw error;

      message.success('Company created successfully');
      form.resetFields();
      navigate('/companies');
    } catch (error) {
      console.error('Error creating company:', error);
      message.error('Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw' }}>
      <h2>Create New Company</h2>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
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
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
              Add Company
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateCompany;