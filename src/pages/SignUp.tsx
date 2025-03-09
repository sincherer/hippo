import { Form, Input, Button, Steps, Card, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

interface SignUpForm {
  email: string;
  password: string;
  displayName: string;
}

interface CompanyForm {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface AuthError {
  message: string;
  status?: number;
}

interface CompanyError {
  message: string;
  code?: string;
  details?: string;
}

const SignUp = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');

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
          }
        }
      });

      if (authError) throw authError;
      if (authData.user) {
        setUserId(authData.user.id);
        message.success('Account created successfully!');
        setCurrent(1);
      }
    } catch (error: unknown) {
      const authError = error as AuthError;
      console.error('Error signing up:', authError);
      message.error(authError.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySetup = async (values: CompanyForm) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('companies')
        .insert([{
          ...values,
          user_id: userId
        }]);

      if (error) throw error;

      message.success('Company information saved successfully!');
      navigate('/dashboard');
    } catch (error: unknown) {
      const companyError = error as CompanyError;
      console.error('Error saving company:', companyError);
      message.error('Failed to save company information');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const steps = [
    {
      title: 'Account Setup',
      content: (
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
      ),
    },
    {
      title: 'Company Setup (Optional)',
      content: (
        <Form
          layout="vertical"
          onFinish={handleCompanySetup}
          style={{ maxWidth: 400, margin: '0 auto' }}
        >
          <Form.Item
            label="Company Name"
            name="name"
            rules={[{ required: true, message: 'Please input company name!' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Company Address"
            name="address"
            rules={[{ required: true, message: 'Please input company address!' }]}
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            label="Company Phone"
            name="phone"
            rules={[{ required: true, message: 'Please input company phone!' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Company Email"
            name="email"
            rules={[
              { required: true, message: 'Please input company email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Save Company Information
            </Button>
            <Button onClick={handleSkip} style={{ marginTop: 8 }} block>
              Skip for Now
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ width: '100vw', margin: '40px auto', padding: '0 20px' }}>
      <Card>
        <Steps
          current={current}
          items={steps}
          style={{ marginBottom: 24 }}
          responsive={false}
          size="small"
        />
        <div style={{ padding: '0 8px' }}>
          {steps[current].content}
        </div>
      </Card>
    </div>
  );
};

export default SignUp;