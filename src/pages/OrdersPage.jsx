import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { generateSaleOrderPDF, previewSaleOrderPDF } from '../lib/pdfGenerator'

export default function OrdersPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchOrders() }, [profile])

  async function fetchOrders() {
    setLoading(true)
    let query = supabase.from('sales_orders').select('*').order('created_at', { ascending: false })
    if (profile.role !== 'admin') query = query.eq('salesperson_id', profile.id)
    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }

  async function duplicateOrder(order) {
    const { count } = await supabase.from('sales_orders').select('*', { count: 'exact', head: true })
    const soNum = `KSQ_${new Date().getFullYear()}/${String((count || 0) + 1).padStart(9, '0')}`
    const { data, error } = await supabase.from('sales_orders').insert({
      so_number: soNum,
      so_date: new Date().toISOString().split('T')[0],
      salesperson_id: profile.id,
      salesperson_name: profile.name,
      client_snapshot: order.client_snapshot,
      items: order.items,
      total_qty: order.total_qty,
      taxable_value: order.taxable_value,
      gst_amount: order.gst_amount,
      total_value: order.total_value,
      global_discount: order.global_discount || 0,
      status: 'draft',
      po_no: order.po_no,
      notes: order.notes,
      payment_terms: order.payment_terms,
    }).select().single()
    if (!error && data) {
      navigate(`/edit-order/${data.id}`)
    }
  }

  const statusColor = { draft: 'badge-draft', submitted: 'badge-submitted', confirmed: 'badge-confirmed', locked: 'badge-locked' }
  const filters = ['all', 'draft', 'submitted', 'confirmed', 'locked']
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="page-content">
      <div className="section-header">
        <div className="section-title">My Quotations</div>
        <button className="btn btn-accent btn-sm" onClick={() => navigate('/new-order')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New
        </button>
      </div>

      <div className="tab-bar">
        {filters.map(f => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span style={{ marginLeft: 3, opacity: 0.7 }}>({orders.filter(o => o.status === f).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 48 }}><div className="spinner"></div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <h3>No quotations found</h3>
          <p>Tap "New" to create your first quotation</p>
        </div>
      ) : (
        filtered.map(order => {
          const client = order.client_snapshot || {}
          const isEditable = ['draft', 'submitted'].includes(order.status)
          return (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div>
                  <div className="order-card-so">{order.so_number}</div>
                  <div className="order-card-date">{new Date(order.so_date).toLocaleDateString('en-IN')}</div>
                </div>
                <span className={`badge ${statusColor[order.status] || 'badge-draft'}`}>{order.status}</span>
              </div>
              <div className="order-card-client">{client.name || 'Unknown Customer'}</div>
              <div className="order-card-meta">
                {(order.items || []).length} items · Qty: {Number(order.total_qty || 0).toFixed(0)}
                {order.total_value ? ` · ₹${Number(order.total_value).toLocaleString('en-IN')}` : ''}
                {order.salesperson_name && profile.role === 'admin' ? ` · ${order.salesperson_name}` : ''}
              </div>
              {order.notes && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                  "{order.notes}"
                </div>
              )}
              <div className="divider" style={{ margin: '10px 0' }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {isEditable && (
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/edit-order/${order.id}`)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => duplicateOrder(order)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Duplicate
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => previewSaleOrderPDF(order)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const doc = generateSaleOrderPDF(order)
                  const rawName = (order.client_snapshot && order.client_snapshot.name) ? order.client_snapshot.name : 'Customer'
                  const clientName = rawName.replace(/[^a-zA-Z0-9 ]/g, '').trim()
                  const qtnNum = (order.so_number || 'draft').split('/').pop()
                  doc.save(clientName + '_QTN_' + qtnNum + '.pdf')
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
