
import { Button, Form, Input, message, Card, Space } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

interface UpdateProfileProps {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

const UpdateProfile = ({ isEditing, setIsEditing }: UpdateProfileProps) => {
  const { user, signOut } = useAuth();

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
      setIsEditing(false);
    } catch (error) {
      message.error('Failed to update display name');
      console.error('Update display name error:', error);
    }
  };

  const handleUpdateEmail = async (values: { email: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: values.email
      });

      if (error) throw error;

      message.success('Email update confirmation sent to your new email address');
      setIsEditing(false);
    } catch (error) {
      message.error('Failed to update email');
      console.error('Update email error:', error);
    }
  };

  const handleResetPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '');

      if (error) throw error;

      message.success('Password reset instructions sent to your email');
      setIsEditing(false);
    } catch (error) {
      message.error('Failed to send password reset email');
      console.error('Password reset error:', error);
    }
  };

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '0 16px' }}>
      {isEditing ? (
        <>
          <Form
            onFinish={handleUpdateDisplayName}
            initialValues={{ displayName: user?.user_metadata?.display_name || '' }}
          >
            <Form.Item
              name="displayName"
              label="Display Name"
              rules={[{ required: true, message: 'Please input your display name!' }]}
            >
              <Input placeholder="Enter your display name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Update Display Name
              </Button>
            </Form.Item>
          </Form>
          <Card title="Update Email" style={{ marginTop: 16 }}>
            <Form onFinish={handleUpdateEmail}>
              <Form.Item
                name="email"
                label="New Email"
                rules={[
                  { required: true, message: 'Please input your new email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input placeholder="Enter your new email" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Update Email
                </Button>
              </Form.Item>
            </Form>
          </Card>
          <Card title="Reset Password" style={{ marginTop: 16 }}>
            <p>Click below to receive password reset instructions via email</p>
            <Button type="primary" onClick={handleResetPassword}>
              Send Reset Instructions
            </Button>
          </Card>
        </>
      ) : (
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
      )}

      <Card style={{ marginTop: 16 }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Do you want to logout?</h3>
          <Button icon={<LogoutOutlined/>} onClick={handleLogout} type="default" danger>
            Logout
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default UpdateProfile;