import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import hippoLogo from '../assets/hippo.webp';


const { Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginForm) => {
    try {
      setLoading(true);
      await signIn(values.email, values.password);
      message.success('Login successful');
      navigate('/dashboard');
    } catch (error) {
      message.error('Failed to login. Please check your credentials.');
      console.error('Login error:', error);
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
      <Card style={{ width: 400, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={hippoLogo}
            alt="Hippo Logo"
            style={{
              width: 40,
              height: 40,
              marginRight: 16,
              alignContent: 'center',
              objectFit: 'contain',
              borderRadius: 50,
              cursor: 'pointer'
            }}
            onClick={() => navigate('/dashboard')}
          />
          <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Login to Hippo</h2>
        </div>
        <Form
          name="login"
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Please input your email!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Log in
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Text>Don't have an account? </Text>
            <Link to="/signup">Sign up now</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;