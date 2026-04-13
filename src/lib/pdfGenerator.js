import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateSaleOrderPDF(order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = 210, ml = 12, mr = 12, cw = pw - ml - mr

  // ── Fonts & Colors ──────────────────────────────────────────────────────
  const NAVY = [26, 58, 92]
  const DARK = [30, 30, 30]
  const GRAY = [100, 100, 100]
  const LGRAY = [220, 220, 220]
  const WHITE = [255, 255, 255]

  // ── Logo / Header ────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pw, 28, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('SAPPHIRE SALES CORPORATION PRIVATE LIMITED', ml, 10)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('S.No.66/19, Katraj-Kondhwa Road, Opp. Shatrunjay Temple, Near Kanha Hotel, Kondhwa (Bk)', ml, 15)
  doc.text('Pune - 411048 Maharashtra, India  Ph. +91 7887859228', ml, 19)
  doc.text('Email : orders@sapphiresalespune.com  |  Website : www.sapphiresalespune.com', ml, 23)
  doc.text('GSTIN : 27ABCCS3513N1Z5   CIN NO : U74999PN2019PTC185412   PAN No : ABCCS3513N', ml, 27)

  // ── "SALES ORDER" title ──────────────────────────────────────────────────
  doc.setFillColor(240, 245, 255)
  doc.rect(ml, 30, cw, 8, 'F')
  doc.setDrawColor(...LGRAY)
  doc.rect(ml, 30, cw, 8, 'S')
  doc.setTextColor(...NAVY)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('SALES ORDER', pw / 2, 35.5, { align: 'center' })

  // ── SO Meta box (top right) ──────────────────────────────────────────────
  let y = 40
  const metaX = ml + cw * 0.6
  const metaW = cw * 0.4
  doc.setDrawColor(...LGRAY)
  doc.setFillColor(250, 250, 255)
  doc.rect(metaX, y, metaW, 24, 'FD')

  const metaItems = [
    ['SO No', order.so_number || ''],
    ['SO Date', formatDate(order.so_date)],
    ['PO No', order.po_no || ''],
    ['PO Date', order.po_date ? formatDate(order.po_date) : ''],
    ['Payment Terms', order.payment_terms || 'Net-30'],
    ['Due Date', order.payment_due_date ? formatDate(order.payment_due_date) : ''],
  ]
  doc.setFontSize(7)
  metaItems.forEach(([label, val], i) => {
    const my = y + 4 + i * 3.5
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(label + ' :', metaX + 2, my)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(String(val), metaX + 28, my)
  })

  // ── Bill To / Ship To ────────────────────────────────────────────────────
  const client = order.client_snapshot || {}
  const halfW = (cw * 0.6 - 2) / 2

  // Bill To box
  doc.setFillColor(245, 245, 250)
  doc.rect(ml, y, halfW, 24, 'FD')
  doc.setFillColor(26, 58, 92)
  doc.rect(ml, y, halfW, 5, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', ml + 2, y + 3.5)

  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text(client.name || '', ml + 2, y + 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  const addr = client.address || ''
  const addrLines = doc.splitTextToSize(addr, halfW - 4)
  doc.text(addrLines, ml + 2, y + 13)
  doc.text('GST No : ' + (client.gst_no || ''), ml + 2, y + 21)
  doc.text('Phone : ' + (client.phone || ''), ml + halfW / 2, y + 21)

  // Ship To box (same as Bill To)
  doc.setFillColor(245, 245, 250)
  doc.rect(ml + halfW + 2, y, halfW, 24, 'FD')
  doc.setFillColor(26, 58, 92)
  doc.rect(ml + halfW + 2, y, halfW, 5, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('SHIP TO', ml + halfW + 4, y + 3.5)

  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text(client.name || '', ml + halfW + 4, y + 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text(addrLines, ml + halfW + 4, y + 13)
  doc.text('GST No : ' + (client.gst_no || ''), ml + halfW + 4, y + 21)
  doc.text('Phone : ' + (client.phone || ''), ml + halfW + 2 + halfW / 2, y + 21)

  // ── Customer / Salesman info strip ───────────────────────────────────────
  y += 26
  doc.setFillColor(235, 240, 255)
  doc.rect(ml, y, cw, 7, 'FD')
  doc.setDrawColor(...LGRAY)
  doc.rect(ml, y, cw, 7, 'S')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('Cust. Code :', ml + 2, y + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(client.customer_code || '', ml + 22, y + 4.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('Contact :', ml + 55, y + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(client.contact_person || '', ml + 72, y + 4.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('Salesman :', ml + 120, y + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text(order.salesperson_name || '', ml + 140, y + 4.5)

  // ── Items Table ──────────────────────────────────────────────────────────
  y += 9
  const items = order.items || []
  doc.autoTable({
    startY: y,
    margin: { left: ml, right: mr },
    head: [['S.No', 'Description of the Material', 'UOM', 'Quantity']],
    body: items.map((item, i) => [
      i + 1,
      item.description,
      item.uom || 'NOS',
      Number(item.quantity).toFixed(2),
    ]),
    foot: [
      [{ content: '', colSpan: 2 }, 'Total Qty', items.reduce((s, i) => s + Number(i.quantity), 0).toFixed(2)],
    ],
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: { fontSize: 7.5, textColor: DARK },
    footStyles: { fillColor: [235, 240, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    tableLineColor: LGRAY,
    tableLineWidth: 0.3,
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 5
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'italic')
  doc.text(
    '"This sales order is generated from Sapphire Sales Order System"',
    pw / 2,
    finalY,
    { align: 'center' }
  )

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(`Page ${i} of ${pageCount}`, pw - mr, 290, { align: 'right' })
  }

  doc.save(`SO-${order.so_number || 'draft'}.pdf`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
