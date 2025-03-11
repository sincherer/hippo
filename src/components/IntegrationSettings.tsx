import { Card, Form, Input, Button, message, Space, Switch } from 'antd';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface IntegrationSettings {
  stripe_api_key?: string;
  stripe_webhook_secret?: string;
  stripe_enabled: boolean;
  paypal_client_id?: string;
  paypal_client_secret?: string;
  paypal_enabled: boolean;
  xero_client_id?: string;
  xero_client_secret?: string;
  xero_enabled: boolean;
}

const IntegrationSettings = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        form.setFieldsValue({
          stripe_api_key: data.stripe_api_key || '',
          stripe_webhook_secret: data.stripe_webhook_secret || '',
          stripe_enabled: data.stripe_enabled || false,
          paypal_client_id: data.paypal_client_id || '',
          paypal_client_secret: data.paypal_client_secret || '',
          paypal_enabled: data.paypal_enabled || false,
          xero_client_id: data.xero_client_id || '',
          xero_client_secret: data.xero_client_secret || '',
          xero_enabled: data.xero_enabled || false
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Failed to fetch integration settings');
    }
  };

  const onFinish = async (values: IntegrationSettings) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          user_id: user?.id,
          ...values
        });

      if (error) throw error;

      message.success('Integration settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save integration settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Integration Settings" style={{ maxWidth: 800, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          stripe_enabled: false,
          paypal_enabled: false,
          xero_enabled: false
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Stripe Integration */}
          <Card type="inner" title="Stripe Integration">
            <Form.Item
              name="stripe_enabled"
              valuePropName="checked"
              style={{ marginBottom: 16 }}
            >
              <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
            </Form.Item>

            <Form.Item
              name="stripe_api_key"
              label="API Key"
              rules={[{ required: false, message: 'Please input your Stripe API key!' }]}
            >
              <Input.Password placeholder="Enter your Stripe API key" />
            </Form.Item>

            <Form.Item
              name="stripe_webhook_secret"
              label="Webhook Secret"
              rules={[{ required: false, message: 'Please input your Stripe webhook secret!' }]}
            >
              <Input.Password placeholder="Enter your Stripe webhook secret" />
            </Form.Item>
          </Card>

          {/* PayPal Integration */}
          <Card type="inner" title="PayPal Integration">
            <Form.Item
              name="paypal_enabled"
              valuePropName="checked"
              style={{ marginBottom: 16 }}
            >
              <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
            </Form.Item>

            <Form.Item
              name="paypal_client_id"
              label="Client ID"
              rules={[{ required: false, message: 'Please input your PayPal client ID!' }]}
            >
              <Input.Password placeholder="Enter your PayPal client ID" />
            </Form.Item>

            <Form.Item
              name="paypal_client_secret"
              label="Client Secret"
              rules={[{ required: false, message: 'Please input your PayPal client secret!' }]}
            >
              <Input.Password placeholder="Enter your PayPal client secret" />
            </Form.Item>
          </Card>

          {/* Xero Integration */}
          <Card type="inner" title="Xero Integration">
            <Form.Item
              name="xero_enabled"
              valuePropName="checked"
              style={{ marginBottom: 16 }}
            >
              <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
            </Form.Item>

            <Form.Item
              name="xero_client_id"
              label="Client ID"
              rules={[{ required: false, message: 'Please input your Xero client ID!' }]}
            >
              <Input.Password placeholder="Enter your Xero client ID" />
            </Form.Item>

            <Form.Item
              name="xero_client_secret"
              label="Client Secret"
              rules={[{ required: false, message: 'Please input your Xero client secret!' }]}
            >
              <Input.Password placeholder="Enter your Xero client secret" />
            </Form.Item>
          </Card>
        </Space>

        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default IntegrationSettings;