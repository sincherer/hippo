import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

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

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
    fontSize: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  logo: {
    width: 120,
    height: 60,
    objectFit: 'contain',
    marginBottom: 10
  },
  companyName: {
    fontSize: 20,
    marginBottom: 10,
    color: '#333333'
  },
  title: {
    fontSize: 24,
    textAlign: 'right',
    marginBottom: 10
  },
  text: {
    fontSize: 10,
    lineHeight: 1.4,
    marginBottom: 3
  },
  table: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
    display: 'flex',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderBottomStyle: 'solid',
    minHeight: 30,
    alignItems: 'center'
  },
  tableHeader: {
    backgroundColor: '#fafafa',
    fontWeight: 'bold'
  },
  tableCell: {
    padding: 8,
    fontSize: 9
  },
  descriptionCell: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0'
  },
  dateCell: {
    width: '15%',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    textAlign: 'center'
  },
  qtyCell: {
    width: '10%',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    textAlign: 'center'
  },
  priceCell: {
    width: '15%',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    textAlign: 'right'
  },
  vatCell: {
    width: '10%',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    textAlign: 'center'
  },
  totalCell: {
    width: '15%',
    textAlign: 'right'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderTopStyle: 'solid',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, company, customer, items }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {company.logo_url && (
              <Image src={company.logo_url} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.text}>{customer.name}</Text>
            <Text style={styles.text}>{customer.address}</Text>
            <Text style={styles.text}>{customer.email}</Text>
            <Text style={styles.text}>{customer.phone}</Text>
          </View>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.text}>Invoice number: {invoice.invoice_number}</Text>
            <Text style={styles.text}>Invoice date: {invoice.date}</Text>
            <Text style={styles.text}>Due date: {invoice.due_date}</Text>
          </View>
        </View>

        <Text style={styles.text}>Thank you for your business!</Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.descriptionCell]}>Description</Text>
            <Text style={[styles.tableCell, styles.dateCell]}>Date</Text>
            <Text style={[styles.tableCell, styles.qtyCell]}>Qty</Text>
            <Text style={[styles.tableCell, styles.priceCell]}>Unit price</Text>
            <Text style={[styles.tableCell, styles.vatCell]}>VAT %</Text>
            <Text style={[styles.tableCell, styles.totalCell]}>Total</Text>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.descriptionCell]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.dateCell]}>{invoice.date}</Text>
              <Text style={[styles.tableCell, styles.qtyCell]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.priceCell]}>{item.unit_price.toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.vatCell]}>{invoice.tax_rate}%</Text>
              <Text style={[styles.tableCell, styles.totalCell]}>{item.amount.toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { textAlign: 'right', width: '90%' }]}>Total excl. VAT</Text>
            <Text style={[styles.tableCell, styles.totalCell]}>{invoice.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { textAlign: 'right', width: '90%' }]}>VAT {invoice.tax_rate}%</Text>
            <Text style={[styles.tableCell, styles.totalCell]}>{invoice.tax_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { textAlign: 'right', width: '90%' }]}>Total amount due</Text>
            <Text style={[styles.tableCell, styles.totalCell]}>{invoice.total.toFixed(2)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;