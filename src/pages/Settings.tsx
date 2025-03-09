import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Space, message, Modal, Form, Input, Row, Col, Avatar, Segmented } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import CustomerList from './CustomerList';
import UpdateProfile from '../components/UpdateProfile';

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

const Settings = () => {

  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('companies');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
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

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    editForm.setFieldsValue(company);
    setEditModalVisible(true);
  };

  const handleDelete = (company: Company) => {
    setSelectedCompany(company);
    setDeleteModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!selectedCompany) return;

      const { error } = await supabase
        .from('companies')
        .update(values)
        .eq('id', selectedCompany.id);

      if (error) throw error;

      message.success('Company updated successfully');
      setEditModalVisible(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      message.error('Failed to update company');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      if (!selectedCompany) return;

      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', selectedCompany.id);

      if (error) throw error;

      message.success('Company deleted successfully');
      setDeleteModalVisible(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      message.error('Failed to delete company');
    }
  };
  const handleCreateSubmit = async () => {
    try {
      setLoading(true);
      const values = await createForm.validateFields();

      const { error } = await supabase
        .from('companies')
        .insert([{
          ...values,
          user_id: user?.id
        }]);

      if (error) throw error;

      message.success('Company created successfully');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      message.error('Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'customers':
        return <div style={{ width: '100%' }}><CustomerList /></div>;
      case 'companies':
        return (
          <div style={{ width: '100%' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <h2 style={{ margin: 0 }}>Company Management</h2>
              </Col>
              <Col>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  New Company
                </Button>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              {companies.map(company => (
                <Col xs={24} key={company.id}>
                  <Card
                    hoverable
                    actions={[                  
                      <Button type="link" onClick={() => handleEdit(company)} key="edit">Edit</Button>,
                      <Button type="link" danger onClick={() => handleDelete(company)} key="delete">Delete</Button>
                    ]}
                  >
                    <Card.Meta
                      avatar={company.logo_url ? <Avatar size={64} src={company.logo_url} /> : null}
                      title={company.name}
                      description={
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div><strong>Email:</strong> {company.email}</div>
                          <div><strong>Phone:</strong> {company.phone}</div>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
            <Card style={{ marginTop: 24 }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                  <h2 style={{ margin: 0 }}>Profile</h2>
                </Col>
                <Col>
                  <Button 
                    type="primary" 
                    onClick={() => setProfileModalVisible(true)}
                  >
                    Edit Profile
                  </Button>
                </Col>
              </Row>
              <Card>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <strong>Display Name: </strong>
                    {user?.user_metadata?.display_name || 'Not set'}
                  </div>
                  <div>
                    <strong>Email: </strong>
                    {user?.email}
                  </div>
                </Space>
              </Card>
            </Card>
            <Modal
              title="Edit Profile"
              open={profileModalVisible}
              onCancel={() => setProfileModalVisible(false)}
              footer={null}
              width="95%"
              style={{ maxWidth: '500px' }}
            >
              <UpdateProfile isEditing={true} setIsEditing={() => setProfileModalVisible(false)} />
            </Modal>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Segmented
        options={[
          { label: 'Companies', value: 'companies' },
          { label: 'Customers', value: 'customers' }
        ]}
        value={activeSection}
        onChange={(value) => setActiveSection(value.toString())}
        style={{ marginBottom: 24 }}
      />
    {renderContent()}
    <Modal
        title="Edit Company"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
      >
        <Form
          form={editForm}
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
      <Modal
        title="Create Company"
        open={createModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => {
          setCreateModalVisible(false);
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

      <Modal
        title="Delete Company"
        open={deleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete this company? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default Settings;
