import { Card, Table, Button, Space, Modal, Form, Select, InputNumber, Input, DatePicker, message } from 'antd';
import { useState } from 'react';
import type { PaymentRecord } from '../types/payment';
import { supabase } from '../config/supabase';

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  currency: string;
  status: 'unpaid' | 'sent' | 'paid' | 'overdue' | 'cancelled';

}


interface PaymentSectionProps {
  invoice: Invoice | null;
  payments: PaymentRecord[];
  onPaymentAdded: () => void;
  fetchInvoiceDetails: () => void;
}



const PaymentSection: React.FC<PaymentSectionProps> = ({ invoice, payments, onPaymentAdded, fetchInvoiceDetails }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balanceDue = invoice ? invoice.total - totalPaid : 0;

  const handleAddPayment = () => {
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };



  const handleUnpaidSubmit = async () => {
    if (!invoice) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'unpaid',
          payment_method: null,
          payment_remarks: null
        })
        .eq('id', invoice.id);

      if (error) throw error;

      message.success('Invoice marked as unpaid successfully');
      fetchInvoiceDetails();
    } catch (error) {
      console.error('Error updating payment status:', error);
      message.error('Failed to update payment status');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (!invoice) return;

      // Insert new payment record
      const { error: paymentError } = await supabase
        .from('invoice_payments')
        .insert({
          invoice_id: invoice.id,
          amount: values.amount,
          payment_method: values.payment_method,
          payment_remarks: values.payment_remarks,
          payment_date: values.payment_date.format('YYYY-MM-DD')
        });

      if (paymentError) throw paymentError;

      // Calculate total received amount
      const totalReceived = payments.reduce((sum, payment) => sum + payment.amount, 0) + values.amount;
      
      // Update invoice status if fully paid
      if (totalReceived >= invoice.total) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', invoice.id);

        if (invoiceError) throw invoiceError;
      }

      onPaymentAdded();
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'payment_date',
      key: 'payment_date',
      sorter: (a: PaymentRecord, b: PaymentRecord) => {
        return new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      },
      defaultSortOrder: 'descend' as const
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${invoice?.currency}${amount.toFixed(2)}`,
      sorter: (a: PaymentRecord, b: PaymentRecord) => a.amount - b.amount
    },
    {
      title: 'Method',
      dataIndex: 'payment_method',
      key: 'payment_method',
      filters: [
        { text: 'Cash', value: 'cash' },
        { text: 'Bank Transfer', value: 'bank_transfer' },
        { text: 'Credit Card', value: 'credit_card' },
        { text: 'Other', value: 'other' }
      ],
      onFilter: (value: boolean | React.Key, record: PaymentRecord) => record.payment_method === value.toString()
    },
    {
      title: 'Remarks',
      dataIndex: 'payment_remarks',
      key: 'payment_remarks',
      ellipsis: true
    },
  ];

  return (
    <div>
      <Card
        style={{ width: '100%', margin:'24px 0' }}
        title="Payment History"
        extra={
          <Space>
           <Button
            type="default"
            onClick={handleUnpaidSubmit}
          >
            Mark as Unpaid
          </Button>
            <Button type="primary" onClick={handleAddPayment} disabled={!invoice || invoice.status === 'paid'}>
              Add Payment
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ marginBottom: 16 }}>
            <Space size="large">
              <span>
                <strong>Total Amount:</strong> {invoice?.currency}
                {invoice?.total.toFixed(2)}
              </span>
              <span>
                <strong>Total Paid:</strong> {invoice?.currency}
                {(totalPaid ?? 0).toFixed(2)}
              </span>
              <span>
                <strong>Balance Due:</strong> {invoice?.currency}
                {balanceDue.toFixed(2)}
              </span>
            </Space>
          </div>

          <Table
            dataSource={payments}
            columns={columns}
            rowKey="id"
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
            }}
            locale={{
              emptyText: 'No payment records found'
            }}
          />
        </Space>
      </Card>

      <Modal
        title="Add Payment"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter payment amount' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={balanceDue}
              precision={2}
              placeholder="Enter payment amount"
            />
          </Form.Item>

          <Form.Item
            name="payment_method"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select placeholder="Select payment method">
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
              <Select.Option value="credit_card">Credit Card</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="payment_date"
            label="Payment Date"
            rules={[{ required: true, message: 'Please select payment date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="payment_remarks" label="Remarks">
            <Input.TextArea
              style={{ width: '100%' }}
              placeholder="Add remarks (optional)"
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentSection;