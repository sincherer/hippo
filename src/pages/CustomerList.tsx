import { Button, Space, Modal, Form, Input, message, Row, Col, Card, Select } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';

import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_id: string;
}

interface Company {
  id: string;
  name: string;
  user_id: string;
}

const CustomerList = () => {
  //const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
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

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error('Failed to fetch customers');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCustomers();
      fetchCompanies();
    }
  }, [user, fetchCustomers, fetchCompanies]);

  const handleCreateSubmit = async () => {
    try {
      setLoading(true);
      const values = await createForm.validateFields();

      const { error } = await supabase
        .from('customers')
        .insert([{
          ...values,
          user_id: user?.id
        }]);

      if (error) throw error;

      message.success('Customer created successfully');
      setIsCreateModalVisible(false);
      createForm.resetFields();
      fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      message.error('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    editForm.setFieldsValue(customer);
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      setLoading(true);
      const values = await editForm.validateFields();
      if (!selectedCustomer) return;

      const { error } = await supabase
        .from('customers')
        .update(values)
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      message.success('Customer updated successfully');
      setIsEditModalVisible(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      message.error('Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      if (!selectedCustomer) return;

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      message.success('Customer deleted successfully');
      setIsDeleteModalVisible(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      message.error('Failed to delete customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', paddingRight:'110px' }}>
      <Space direction="horizontal" align="center" style={{ width: '100%', justifyContent: 'space-between', marginTop: '-16px' }} size="large">
        <h2 >Customer Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalVisible(true)}>
          Add New Customer
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        {customers.map(customer => (
          <Col xs={24} key={customer.id}>
            <Card
              hoverable
              actions={[
                <Button type="link" icon={<EyeOutlined />} onClick={() => {
                  setSelectedCustomer(customer);
                  setIsPreviewVisible(true);
                }} key="view">View</Button>,
                <Button type="link" onClick={() => handleEdit(customer)} key="edit">Edit</Button>,
                <Button type="link" danger onClick={() => handleDelete(customer)} key="delete">Delete</Button>
              ]}
            >
              <Card.Meta
                title={customer.name}
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div><strong>Email:</strong> {customer.email}</div>
                    <div><strong>Phone:</strong> {customer.phone}</div>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="Customer Details"
        open={isPreviewVisible}
        onCancel={() => setIsPreviewVisible(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: '500px' }}
      >
        {selectedCustomer && (
          <div>
            <p><strong>Name:</strong> {selectedCustomer.name}</p>
            <p><strong>Email:</strong> {selectedCustomer.email}</p>
            <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
          </div>
        )}
      </Modal>

      <Modal
        title="Edit Customer"
        open={isEditModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditModalVisible(false)}
        confirmLoading={loading}
        width="95%"
        style={{ maxWidth: '500px' }}
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ width: '100%' }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input customer name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input customer email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please input customer phone!' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Create Customer"
        open={isCreateModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={loading}
        width="95%"
        style={{ maxWidth: '500px' }}
      >
        <Form
          form={createForm}
          layout="vertical"
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
        </Form>
      </Modal>

      <Modal
        title="Delete Customer"
        open={isDeleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalVisible(false)}
        confirmLoading={loading}
        width="95%"
        style={{ maxWidth: '500px' }}
      >
        <p>Are you sure you want to delete this customer? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default CustomerList;