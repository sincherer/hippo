import { Card, Row, Col, Statistic, Segmented, Space, Tag, Button } from 'antd';
import { UserOutlined, FileOutlined, DollarOutlined, CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  customer_name?: string;
  total: number;
  status: string;
  company_logo?: string;
  company_name?: string;
  due_date: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    totalRevenue: 0
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const fetchStats = useCallback(async () => {
    try {
      // Fetch total customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id);

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name)
        `)
        .eq('user_id', user?.id);

      const totalInvoices = invoices?.length || 0;
      const paidInvoices = invoices?.filter(inv => inv.status === 'paid').length || 0;
      const totalRevenue = invoices?.reduce((sum, inv) => {
        return inv.status === 'paid' ? sum + (inv.total || 0) : sum;
      }, 0) || 0;

      setStats({
        totalCustomers: customerCount || 0,
        totalInvoices,
        paidInvoices,
        totalRevenue
      });

      if (invoices) {
        setInvoices(invoices.map(invoice => ({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          date: invoice.date,
          customer_name: invoice.customers?.name,
          total: invoice.total,
          status: invoice.status,
          due_date: invoice.due_date
        })));
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    return invoice.status.toLowerCase() === filter.toLowerCase();
  });

  

  return (
    <div style={{ padding: '24px' }}>
      <h2>Dashboard</h2>
      <p>Welcome, {user?.user_metadata?.display_name || user?.email}</p>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card>
            <Statistic
              title="Total Customers"
              value={stats.totalCustomers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card>
            <Statistic
              title="Total Invoices"
              value={stats.totalInvoices}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card>
            <Statistic
              title="Paid Invoices"
              value={stats.paidInvoices}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>
      
      <Space direction="vertical" style={{ width: '100%', marginTop: '24px' }} size="large"/>
      <Space direction="horizontal" align="center" style={{ width: '100%', marginTop: '24px', justifyContent: 'space-between' }} size="large">
      <h2 style={{ margin: 8 }}>Invoices</h2> 
      <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
      Create Invoice</Button></Space>
      <Space direction="vertical" style={{ width: '100%', marginTop: '24px' }} size="large"></Space>
        <Segmented
          options={[
            { label: 'All', value: 'all' },
            { label: 'Paid', value: 'paid' },
            { label: 'Unpaid', value: 'unpaid' }
          ]}
          value={filter}
          onChange={value => setFilter(value.toString())}
        />
        
      <Space direction="vertical" style={{ width: '100%', marginTop: '24px' }} size="large">
      <Row gutter={[16, 16]}>
        {filteredInvoices.map(invoice => (
          <Col xs={24} key={invoice.id}>
            <Card
              hoverable
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Space direction="vertical" style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{invoice.company_name}</div>
                  <div>{invoice.invoice_number}</div>
                  <div>{invoice.due_date}</div>
                </Space>
                <Space direction="vertical" align="end">
                  <Tag color={invoice.status === 'paid' ? 'green' : 'orange'}>
                    {invoice.status.toUpperCase()}
                  </Tag>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    ${invoice.total.toFixed(2)}
                  </div>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      </Space>
    </div>
    
      
   
  );
};

export default Dashboard;