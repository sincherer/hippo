import { Modal, Form, Input, Rate, Button, Space } from 'antd';
import { useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSkip: () => void;
}

const FeedbackModal = ({ visible, onClose, onSkip }: FeedbackModalProps) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const { error } = await supabase
        .from('user_feedback')
        .upsert({
          user_id: user?.id,
          feedback_text: values.feedback,
          rating: values.rating,
          feedback_skipped: false
        });

      if (error) throw error;

      form.resetFields();
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_feedback')
        .upsert({
          user_id: user?.id,
          feedback_skipped: true
        });

      if (error) throw error;
      onSkip();
    } catch (error) {
      console.error('Error skipping feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Help Us Improve!"
      open={visible}
      onCancel={handleSkip}
      footer={null}
    >
      <Form form={form} layout="vertical">
        <p>We'd love to hear about your experience creating invoices with Hippo!</p>
        
        <Form.Item
          name="rating"
          label="How would you rate your experience?"
          rules={[{ required: true, message: 'Please rate your experience' }]}
        >
          <Rate />
        </Form.Item>

        <Form.Item
          name="feedback"
          label="Any suggestions for improvement?"
        >
          <Input.TextArea
            placeholder="Share your thoughts with us"
            rows={4}
          />
        </Form.Item>

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleSkip}>Skip</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Submit Feedback
          </Button>
        </Space>
      </Form>
    </Modal>
  );
};

export default FeedbackModal;