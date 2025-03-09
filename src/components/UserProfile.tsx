import { useState } from 'react';
import { Button, Dropdown, Modal, Form, Input, message } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

const UserProfile = () => {
  const { user, signOut } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        message.error('No active session found');
        return;
      }
      await signOut();
      message.success('Logged out successfully');
    } catch (error) {
      message.error('Failed to logout');
      console.error('Logout error:', error);
    }
  };

  const handleUpdateDisplayName = async (values: { displayName: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: values.displayName }
      });

      if (error) throw error;

      message.success('Display name updated successfully');
      setIsModalVisible(false);
    } catch (error) {
      message.error('Failed to update display name');
      console.error('Update display name error:', error);
    }
  };

  const items = [
    {
      key: 'displayName',
      label: 'Update Display Name',
      icon: <UserOutlined />,
      onClick: () => setIsModalVisible(true)
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

  return (
    <div>
      
      <Dropdown menu={{ items }} placement="bottomRight">
        <Button type="link" icon={<UserOutlined />}>
          {user?.user_metadata?.display_name || user?.email}
        </Button>
      </Dropdown>

      <Modal
        title="Update Display Name"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          onFinish={handleUpdateDisplayName}
          initialValues={{ displayName: user?.user_metadata?.display_name || '' }}
        >
          <Form.Item
            name="displayName"
            rules={[{ required: true, message: 'Please input your display name!' }]}
          >
            <Input placeholder="Enter your display name" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Update
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserProfile;