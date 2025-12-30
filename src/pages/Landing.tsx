import React from 'react';
import { Typography, Button, Row, Col, Card, Space } from 'antd';
import { Link } from 'react-router-dom';
import { FileTextOutlined, TeamOutlined, MobileOutlined, CloudDownloadOutlined, DollarOutlined } from '@ant-design/icons';
import { Helmet } from 'react-helmet';
import hippoImage from '../assets/hippo_art.svg';


const { Title, Paragraph } = Typography;

const Landing: React.FC = () => {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 

        width: '100vw', // Ensures it occupies full width
        padding: '2rem',
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          width: '100%', 
          textAlign: 'center' // Ensures text stays centered
        }}>
          <Helmet>
            <title>Hippo Invoice Maker - Simple & Professional Invoice Management</title>
          </Helmet>
  
          <Row gutter={[24, 48]} align="middle" justify="center">
            <Col xs={24} lg={12}>
              <Title level={1}>Professional Invoicing Made Simple</Title>
              <Paragraph style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
                Create, manage, and share professional invoices in minutes. Perfect for freelancers and small businesses.
              </Paragraph>
              <Space size="large">
                <Link to="/signup">
                  <Button type="primary" size="large">Get Started Free</Button>
                </Link>
                <Link to="/login">
                  <Button size="large">Login</Button>
                </Link>
              </Space>
            </Col>
            <Col xs={24} lg={12} style={{ display: 'flex', justifyContent: 'center' }}>
              <img 
                src={hippoImage}
                alt="Hippo Invoice Preview"
                style={{ width: '100%', maxWidth: '600px', borderRadius: '8px' }}
              />
            </Col>
          </Row>
  
          <Row gutter={[24, 24]} style={{ marginTop: '4rem' }} justify="center">
            <Col span={24}>
              <Title level={2} style={{ marginBottom: '3rem' }}>Why Choose Hippo?</Title>
            </Col>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={index} style={{ display: 'flex', justifyContent: 'center' }}>
                <Card hoverable style={{ height: '100%', textAlign: 'center' }}>
                  <feature.icon style={{ fontSize: '2rem', color: '#1890ff', marginBottom: '1rem' }} />
                  <Title level={4}>{feature.title}</Title>
                  <Paragraph>{feature.description}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
  
          <Row style={{ marginTop: '4rem' }} justify="center">
            <Col span={24}>
              <Title level={2}>Ready to Streamline Your Invoicing?</Title>
              <Paragraph style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
                Join thousands of satisfied users who trust Hippo for their invoicing needs.
              </Paragraph>
              <Link to="/signup">
                <Button type="primary" size="large">Start Your Free Account</Button>
              </Link>
            </Col>
          </Row>
        </div>
      </div>
    );
  };

const features = [
  {
    icon: FileTextOutlined,
    title: 'Multi-Company Support',
    description: 'Manage multiple businesses under one account. Perfect for entrepreneurs with diverse ventures.'
  },
  {
    icon: TeamOutlined,
    title: 'Customer Management',
    description: 'Organize your customers efficiently with detailed profiles and history tracking.'
  },
  {
    icon: CloudDownloadOutlined,
    title: 'PDF Generation & Sharing',
    description: 'Generate professional PDF invoices and share them instantly with your clients.'
  },
  {
    icon: MobileOutlined,
    title: 'Mobile Responsive',
    description: 'Access and manage your invoices from any device with our responsive design.'
  },
  {
    icon: DollarOutlined,
    title: 'Payment Tracking',
    description: 'Keep track of paid and pending invoices with our intuitive payment management system.'
  }
];

export default Landing;