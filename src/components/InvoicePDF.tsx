import { Row, Col, Typography, Table } from 'antd';
import { useState, useEffect, useRef } from 'react';

interface Company {
  name: string;
  address: string;
  email: string;
  phone: string;
  logo_url?: string;
  bank_name?: string;
  bank_account?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    date: string;
    due_date: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
  };
  company: Company;
  customer: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  items: InvoiceItem[];
}

const { Title, Text } = Typography;

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, company, customer, items }) => {
  const [logoLoaded, setLogoLoaded] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);
  const logoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (company.logo_url && !logoLoaded) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Create a canvas to properly encode the image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          // Update the logo with properly encoded data
          if (logoRef.current) {
            logoRef.current.src = canvas.toDataURL('image/png');
          }
          setLogoLoaded(true);
          setLogoError(false);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load company logo');
        setLogoError(true);
        setLogoLoaded(false);
      };
      img.src = company.logo_url;
    }
  }, [company.logo_url, logoLoaded]);

  const columns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: '15%',
      render: () => invoice.date,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      width: '10%',
    },
    {
      title: 'Unit price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right' as const,
      width: '15%',
      render: (price: number) => `${price.toFixed(2)}`,
    },
    {
      title: 'VAT %',
      dataIndex: 'vat',
      key: 'vat',
      align: 'right' as const,
      width: '10%',
      render: () => `${invoice.tax_rate}%`,
    },
    {
      title: 'Total',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      width: '10%',
      render: (amount: number) => `${amount.toFixed(2)}`,
    },
  ];


  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '10mm',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      fontSize: '12px',
      color: '#000000',
      boxSizing: 'border-box'
    }}>
      <Row justify="space-between" align="top" style={{ marginBottom: '15px', backgroundColor:'#ffffff' }}>
        <Col>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            {company.logo_url && !logoError ? (
              <div>
                <img 
                  ref={logoRef}
                  src={company.logo_url} 
                  alt={company.name} 
                  style={{
                    width: '64px',
                    height: '64px',
                    marginRight: '8px',
                    objectFit: 'contain',
                    display: logoLoaded ? 'block' : 'none',
                    backgroundColor: '#ffffff',
                    border: '1px solid #f0f0f0',
                    padding: '4px'
                  }}
                />
                {!logoLoaded && (
                  <div 
                    className="fallback-logo"
                    style={{
                      width: '64px',
                      height: '64px',
                      backgroundColor: '#d7cabe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '8px',
                      border: '1px solid #f0f0f0',
                      borderRadius : 50
                    }}
                  >
                    <div style={{ color: '#000000', fontWeight: 'bold', fontSize: '24px' }}>
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="fallback-logo"
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '8px',
                  border: '1px solid #f0f0f0'
                }}
              >
                <div style={{ color: '#666666', fontWeight: 'bold', fontSize: '24px' }}>
                  {company.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <Title level={5} style={{ margin: 0, color: '#d7cabe', fontSize: '14px' }}>{company.name}</Title>
          </div>
          <div style={{ marginTop: '8px', fontSize: '9px', lineHeight: '1.2' }}>
            <Text>{customer.name}</Text><br />
            <Text>{customer.address}</Text><br />
            <Text>{customer.email}</Text><br />
            <Text>{customer.phone}</Text><br />
          </div>
        </Col>
        <Col>
          <Title level={5} style={{ margin: 0, color: '#000000', textAlign: 'right', fontSize: '16px' }}>INVOICE</Title>
          <div style={{ marginTop: '4px', textAlign: 'right', lineHeight: '1.2', fontSize: '9px' }}>
            <Text>Invoice number: </Text><Text>{invoice.invoice_number}</Text><br />
            <Text>Invoice date: </Text><Text>{invoice.date}</Text><br />
            <Text>Due date: </Text><Text>{invoice.due_date}</Text><br />
          </div>
        </Col>
      </Row>

      <Text style={{ fontSize: '12px' }}>Thank you for your business!</Text>

      <Table
        columns={columns}
        dataSource={items.map((item, index) => ({ ...item, key: `item-${index}` }))}
        pagination={false}
        bordered
        size="small"
        style={{
          marginTop: '8px',
          marginBottom: '16px',
          width: '100%',
          tableLayout: 'fixed',
          fontSize: '12px',
          backgroundColor: '#ffffff'
        }}
        className="invoice-table"
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row key="subtotal">
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                <Text strong style={{ fontSize: '12px' }}>Total excl. VAT</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2} align="right">
                <Text style={{ fontSize: '12px', paddingRight: '8px' }}>{invoice.subtotal.toFixed(2)} </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
            <Table.Summary.Row key="vat">
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                <Text strong style={{ fontSize: '12px' }}>VAT {invoice.tax_rate}%</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2} align="right">
                <Text style={{ fontSize: '12px', paddingRight: '8px' }}>{invoice.tax_amount.toFixed(2)} </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
            <Table.Summary.Row key="total">
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                <Text strong style={{ fontSize: '12px' }}>Total amount due</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2} align="right">
                <Text strong style={{ fontSize: '12px', paddingRight: '8px' }}>{invoice.total.toFixed(2)} </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      <div style={{ 
        position: 'absolute',
        bottom: '8mm',
        left: '8mm',
        right: '8mm',
        borderTop: '1px solid #f0f0f0',
        paddingTop: '8px',
        fontSize: '12px',
        lineHeight: '1.2'
      }}>
        <Row justify="space-between">
          <Col span={12}>
            <Text strong>{company.name}</Text><br />
            <Text>{company.address}</Text><br />
            <Text>{company.email}</Text><br />
            <Text>{company.phone}</Text><br />
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Text strong>Payment details</Text><br />
            <Text>Bank: {company.bank_name || 'default bank name'}</Text><br />
            <Text>IBAN: {company.bank_account || 'bank account details'}</Text>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default InvoicePDF;