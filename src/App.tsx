//import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout } from 'antd';
//import { useMediaQuery } from 'react-responsive';
import {
  HomeOutlined,
  FileOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CreateCustomer from './pages/CreateCustomer';
import InvoiceList from './pages/InvoiceList';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import CreateCompany from './pages/CreateCompany';
import UpdateProfile from './components/UpdateProfile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Segmented } from 'antd';
import React from 'react';

const { Header, Content } = Layout;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function MainLayout() {
  const navigate = useNavigate();

  const menuItems = [
    {
      key: '1',
      icon: <HomeOutlined />,
      label: 'Dashboard',
      value: '/',
    },
    {
      key: '2',
      icon: <FileOutlined />,
      label: 'Invoices',
      value: '/invoices',
    },
    {
      key: '3',
      icon: <SettingOutlined />,
      label: 'Settings',
      value: '/settings',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        padding: '0 16px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Hippo</div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', margin: '0 48px' }}>
          <Segmented
            options={menuItems.map(item => ({
              label: (
                <div style={{ padding: '4px 0' }}>
                  {React.cloneElement(item.icon, { style: { marginRight: 4 } })}
                  <span>{item.label}</span>
                </div>
              ),
              value: item.value
            }))}
            value={location.pathname}
            onChange={(value: string) => navigate(value)}
            style={{ backgroundColor: '#ffffff' }}
          />
        </div>
        
      </Header>
      <Content style={{ 
        marginTop: 64,
        background: '#fff',
        padding: 24,
        borderRadius: 4
      }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers/new" element={<CreateCustomer />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/new" element={<CreateInvoice />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<UpdateProfile isEditing={false} setIsEditing={() => {}} />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/companies/new" element={<CreateCompany />} />
        </Routes>
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
