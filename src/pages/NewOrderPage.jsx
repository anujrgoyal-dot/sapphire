import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function NewOrderPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { orderId } = useParams() // for editing existing order

  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientList, setShowClientList] = useState(false)

  const [skuSearch, setSkuSearch] = useState('')
  const [skuResults, setSkuResults] = useState([])
  const [skuLoading, setSkuLoading] = useState(false)
  const [showSkuResults, setShowSkuResults] = useState(false)

  const [orderItems, setOrderItems] = useState([])
  const [poNo, setPoNo] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net-30')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEdit, setIsEdit] = useState(false)
  const [orderStatus, setOrderStatus] = useState('draft')

  const skuSearchRef = useRef(null)
  const searchTimeout = useRef(null)

  // Load clients on mount
  useEffect(() => {
    supabase.from('clients').select('*').order('name').then(({ data }) => {
      setClients(data || [])
    })
  }, [])

  // Load existing order if editing
  useEffect(() => {
    if (orderId) {
      setIsEdit(true)
      supabase.from('sales_orders').select('*').eq('id', orderId).single().then(({ data }) => {
        if (data) {
          setOrderItems(data.items || [])
          setPoNo(data.po_no || '')
          setNotes(data.notes || '')
          setPaymentTerms(data.payment_terms || 'Net-30')
          setOrderStatus(data.status)
          // Find and set client
          if (data.client_snapshot) {
            setSelectedClient(data.client_snapshot)
            setClientSearch(data.client_snapshot.name)
          }
        }
      })
    }
  }, [orderId])

  // SKU search with debounce
  useEffect(() => {
    if (skuSearch.length < 2) { setSkuResults([]); setShowSkuResults(false); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSkuLoading(true)
      const { data } = await supabase
        .from('skus')
        .select('*')
        .ilike('description', `%${skuSearch}%`)
        .limit(30)
      setSkuResults(data || [])
      setShowSkuResults(true)
      setSkuLoading(false)
    }, 300)
    return () => clearTimeout(searchTimeout.current)
  }, [skuSearch])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.customer_code?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  function addItem(sku) {
    if (orderItems.length >= 20) {
      setError('Maximum 20 items per order')
      return
    }
    // Check if already added
    if (orderItems.find(i => i.sku_description === sku.description)) {
      setError('Item already added')
      return
    }
    setOrderItems(prev => [...prev, {
      sku_description: sku.description,
      description: sku.description,
      uom: sku.uom,
      hsn_code: sku.hsn_code,
      tax_rate: sku.tax_rate,
      mrp: sku.mrp,
      quantity: 1,
    }])
    setSkuSearch('')
    setShowSkuResults(false)
    setError('')
  }

  function updateQty(idx, val) {
    const q = parseFloat(val) || 0
    setOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: q } : item))
  }

  function removeItem(idx) {
    setOrderItems(prev => prev.filter((_, i) => i !== idx))
  }

  const totalQty = orderItems.reduce((s, i) => s + Number(i.quantity || 0), 0)

  async function saveOrder(status = 'submitted') {
    if (!selectedClient) { setError('Please select a customer'); return }
    if (orderItems.length === 0) { setError('Add at least one item'); return }
    const hasZeroQty = orderItems.some(i => !i.quantity || i.quantity <= 0)
    if (hasZeroQty) { setError('All items must have quantity > 0'); return }

    setSaving(true)
    setError('')

    const orderData = {
      so_date: new Date().toISOString().split('T')[0],
      salesperson_id: profile.id,
      salesperson_name: profile.name,
      client_id: selectedClient.id,
      client_snapshot: selectedClient,
      items: orderItems,
      total_qty: totalQty,
      status,
      po_no: poNo,
      notes,
      payment_terms: paymentTerms,
      updated_at: new Date().toISOString(),
    }

    let result
    if (isEdit) {
      result = await supabase.from('sales_orders').update(orderData).eq('id', orderId).select().single()
    } else {
      // Generate SO number
      const { count } = await supabase.from('sales_orders').select('*', { count: 'exact', head: true })
      const soNum = `SSC-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, '0')}`
      result = await supabase.from('sales_orders').insert({ ...orderData, so_number: soNum }).select().single()
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(isEdit ? 'Order updated!' : 'Order submitted successfully!')
      setTimeout(() => navigate('/orders'), 1200)
    }
    setSaving(false)
  }

  const isLocked = orderStatus === 'locked'

  return (
    <div className="page-content" style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div className="section-header mb-3">
        <div>
          <div className="section-title">{isEdit ? 'Edit Order' : 'New Sales Order'}</div>
          <div className="text-xs text-muted mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {isLocked && <span className="badge badge-locked">🔒 Locked</span>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✓ {success}</div>}

      {/* Customer Selection */}
      <div className="card mb-3">
        <div className="card-header">
          <div className="card-title">
            <span style={{ color: 'var(--accent)' }}>①</span> Customer
          </div>
          {selectedClient && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedClient(null); setClientSearch('') }} disabled={isLocked}>
              Change
            </button>
          )}
        </div>
        <div className="card-body">
          {selectedClient ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{selectedClient.name}</div>
              <div className="text-xs text-muted mt-1">{selectedClient.address}</div>
              <div className="text-xs text-muted">Code: {selectedClient.customer_code} | GST: {selectedClient.gst_no}</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search customer name or code..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientList(true) }}
                  onFocus={() => setShowClientList(true)}
                />
              </div>
              {showClientList && clientSearch.length >= 1 && (
                <div className="sku-results" style={{ position: 'absolute', zIndex: 50, width: '100%' }}>
                  {filteredClients.slice(0, 15).map(c => (
                    <div key={c.id} className="sku-result-item" onClick={() => {
                      setSelectedClient(c)
                      setClientSearch(c.name)
                      setShowClientList(false)
                    }}>
                      <div className="sku-result-name">{c.name}</div>
                      <div className="sku-result-meta">
                        <span>Code: {c.customer_code}</span>
                        <span>{c.city}</span>
                        {c.phone && <span>📞 {c.phone}</span>}
                      </div>
                    </div>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="sku-result-item text-muted text-sm">No customers found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="card mb-3">
        <div className="card-header">
          <div className="card-title"><span style={{ color: 'var(--accent)' }}>②</span> Order Details</div>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Payment Terms</label>
            <select className="form-select" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} disabled={isLocked}>
              <option value="Net-30">Net-30</option>
              <option value="Net-15">Net-15</option>
              <option value="Net-45">Net-45</option>
              <option value="Net-60">Net-60</option>
              <option value="Cash">Cash</option>
              <option value="Advance">Advance</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">PO Number (Optional)</label>
            <input className="form-input" placeholder="Customer's PO number" value={poNo} onChange={e => setPoNo(e.target.value)} disabled={isLocked} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Notes (Optional)</label>
            <textarea className="form-textarea" placeholder="Special instructions..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={isLocked} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card mb-3">
        <div className="card-header">
          <div className="card-title">
            <span style={{ color: 'var(--accent)' }}>③</span> Items
            <span className="badge badge-submitted" style={{ marginLeft: 8 }}>{orderItems.length}/20</span>
          </div>
          {totalQty > 0 && (
            <div className="text-sm text-muted">Total Qty: <strong>{totalQty.toFixed(2)}</strong></div>
          )}
        </div>
        <div className="card-body">
          {/* SKU Search */}
          {!isLocked && orderItems.length < 20 && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  ref={skuSearchRef}
                  type="text"
                  className="form-input"
                  placeholder="Search item / SKU..."
                  value={skuSearch}
                  onChange={e => setSkuSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSkuResults(false), 200)}
                />
              </div>
              {skuLoading && (
                <div style={{ textAlign: 'center', padding: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Searching...
                </div>
              )}
              {showSkuResults && skuResults.length > 0 && (
                <div className="sku-results" style={{ position: 'absolute', zIndex: 50, width: '100%' }}>
                  {skuResults.map((sku, i) => (
                    <div key={i} className="sku-result-item" onMouseDown={() => addItem(sku)}>
                      <div className="sku-result-name">{sku.description}</div>
                      <div className="sku-result-meta">
                        <span>{sku.uom}</span>
                        <span>HSN: {sku.hsn_code}</span>
                        <span>MRP: ₹{Number(sku.mrp).toLocaleString('en-IN')}</span>
                        <span>GST: {(Number(sku.tax_rate) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showSkuResults && skuSearch.length >= 2 && skuResults.length === 0 && !skuLoading && (
                <div className="sku-results" style={{ position: 'absolute', zIndex: 50, width: '100%' }}>
                  <div className="sku-result-item text-muted text-sm">No items found for "{skuSearch}"</div>
                </div>
              )}
            </div>
          )}

          {/* Items list */}
          {orderItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              Search and add items above
            </div>
          ) : (
            orderItems.map((item, idx) => (
              <div key={idx} className="order-item-row">
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 20 }}>
                  {idx + 1}
                </div>
                <div className="order-item-info">
                  <div className="order-item-name">{item.description}</div>
                  <div className="order-item-meta">
                    {item.uom} · HSN: {item.hsn_code} · MRP: ₹{Number(item.mrp).toLocaleString('en-IN')}
                  </div>
                </div>
                <input
                  type="number"
                  className="qty-input"
                  value={item.quantity}
                  min="0.01"
                  step="0.01"
                  onChange={e => updateQty(idx, e.target.value)}
                  disabled={isLocked}
                />
                {!isLocked && (
                  <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isLocked && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost btn-full"
            onClick={() => saveOrder('draft')}
            disabled={saving}
          >
            Save Draft
          </button>
          <button
            className="btn btn-primary btn-full"
            onClick={() => saveOrder('submitted')}
            disabled={saving || orderItems.length === 0 || !selectedClient}
          >
            {saving ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</>
            ) : (isEdit ? 'Update Order' : 'Submit Order')}
          </button>
        </div>
      )}
    </div>
  )
}
