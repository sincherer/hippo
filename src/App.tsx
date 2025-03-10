import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import PublicInvoicePreview from './pages/PublicInvoicePreview';
import React from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/invoice/share/:shareToken" element={<PublicInvoicePreview />} />
        <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><MainLayout><InvoiceList /></MainLayout></ProtectedRoute>} />
        <Route path="/invoices/new" element={<ProtectedRoute><MainLayout><CreateInvoice /></MainLayout></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute><MainLayout><InvoiceDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><MainLayout><CustomerList /></MainLayout></ProtectedRoute>} />
        <Route path="/customers/create" element={<ProtectedRoute><MainLayout><CreateCustomer /></MainLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
        <Route path="/companies/create" element={<ProtectedRoute><MainLayout><CreateCompany /></MainLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><MainLayout><UpdateProfile isEditing={false} setIsEditing={() => {}} /></MainLayout></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
