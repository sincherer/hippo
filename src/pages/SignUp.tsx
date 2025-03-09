import { Form, Input, Button, Card, message, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';

const { Text } = Typography;

interface SignUpForm {
  email: string;
  password: string;
  displayName: string;
}

interface AuthError {
  message: string;
  status?: number;
}

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (values: SignUpForm) => {
    try {
      setLoading(true);
      
      // Sign up with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            display_name: values.displayName
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });
  
      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      if (authData.user.identities?.length === 0) {
        message.error('This email is already registered. Please try logging in or use a different email.');
        return;
      }

      message.success('Account created! Please check your email to verify your account. If you don\'t see the email, please check your spam folder.');
      navigate('/login');
    } catch (error: unknown) {
      const authError = error as AuthError;
      console.error('Error signing up:', authError);
      message.error(authError.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#fffff',
      width: '100vw',
     }}>
      <Card style={{ width: 400 }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Create Account</h2>
        <Form
          layout="vertical"
          onFinish={handleSignUp}
          style={{ maxWidth: 400, margin: '0 auto' }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item
            label="Display Name"
            name="displayName"
            rules={[{ required: true, message: 'Please input your display name!' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Create Account
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
            <Text>Already have an account? </Text>
            <Link to="/login">Login now</Link>
          </div>
      </Card>
    </div>
  );
};

export default SignUp;