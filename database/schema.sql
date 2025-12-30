-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (handled by Supabase Auth)
-- Note: This is automatically created by Supabase, shown here for reference
-- CREATE TABLE auth.users (
--   id uuid NOT NULL PRIMARY KEY,
--   email text,
--   created_at timestamp with time zone,
--   updated_at timestamp with time zone
-- );

-- Create companies table
CREATE TABLE companies (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  logo_url text,
  bank_details text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create customers table
CREATE TABLE customers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoices table
CREATE TABLE invoices (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number text NOT NULL,
  date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal numeric(10,2) NOT NULL,
  tax_rate numeric(5,2),
  tax_amount numeric(10,2),
  total numeric(10,2) NOT NULL,
  notes text,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoice_items table
CREATE TABLE invoice_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  amount numeric(10,2) NOT NULL,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoice_payments table
CREATE TABLE invoice_payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  payment_method text,
  payment_remarks text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoice_shares table
CREATE TABLE invoice_shares (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone
);

-- Create RLS policies
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_shares ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for invoice_payments table
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoice payments"
  ON invoice_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_payments.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can create payments for their own invoices"
  ON invoice_payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_payments.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own invoice payments"
  ON invoice_payments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_payments.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own invoice payments"
  ON invoice_payments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_payments.invoice_id
    AND invoices.user_id = auth.uid()
  ));

-- Invoice shares policies
CREATE POLICY "Anyone can view shared invoices"
  ON invoice_shares FOR SELECT
  USING (true);

CREATE POLICY "Users can create invoice shares"
  ON invoice_shares FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own invoice shares"
  ON invoice_shares FOR DELETE
  USING (auth.uid() = created_by);

-- Companies policies
CREATE POLICY "Users can view their own companies"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- Customers policies
CREATE POLICY "Users can view their own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Invoice items policies
CREATE POLICY "Users can view their own invoice items"
  ON invoice_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own invoice items"
  ON invoice_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own invoice items"
  ON invoice_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own invoice items"
  ON invoice_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

-- Add policies for public access to shared invoices and related data
CREATE POLICY "Public can view shared invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoice_shares
      WHERE invoice_shares.invoice_id = invoices.id
      AND invoice_shares.token = current_setting('app.current_share_token', true)
      AND (invoice_shares.expires_at IS NULL OR invoice_shares.expires_at > NOW())
    )
  );

CREATE POLICY "Public can view companies of shared invoices"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN invoice_shares ON invoice_shares.invoice_id = invoices.id
      WHERE invoices.company_id = companies.id
      AND invoice_shares.token = current_setting('app.current_share_token', true)
      AND (invoice_shares.expires_at IS NULL OR invoice_shares.expires_at > NOW())
    )
  );

CREATE POLICY "Public can view customers of shared invoices"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN invoice_shares ON invoice_shares.invoice_id = invoices.id
      WHERE invoices.customer_id = customers.id
      AND invoice_shares.token = current_setting('app.current_share_token', true)
      AND (invoice_shares.expires_at IS NULL OR invoice_shares.expires_at > NOW())
    )
  );

CREATE POLICY "Public can view items of shared invoices"
  ON invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoice_shares
      WHERE invoice_shares.invoice_id = invoice_items.invoice_id
      AND invoice_shares.token = current_setting('app.current_share_token', true)
      AND (invoice_shares.expires_at IS NULL OR invoice_shares.expires_at > NOW())
    )
  );