import { createClient } from '@supabase/supabase-js'

// ─── REPLACE THESE WITH YOUR SUPABASE PROJECT VALUES ───────────────────────
// Get these from: https://supabase.com → Your Project → Settings → API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'
// ────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── SUPABASE SQL SCHEMA ─────────────────────────────────────────────────────
// Run this SQL in your Supabase SQL Editor to set up the database:
//
// -- 1. Profiles table (linked to auth.users)
// CREATE TABLE profiles (
//   id UUID REFERENCES auth.users PRIMARY KEY,
//   name TEXT NOT NULL,
//   role TEXT NOT NULL DEFAULT 'salesperson', -- 'admin' or 'salesperson'
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- 2. SKU / Inventory table
// CREATE TABLE skus (
//   id BIGSERIAL PRIMARY KEY,
//   description TEXT NOT NULL,
//   uom TEXT NOT NULL DEFAULT 'NOS',
//   tax_rate NUMERIC DEFAULT 0.18,
//   hsn_code TEXT,
//   mrp NUMERIC DEFAULT 0,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_skus_description ON skus USING gin(to_tsvector('english', description));
//
// -- 3. Clients table
// CREATE TABLE clients (
//   id BIGSERIAL PRIMARY KEY,
//   customer_code TEXT UNIQUE NOT NULL,
//   name TEXT NOT NULL,
//   address TEXT,
//   city TEXT,
//   state TEXT DEFAULT 'Maharashtra',
//   pincode TEXT,
//   gst_no TEXT,
//   pan_no TEXT,
//   phone TEXT,
//   contact_person TEXT,
//   email TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- 4. Sales Orders table
// CREATE TABLE sales_orders (
//   id BIGSERIAL PRIMARY KEY,
//   so_number TEXT UNIQUE NOT NULL,
//   so_date DATE NOT NULL DEFAULT CURRENT_DATE,
//   salesperson_id UUID REFERENCES profiles(id),
//   salesperson_name TEXT,
//   client_id BIGINT REFERENCES clients(id),
//   client_snapshot JSONB,  -- snapshot of client data at time of order
//   items JSONB NOT NULL DEFAULT '[]',
//   total_qty NUMERIC DEFAULT 0,
//   status TEXT DEFAULT 'draft',  -- draft, submitted, confirmed, locked
//   notes TEXT,
//   po_no TEXT,
//   po_date DATE,
//   payment_terms TEXT DEFAULT 'Net-30',
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- 5. Row Level Security
// ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
// ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
// ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
// ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
//
// -- Profiles: users can read their own, admins can read all
// CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
// CREATE POLICY "Admins read all profiles" ON profiles FOR SELECT USING (
//   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
// );
// CREATE POLICY "Admins insert profiles" ON profiles FOR INSERT WITH CHECK (
//   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
// );
// CREATE POLICY "Admins update profiles" ON profiles FOR ALL USING (
//   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
// );
//
// -- Sales Orders: salesperson sees own, admin sees all
// CREATE POLICY "Salesperson own orders" ON sales_orders FOR ALL USING (
//   salesperson_id = auth.uid() OR
//   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
// );
//
// -- SKUs and clients: all authenticated users can read
// CREATE POLICY "Auth users read skus" ON skus FOR SELECT USING (auth.role() = 'authenticated');
// CREATE POLICY "Admins manage skus" ON skus FOR ALL USING (
//   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
// );
// CREATE POLICY "Auth users read clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
// CREATE POLICY "Admins manage clients" ON clients FOR ALL USING (
//   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
// );
//
// -- 6. Create first admin user manually in Supabase Auth, then run:
// -- INSERT INTO profiles (id, name, role) VALUES ('<user-uuid>', 'Admin', 'admin');
// ─────────────────────────────────────────────────────────────────────────────
