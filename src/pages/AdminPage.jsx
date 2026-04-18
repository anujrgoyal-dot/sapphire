import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generateSaleOrderPDF, previewSaleOrderPDF } from '../lib/pdfGenerator'
import * as XLSX from 'xlsx'

export default function AdminPage() {
  const [tab, setTab] = useState('orders')
  return (
    <div className="page-content">
      <div className="section-title mb-3">Admin Panel</div>
      <div className="tab-bar">
        {[{ id: 'orders', label: '📋 Quotations' }, { id: 'clients', label: '👥 Clients' }, { id: 'inventory', label: '📦 Inventory' }, { id: 'users', label: '👤 Users' }].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'orders' && <AdminOrders />}
      {tab === 'clients' && <AdminClients />}
      {tab === 'inventory' && <AdminInventory />}
      {tab === 'users' && <AdminUsers />}
    </div>
  )
}

// ── ADMIN ORDERS ──────────────────────────────────────────────────────────────
function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    setLoading(true)
    const { data } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('sales_orders').update({ status }).eq('id', id)
    fetchOrders()
  }

  function exportToExcel(ordersToExport) {
    const rows = []
    ordersToExport.forEach(order => {
      const client = order.client_snapshot || {}
      ;(order.items || []).forEach((item, i) => {
        const qty = Number(item.quantity) || 0
        const price = Number(item.price) || 0
        const disc = Number(item.discount) || 0
        const taxRate = Number(item.tax_rate) || 0.18
        const taxableValue = qty * price * (1 - disc / 100)
        const gstAmt = taxableValue * taxRate
        rows.push({
          'Quotation No': order.so_number,
          'Date': order.so_date,
          'Salesperson': order.salesperson_name,
          'Status': order.status,
          'Customer Code': client.customer_code,
          'Customer Name': client.name,
          'GST No': client.gst_no,
          'Phone': client.phone,
          'S.No': i + 1,
          'Item Description': item.description,
          'HSN': item.hsn_code,
          'UOM': item.uom,
          'Qty': qty,
          'Price': price,
          'Disc %': disc,
          'GST %': (taxRate * 100).toFixed(0),
          'Taxable Value': taxableValue.toFixed(2),
          'GST Amount': gstAmt.toFixed(2),
          'Total Value': (taxableValue + gstAmt).toFixed(2),
          'Remarks': order.notes || '',
          'Payment Terms': order.payment_terms,
        })
      })
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Quotations')

    // Auto column widths
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }))
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `Sapphire_Quotations_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const statusColor = { draft: 'badge-draft', submitted: 'badge-submitted', confirmed: 'badge-confirmed', locked: 'badge-locked' }

  return (
    <div>
      <div className="flex-between mb-3">
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{orders.length} quotations</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel(filtered)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Excel
          </button>
        </div>
      </div>

      <div className="tab-bar" style={{ marginBottom: 12 }}>
        {['all', 'draft', 'submitted', 'confirmed', 'locked'].map(f => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ fontSize: 11 }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? orders.length : orders.filter(o => o.status === f).length})
          </button>
        ))}
      </div>

      {loading ? <div className="flex-center" style={{ padding: 40 }}><div className="spinner"></div></div> :
        filtered.map(order => {
          const client = order.client_snapshot || {}
          return (
            <div key={order.id} className="card mb-3">
              <div className="card-body">
                <div className="flex-between mb-2">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{order.so_number}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(order.so_date).toLocaleDateString('en-IN')} · {order.salesperson_name}
                    </div>
                  </div>
                  <span className={`badge ${statusColor[order.status] || 'badge-draft'}`}>{order.status}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{client.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {(order.items || []).length} items · Qty: {Number(order.total_qty || 0).toFixed(0)}
                  {order.total_value ? ` · ₹${Number(order.total_value).toLocaleString('en-IN')}` : ''}
                </div>
                {order.notes && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>"{order.notes}"</div>}
                <div className="divider" style={{ margin: '10px 0' }} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => previewSaleOrderPDF(order)}>👁️ Preview</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => generateSaleOrderPDF(order)}>📥 Download</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => exportToExcel([order])}>📊 Excel</button>
                  {order.status === 'submitted' && (
                    <button className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)' }} onClick={() => updateStatus(order.id, 'confirmed')}>✓ Confirm</button>
                  )}
                  {order.status === 'confirmed' && (
                    <button className="btn btn-sm" style={{ background: '#f0e8ff', color: '#5020a0' }} onClick={() => updateStatus(order.id, 'locked')}>🔒 Lock</button>
                  )}
                  {order.status === 'locked' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(order.id, 'confirmed')}>🔓 Unlock</button>
                  )}
                  {['draft', 'submitted'].includes(order.status) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(order.id, 'draft')}>↩ Draft</button>
                  )}
                </div>
              </div>
            </div>
          )
        })
      }
    </div>
  )
}

// ── ADMIN CLIENTS ─────────────────────────────────────────────────────────────
function AdminClients() {
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const fileRef = useRef(null)
  const emptyForm = { customer_code: '', name: '', address: '', city: '', state: 'Maharashtra', pincode: '', gst_no: '', pan_no: '', phone: '', contact_person: '', email: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').order('name').limit(8000)
    setClients(data || [])
  }

  async function saveClient() {
    setSaving(true)
    if (editing) await supabase.from('clients').update(form).eq('id', editing)
    else await supabase.from('clients').insert(form)
    setSaving(false)
    setShowForm(false)
    fetchClients()
  }

  async function deleteClient(id) {
    if (!confirm('Delete this client?')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  async function handleClientExcelUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true); setUploadError(''); setUploadSuccess(''); setUploadProgress('Reading Excel file...')
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })

      // Detect header row to map columns flexibly
      // Map your exact column headers
      // Columns: Customer Code, Customer Name, Address, Contact Person No, Email ID, Contact Person, GSTIN no.
      const headers = rows[0].map(h => String(h || '').trim())
      const col = (names) => {
        const idx = headers.findIndex(h => names.some(n => h.toLowerCase() === n.toLowerCase() || h.toLowerCase().includes(n.toLowerCase())))
        return idx >= 0 ? idx : -1
      }

      const codeCol    = col(['Customer Code', 'Cust Code', 'Code'])
      const nameCol    = col(['Customer Name', 'Cust Name', 'Name'])
      const addressCol = col(['Address', 'Addr'])
      const cityCol    = col(['City'])
      const stateCol   = col(['State'])
      const pincodeCol = col(['Pincode', 'Pin', 'Zip'])
      const gstCol     = col(['GSTIN no.', 'GSTIN', 'GST No', 'GST'])
      const panCol     = col(['PAN', 'Pan No'])
      // Use exact match first to avoid 'Contact Person' matching 'Contact Person No'
      const phoneCol   = headers.findIndex(h => h.trim() === 'Contact Person No' || h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile'))
      const contactCol = headers.findIndex(h => h.trim() === 'Contact Person' || h.toLowerCase() === 'contact name')
      const emailCol   = col(['Email ID', 'Email', 'Mail'])

      if (nameCol === -1) {
        setUploadError('Could not find "Customer Name" column. Please check your Excel file.')
        setUploading(false)
        return
      }

      const dataRows = rows.slice(1).filter(r => r[nameCol])
      setUploadProgress(`Found ${dataRows.length} customers. Uploading...`)

      const BATCH = 200
      for (let i = 0; i < dataRows.length; i += BATCH) {
        const batch = dataRows.slice(i, i + BATCH).map(r => ({
          customer_code: codeCol >= 0 ? String(r[codeCol] || '').trim() : '',
          name:          String(r[nameCol] || '').trim(),
          address:       addressCol >= 0 ? String(r[addressCol] || '').trim() : '',
          city:          cityCol >= 0 ? String(r[cityCol] || '').trim() : '',
          state:         stateCol >= 0 ? String(r[stateCol] || '').trim() : 'Maharashtra',
          pincode:       pincodeCol >= 0 ? String(r[pincodeCol] || '').trim() : '',
          gst_no:        gstCol >= 0 ? String(r[gstCol] || '').trim() : '',
          pan_no:        panCol >= 0 ? String(r[panCol] || '').trim() : '',
          phone:         phoneCol >= 0 ? String(r[phoneCol] || '').replace(/^91/, '').trim() : '',
          contact_person: contactCol >= 0 ? String(r[contactCol] || '').trim() : '',
          email:         emailCol >= 0 ? String(r[emailCol] || '').trim() : '',
        })).filter(r => r.name)

        const withCode    = batch.filter(r => r.customer_code)
        const withoutCode = batch.filter(r => !r.customer_code)

        if (withCode.length > 0) {
          // Upsert: update if customer_code exists, insert if new
          await supabase.from('clients').upsert(withCode, {
            onConflict: 'customer_code',
            ignoreDuplicates: false
          })
        }
        if (withoutCode.length > 0) {
          // No code — only insert if name doesn't already exist
          for (const c of withoutCode) {
            const { data: existing } = await supabase.from('clients').select('id').ilike('name', c.name).limit(1)
            if (!existing || existing.length === 0) {
              await supabase.from('clients').insert(c)
            } else {
              await supabase.from('clients').update(c).eq('id', existing[0].id)
            }
          }
        }
        setUploadProgress(`Uploaded ${Math.min(i + BATCH, dataRows.length)} / ${dataRows.length} customers...`)
      }

      setUploadSuccess(`✓ Successfully uploaded ${dataRows.length} customers!`)
      fetchClients()
    } catch (err) {
      setUploadError('Error: ' + err.message)
    }
    setUploading(false)
    setUploadProgress('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_code || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex-between mb-3">
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{clients.length} clients</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowUpload(!showUpload)}>📊 Upload Excel</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true) }}>+ Add Client</button>
        </div>
      </div>

      {/* Excel Upload Section */}
      {showUpload && (
        <div className="card mb-3">
          <div className="card-header"><div className="card-title">Upload Clients from Excel</div></div>
          <div className="card-body">
            <div className="alert alert-warning mb-3">
              ⚠️ Existing customers with same Customer Code will be updated. New ones will be added. No deletions.
            </div>
            {uploadError && <div className="alert alert-error">{uploadError}</div>}
            {uploadSuccess && <div className="alert alert-success">{uploadSuccess}</div>}
            {uploadProgress && (
              <div style={{ fontSize: 13, color: 'var(--navy)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>
                {uploadProgress}
              </div>
            )}
            <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 12 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upload Customer Excel</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>.xlsx file with customer data</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleClientExcelUpload} disabled={uploading} style={{ display: 'none' }} id="client-upload" />
              <label htmlFor="client-upload" className="btn btn-primary btn-sm" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
                {uploading ? 'Uploading...' : 'Choose File'}
              </label>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              <strong>Accepted columns (any order):</strong> Customer Code, Customer Name, Address, City, State, Pincode, GST Number, PAN Number, Phone, Contact Person, Email
            </div>
          </div>
        </div>
      )}

      <div className="search-box mb-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" className="form-input" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.map(c => (
        <div key={c.id} className="card mb-2">
          <div className="card-body" style={{ padding: 12 }}>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.customer_code} · {c.city} · {c.phone}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>GST: {c.gst_no}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ ...c }); setEditing(c.id); setShowForm(true) }}>Edit</button>
                <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }} onClick={() => deleteClient(c.id)}>Del</button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-sheet">
            <div className="modal-handle"></div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{editing ? 'Edit Client' : 'Add New Client'}</div>
            {[['customer_code', 'Customer Code *'], ['name', 'Customer Name *'], ['address', 'Address'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'], ['gst_no', 'GST Number'], ['pan_no', 'PAN Number'], ['phone', 'Phone'], ['contact_person', 'Contact Person'], ['email', 'Email']].map(([key, label]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-ghost btn-full" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={saveClient} disabled={saving || !form.name || !form.customer_code}>
                {saving ? 'Saving...' : 'Save Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ADMIN INVENTORY ───────────────────────────────────────────────────────────
function AdminInventory() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [skuCount, setSkuCount] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    supabase.from('skus').select('*', { count: 'exact', head: true }).then(({ count }) => setSkuCount(count))
  }, [])

  async function handleExcelUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true); setError(''); setSuccess(''); setProgress('Reading Excel file...')
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const dataRows = rows.slice(1).filter(r => r[0])
      setProgress(`Found ${dataRows.length} SKUs. Uploading...`)
      await supabase.from('skus').delete().neq('id', 0)
      const BATCH = 500
      for (let i = 0; i < dataRows.length; i += BATCH) {
        const batch = dataRows.slice(i, i + BATCH).map(r => ({
          description: String(r[0] || '').trim(),
          uom: String(r[1] || 'NOS').trim(),
          tax_rate: parseFloat(r[2]) || 0,
          hsn_code: String(r[3] || '').replace(/\.0$/, ''),
          mrp: parseFloat(r[4]) || 0,
        })).filter(r => r.description)
        await supabase.from('skus').insert(batch)
        setProgress(`Uploaded ${Math.min(i + BATCH, dataRows.length)} / ${dataRows.length} SKUs...`)
      }
      setSuccess(`✓ Successfully uploaded ${dataRows.length} SKUs!`)
      setSkuCount(dataRows.length)
    } catch (err) { setError('Error: ' + err.message) }
    setUploading(false); setProgress('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <div className="card mb-3">
        <div className="card-body">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Current Inventory</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy)' }}>{skuCount !== null ? skuCount.toLocaleString('en-IN') : '...'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total SKUs in database</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Update Inventory / MRP</div></div>
        <div className="card-body">
          <div className="alert alert-warning mb-3">⚠️ Uploading a new Excel will REPLACE all existing SKUs.</div>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          {progress && <div style={{ fontSize: 13, color: 'var(--navy)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>{progress}</div>}
          <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 12 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upload Excel File</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>.xlsx with inventory & MRP</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} disabled={uploading} style={{ display: 'none' }} id="inv-upload" />
            <label htmlFor="inv-upload" className="btn btn-primary btn-sm" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
              {uploading ? 'Uploading...' : 'Choose File'}
            </label>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}><strong>Expected columns:</strong> A=Item Description, B=UOM, C=Tax Rate, D=HSN Code, E=MRP</div>
        </div>
      </div>
    </div>
  )
}

// ── ADMIN USERS ───────────────────────────────────────────────────────────────
function AdminUsers() {
  const [users, setUsers] = useState([])
  useEffect(() => {
    supabase.from('profiles').select('*').order('name').then(({ data }) => setUsers(data || []))
  }, [])

  return (
    <div>
      <div className="alert alert-warning mb-3">
        <div>
          <strong>To add a new salesperson:</strong><br />
          1. Supabase Dashboard → Authentication → Users → Add User<br />
          2. Enter email & password → Create User<br />
          3. Copy their UUID → SQL Editor → run:<br />
          <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4, display: 'block', marginTop: 6 }}>
            INSERT INTO profiles (id, name, role) VALUES ('uuid', 'Name', 'salesperson');
          </code>
        </div>
      </div>
      {users.map(u => (
        <div key={u.id} className="card mb-2">
          <div className="card-body" style={{ padding: 12 }}>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.role}</div>
              </div>
              <span className={`badge ${u.role === 'admin' ? 'badge-locked' : 'badge-submitted'}`}>{u.role}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
