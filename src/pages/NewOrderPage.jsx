import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function NewOrderPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { orderId } = useParams()

  // Client fields — all editable inline
  const [clientCode, setClientCode] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientGst, setClientGst] = useState('')
  const [clientPan, setClientPan] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState([])
  const [showClientList, setShowClientList] = useState(false)

  // Order fields
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentTerms, setPaymentTerms] = useState('Net-30')
  const [poNo, setPoNo] = useState('')
  const [remarks, setRemarks] = useState('')
  const [orderItems, setOrderItems] = useState([])
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [transport, setTransport] = useState(0)

  // SKU search
  const [skuSearch, setSkuSearch] = useState('')
  const [skuResults, setSkuResults] = useState([])
  const [skuLoading, setSkuLoading] = useState(false)
  const [showSkuResults, setShowSkuResults] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEdit, setIsEdit] = useState(false)
  const [orderStatus, setOrderStatus] = useState('draft')

  const searchTimeout = useRef(null)

  useEffect(() => {
    (async () => {
      let all = []
      let from = 0
      const PAGE = 1000
      while (true) {
        const { data } = await supabase.from('clients').select('*').order('name').range(from, from + PAGE - 1)
        if (!data || data.length === 0) break
        all = [...all, ...data]
        if (data.length < PAGE) break
        from += PAGE
      }
      setClients(all)
    })()
  }, [])

  useEffect(() => {
    if (orderId) {
      setIsEdit(true)
      supabase.from('sales_orders').select('*').eq('id', orderId).single().then(({ data }) => {
        if (data) {
          const c = data.client_snapshot || {}
          setClientCode(c.customer_code || '')
          setClientName(c.name || '')
          setClientAddress(c.address || '')
          setClientGst(c.gst_no || '')
          setClientPan(c.pan_no || '')
          setClientPhone(c.phone || '')
          setClientContact(c.contact_person || '')
          setClientEmail(c.email || '')
          setOrderItems(data.items || [])
          setPoNo(data.po_no || '')
          setRemarks(data.notes || '')
          setPaymentTerms(data.payment_terms || 'Net-30')
          setQuotationDate(data.so_date || new Date().toISOString().split('T')[0])
          setOrderStatus(data.status)
          setGlobalDiscount(data.global_discount || 0)
          setTransport(data.transport_charges || 0)
        }
      })
    }
  }, [orderId])

  useEffect(() => {
    if (skuSearch.length < 2) { setSkuResults([]); setShowSkuResults(false); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSkuLoading(true)
      const { data } = await supabase.from('skus').select('*').ilike('description', `%${skuSearch}%`).limit(50)
      setSkuResults(data || [])
      setShowSkuResults(true)
      setSkuLoading(false)
    }, 300)
    return () => clearTimeout(searchTimeout.current)
  }, [skuSearch])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.customer_code || '').toLowerCase().includes(clientSearch.toLowerCase())
  )

  function selectClient(c) {
    setClientCode(c.customer_code || '')
    setClientName(c.name || '')
    setClientAddress(c.address || '')
    setClientGst(c.gst_no || '')
    setClientPan(c.pan_no || '')
    setClientPhone(c.phone || '')
    setClientContact(c.contact_person || '')
    setClientEmail(c.email || '')
    setClientSearch('')
    setShowClientList(false)
  }

  function addItem(sku) {
    if (orderItems.length >= 50) { setError('Maximum 50 items'); return }
    if (orderItems.find(i => i.description === sku.description)) { setError('Item already added'); return }
    // Clear search immediately so UI updates right away
    clearTimeout(searchTimeout.current)
    setSkuSearch('')
    setSkuResults([])
    setShowSkuResults(false)
    setError('')
    setOrderItems(prev => [...prev, {
      description: sku.description,
      hsn_code: sku.hsn_code || '',
      uom: sku.uom || 'NOS',
      quantity: 1,
      price: sku.mrp || 0,
      discount: globalDiscount || 0,
      tax_rate: sku.tax_rate || 0.18,
    }])
  }

  function updateItem(idx, field, value) {
    setOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function removeItem(idx) {
    setOrderItems(prev => prev.filter((_, i) => i !== idx))
  }

  function calcItem(item) {
    const qty = Number(item.quantity) || 0
    const price = Number(item.price) || 0
    const disc = Number(item.discount) || 0
    const taxRate = Number(item.tax_rate) || 0
    const grossValue = qty * price
    const taxableValue = grossValue * (1 - disc / 100)
    const gstAmount = taxableValue * taxRate
    const totalValue = taxableValue + gstAmount
    return { qty, price, disc, taxableValue, gstAmount, totalValue, taxRate }
  }

  const totals = orderItems.reduce((acc, item) => {
    const c = calcItem(item)
    acc.totalQty += c.qty
    acc.taxableValue += c.taxableValue
    acc.gstAmount += c.gstAmount
    acc.totalValue += c.totalValue
    return acc
  }, { totalQty: 0, taxableValue: 0, gstAmount: 0, totalValue: 0 })

  const transportAmt = Number(transport) || 0
  const totalTaxableValue = totals.taxableValue + transportAmt
  const totalGST = totalTaxableValue * 0.18
  const totalWithTransport = totalTaxableValue + totalGST
  const roundedOff = Math.round(totalWithTransport) - totalWithTransport
  const finalTotal = Math.round(totalWithTransport)

  const clientSnapshot = {
    customer_code: clientCode, name: clientName, address: clientAddress,
    gst_no: clientGst, pan_no: clientPan, phone: clientPhone,
    contact_person: clientContact, email: clientEmail
  }

  async function saveOrder(status = 'submitted') {
    if (!clientName) { setError('Please enter customer name'); return }
    if (orderItems.length === 0) { setError('Add at least one item'); return }
    setSaving(true)
    setError('')

    const orderData = {
      so_date: quotationDate,
      salesperson_id: profile.id,
      salesperson_name: profile.name,
      client_snapshot: clientSnapshot,
      items: orderItems,
      total_qty: totals.totalQty,
      taxable_value: totalTaxableValue,
      gst_amount: totalGST,
      total_value: finalTotal,
      global_discount: globalDiscount,
      transport_charges: Number(transport) || 0,
      status,
      po_no: poNo,
      notes: remarks,
      payment_terms: paymentTerms,
      updated_at: new Date().toISOString(),
    }

    let result
    if (isEdit) {
      result = await supabase.from('sales_orders').update(orderData).eq('id', orderId).select().single()
    } else {
      // Use database sequence to guarantee uniqueness even with concurrent users
      const { count } = await supabase.from('sales_orders').select('*', { count: 'exact', head: true })
      const soNum = `KSQ_${new Date().getFullYear()}/${String((count || 0) + 1).padStart(4, '0')}`
      result = await supabase.from('sales_orders').insert({ ...orderData, so_number: soNum }).select().single()
    }

    if (result.error) { setError(result.error.message) }
    else {
      setSuccess(isEdit ? 'Quotation updated!' : 'Quotation submitted!')
      setTimeout(() => navigate('/orders'), 1200)
    }
    setSaving(false)
  }

  const isLocked = orderStatus === 'locked'

  return (
    <div className="page-content" style={{ paddingBottom: 40 }}>
      <div className="section-header mb-3">
        <div>
          <div className="section-title">{isEdit ? 'Edit Quotation' : 'New Sales Quotation'}</div>
          <div className="text-xs text-muted mt-1">{profile.name}</div>
        </div>
        {isLocked && <span className="badge badge-locked">🔒 Locked</span>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✓ {success}</div>}

      {/* CLIENT */}
      <div className="card mb-3">
        <div className="card-header">
          <div className="card-title"><span style={{ color: 'var(--accent)' }}>①</span> Customer Details</div>
        </div>
        <div className="card-body">
          {!isLocked && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" className="form-input" placeholder="Quick fill from saved customers (optional)..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientList(true) }}
                  onBlur={() => setTimeout(() => setShowClientList(false), 200)} />
              </div>
              {showClientList && clientSearch.length >= 1 && (
                <div className="sku-results" style={{ position: 'absolute', zIndex: 50, width: '100%' }}>
                  {filteredClients.slice(0, 10).map(c => (
                    <div key={c.id} className="sku-result-item" onMouseDown={() => selectClient(c)}>
                      <div className="sku-result-name">{c.name}</div>
                      <div className="sku-result-meta"><span>{c.customer_code}</span><span>{c.city}</span></div>
                    </div>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="sku-result-item text-muted text-sm">No saved customers — fill details manually below</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Customer Code</label>
              <input className="form-input" value={clientCode} onChange={e => setClientCode(e.target.value)} placeholder="C0056" disabled={isLocked} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Customer Name *</label>
              <input className="form-input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="PRINCE LIGHTS" disabled={isLocked} />
            </div>
          </div>
          <div className="form-group mt-2" style={{ marginBottom: 0 }}>
            <label className="form-label">Address</label>
            <input className="form-input" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Shop address..." disabled={isLocked} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">GST No</label>
              <input className="form-input" value={clientGst} onChange={e => setClientGst(e.target.value)} disabled={isLocked} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">PAN No</label>
              <input className="form-input" value={clientPan} onChange={e => setClientPan(e.target.value)} disabled={isLocked} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone</label>
              <input className="form-input" value={clientPhone} onChange={e => setClientPhone(e.target.value)} disabled={isLocked} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Contact Person</label>
              <input className="form-input" value={clientContact} onChange={e => setClientContact(e.target.value)} disabled={isLocked} />
            </div>
          </div>
        </div>
      </div>

      {/* QUOTATION DETAILS */}
      <div className="card mb-3">
        <div className="card-header">
          <div className="card-title"><span style={{ color: 'var(--accent)' }}>②</span> Quotation Details</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quotation Date</label>
              <input type="date" className="form-input" value={quotationDate} onChange={e => setQuotationDate(e.target.value)} disabled={isLocked} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Payment Terms</label>
              <select className="form-select" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} disabled={isLocked}>
                <option>Net-30</option><option>Net-15</option><option>Net-45</option>
                <option>Net-60</option><option>Cash</option><option>Advance</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Default Discount %</label>
              <input type="number" className="form-input" value={globalDiscount} min="0" max="100"
                onChange={e => {
                  const d = parseFloat(e.target.value) || 0
                  setGlobalDiscount(d)
                  setOrderItems(prev => prev.map(item => ({ ...item, discount: d })))
                }} placeholder="0" disabled={isLocked} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">PO Number (Optional)</label>
              <input className="form-input" value={poNo} onChange={e => setPoNo(e.target.value)} disabled={isLocked} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Transport Charges (₹) — 18% GST applied</label>
              <input type="number" className="form-input" value={transport || ''} min="0"
                onChange={e => setTransport(parseFloat(e.target.value) || 0)}
                placeholder="0 (leave empty if no transport)" disabled={isLocked} />
            </div>
          </div>
          <div className="form-group mt-2" style={{ marginBottom: 0 }}>
            <label className="form-label">Remarks</label>
            <textarea className="form-textarea" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Add remarks for this quotation..." disabled={isLocked} />
          </div>
        </div>
      </div>

      {/* ITEMS */}
      <div className="card mb-3">
        <div className="card-header">
          <div className="card-title">
            <span style={{ color: 'var(--accent)' }}>③</span> Items
            <span className="badge badge-submitted" style={{ marginLeft: 8 }}>{orderItems.length}/50</span>
          </div>
          {totals.totalQty > 0 && <div className="text-sm text-muted">Qty: <strong>{totals.totalQty}</strong></div>}
        </div>
        <div className="card-body" style={{ overflow: 'visible' }}>
          {!isLocked && orderItems.length < 50 && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" className="form-input" placeholder="Search item / SKU..."
                  value={skuSearch} onChange={e => setSkuSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSkuResults(false), 300)} />
              </div>
              {skuLoading && <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>Searching...</div>}
              {showSkuResults && skuResults.length > 0 && (
                <div className="sku-results" style={{ position: 'absolute', zIndex: 50, width: '100%', maxHeight: '55vh', overflowY: 'auto' }}>
                  {skuResults.map((sku, i) => (
                    <div key={i} className="sku-result-item" onMouseDown={() => addItem(sku)}>
                      <div className="sku-result-name">{sku.description}</div>
                      <div className="sku-result-meta">
                        <span>{sku.uom}</span><span>HSN: {sku.hsn_code}</span>
                        <span>MRP: ₹{Number(sku.mrp).toLocaleString('en-IN')}</span>
                        <span>GST: {(Number(sku.tax_rate) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {orderItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              Search and add items above
            </div>
          ) : (
            orderItems.map((item, idx) => {
              const c = calcItem(item)
              return (
                <div key={idx} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>
                        <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>{idx + 1}.</span>
                        {item.description}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        HSN: {item.hsn_code} · {item.uom} · GST: {(item.tax_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    {!isLocked && (
                      <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 6 }}>
                    {[['QTY', 'quantity'], ['PRICE (₹)', 'price'], ['DISC %', 'discount']].map(([label, field]) => (
                      <div key={field}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 600 }}>{label}</div>
                        <input type="number" className="qty-input" style={{ width: '100%' }}
                          value={item[field]} min="0"
                          onChange={e => updateItem(idx, field, parseFloat(e.target.value) || 0)}
                          disabled={isLocked} />
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '6px 10px', fontSize: 11, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <span>Taxable: <strong>₹{c.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                    <span>GST: <strong>₹{c.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                    <span>Total: <strong style={{ color: 'var(--navy)' }}>₹{c.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>
              )
            })
          )}

          {orderItems.length > 0 && (
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, marginTop: 4 }}>
              {[
                ...(transportAmt > 0 ? [
                  ['Transport Charges', `₹${transportAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
                ] : []),
                ['Total Qty / Taxable Value', `${totals.totalQty} / ₹${totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
                ['CGST @ 9%', `₹${(totalGST / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
                ['SGST @ 9%', `₹${(totalGST / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
                ['Rounded Off', `${roundedOff >= 0 ? '+' : ''}${roundedOff.toFixed(2)}`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span className="text-muted">{label}</span><span>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: 'var(--navy)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span>Total Value</span>
                <span>₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isLocked && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-full" onClick={() => saveOrder('draft')} disabled={saving}>Save Draft</button>
          <button className="btn btn-primary btn-full" onClick={() => saveOrder('submitted')}
            disabled={saving || orderItems.length === 0 || !clientName}>
            {saving
              ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</>
              : (isEdit ? 'Update Quotation' : 'Submit Quotation')}
          </button>
        </div>
      )}
    </div>
  )
}
