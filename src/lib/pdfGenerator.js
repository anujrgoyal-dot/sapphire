import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateSaleOrderPDF(order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = 210
  const ml = 10
  const mr = 10
  const cw = pw - ml - mr  // 190mm usable width

  const NAVY = [26, 58, 92]
  const BLACK = [0, 0, 0]
  const WHITE = [255, 255, 255]
  const LGRAY = [180, 180, 180]
  const BGRAY = [240, 240, 240]

  const client = order.client_snapshot || {}

  // ── OUTER BORDER ─────────────────────────────────────────────────────────
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.5)
  doc.rect(ml, 8, cw, 276)

  // ── HEADER ROW ───────────────────────────────────────────────────────────
  // Left: Logo placeholder + company name
  doc.setFillColor(...NAVY)
  doc.rect(ml, 8, 38, 28, 'F')

  // Sapphire logo text in box
  doc.setTextColor(...WHITE)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Sapphire', ml + 19, 19, { align: 'center' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Since 1988', ml + 19, 24, { align: 'center' })
  doc.setFontSize(6)
  doc.text('Redefining Customer', ml + 19, 28, { align: 'center' })
  doc.text('Satisfaction', ml + 19, 31, { align: 'center' })

  // Company name and address (center-top)
  doc.setTextColor(...BLACK)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('SAPPHIRE SALES CORPORATION PRIVATE LIMITED', ml + 95, 14, { align: 'center' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('S.No.66/19, Katraj-Kondhwa Road, Opp. Shatrunjay Temple, Near Kanha Hotel, Kondhwa (Bk)', ml + 95, 18.5, { align: 'center' })
  doc.text('Pune - 411048 Maharashtra, India  Ph. +91 7887859228', ml + 95, 22, { align: 'center' })
  doc.text('Email : orders@sapphiresalespune.com  |  Website : www.sapphiresalespune.com', ml + 95, 25.5, { align: 'center' })
  doc.text('GSTIN : 27ABCCS3513N1Z5   CIN NO : U74999PN2019PTC185412   PAN No : ABCCS3513N', ml + 95, 29, { align: 'center' })

  // Right: Member PTSDA box
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.rect(ml + cw - 22, 8, 22, 28)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('Member', ml + cw - 11, 19, { align: 'center' })
  doc.text('PTSDA', ml + cw - 11, 23, { align: 'center' })

  // ── SALES ORDER TITLE BAR ─────────────────────────────────────────────────
  doc.setFillColor(...BGRAY)
  doc.rect(ml, 36, cw, 7, 'FD')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Sales Order', ml + cw / 2, 41.5, { align: 'center' })

  // ── BILL TO / SHIP TO + SO META ───────────────────────────────────────────
  // Draw outer box for the whole customer section
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.rect(ml, 43, cw, 50)

  // Vertical divider — split page in 2 halves
  const halfX = ml + cw / 2
  doc.line(halfX, 43, halfX, 93)

  // Bill To header
  doc.setFillColor(...BGRAY)
  doc.rect(ml, 43, cw / 2, 6, 'FD')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To :', ml + 2, 47.5)

  // Ship To header
  doc.rect(halfX, 43, cw / 2, 6, 'FD')
  doc.text('Ship To :', halfX + 2, 47.5)

  // SO Meta (top right area) — inside Ship To section, right side
  const metaX = halfX + 2
  let metaY = 50
  doc.setFontSize(7.5)

  function metaRow(label, value, y) {
    doc.setFont('helvetica', 'bold')
    doc.text(label + ' :', metaX + 50, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value || ''), metaX + 75, y)
  }

  // Bill To content
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('Customer Code : ' + (client.customer_code || ''), ml + 2, 52)
  doc.setFont('helvetica', 'bold')
  doc.text('Customer Name : ' + (client.name || ''), ml + 2, 56.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const addrLines = doc.splitTextToSize('Address : ' + (client.address || ''), cw / 2 - 4)
  doc.text(addrLines, ml + 2, 61)

  // Horizontal line inside Bill To (after address)
  doc.setDrawColor(...LGRAY)
  doc.line(ml, 72, halfX, 72)

  doc.setFontSize(7)
  doc.text('Phone No : ' + (client.phone || ''), ml + 2, 76)
  doc.text('Contact Person : ' + (client.contact_person || ''), ml + 2, 80)
  doc.text('Email ID : ' + (client.email || ''), ml + 2, 84)
  doc.setFont('helvetica', 'bold')
  doc.text('GST No : ' + (client.gst_no || ''), ml + 2, 88)
  doc.text('PAN No : ' + (client.pan_no || ''), ml + 2, 92)

  // Ship To content (same as Bill To, mirrored)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('Customer Code : ' + (client.customer_code || ''), halfX + 2, 52)
  doc.text('Customer Name : ' + (client.name || ''), halfX + 2, 56.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const addrLines2 = doc.splitTextToSize('Address : ' + (client.address || ''), cw / 2 - 4)
  doc.text(addrLines2, halfX + 2, 61)

  doc.line(halfX, 72, ml + cw, 72)

  doc.text('Phone No : ' + (client.phone || ''), halfX + 2, 76)
  doc.text('Contact Person : ' + (client.contact_person || ''), halfX + 2, 80)
  doc.text('Email ID : ' + (client.email || ''), halfX + 2, 84)
  doc.setFont('helvetica', 'bold')
  doc.text('GST No : ' + (client.gst_no || ''), halfX + 2, 88)

  // ── SO META BOX (right side, top) ─────────────────────────────────────────
  // Overlay on top-right of the header area
  const soBoxX = ml + cw * 0.65
  const soBoxY = 36
  const soBoxW = cw * 0.35
  const soBoxH = 43

  doc.setFillColor(255, 255, 255)
  doc.rect(soBoxX, soBoxY, soBoxW, soBoxH, 'FD')

  doc.setFontSize(7.5)
  const rows = [
    ['SO No', order.so_number || ''],
    ['SO Date', formatDate(order.so_date)],
    ['PO No', order.po_no || ''],
    ['PO Date', order.po_date ? formatDate(order.po_date) : ''],
    ['Despatch Through', ''],
    ['Vehicle No.', ''],
    ['Payment Terms', order.payment_terms || 'Net-30'],
    ['Payment Due Date', order.payment_due_date ? formatDate(order.payment_due_date) : formatDate(order.so_date)],
    ['Salesman', order.salesperson_name || ''],
  ]

  rows.forEach(([label, value], i) => {
    const ry = soBoxY + 5 + i * 4.2
    doc.setDrawColor(...LGRAY)
    doc.line(soBoxX, ry + 1.5, soBoxX + soBoxW, ry + 1.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(label + ' :', soBoxX + 2, ry)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value), soBoxX + soBoxW - 2, ry, { align: 'right' })
  })

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  const items = order.items || []
  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0)

  doc.autoTable({
    startY: 95,
    margin: { left: ml, right: mr },
    head: [['S.NO', 'Description of the Material', 'UOM', 'Quantity']],
    body: items.map((item, i) => [
      i + 1,
      item.description,
      item.uom || 'NOS',
      Number(item.quantity).toFixed(2),
    ]),
    foot: [
      [
        { content: '', colSpan: 1 },
        { content: 'Freight', styles: { halign: 'right' } },
        { content: 'Total Quantity', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: totalQty.toFixed(2), styles: { halign: 'center', fontStyle: 'bold' } },
      ],
    ],
    headStyles: {
      fillColor: BGRAY,
      textColor: BLACK,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      lineColor: LGRAY,
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: BLACK,
      lineColor: LGRAY,
      lineWidth: 0.2,
    },
    footStyles: {
      fillColor: WHITE,
      textColor: BLACK,
      fontSize: 8,
      lineColor: LGRAY,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 25 },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.3,
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didDrawPage: (data) => {
      // Redraw outer border on each page
      doc.setDrawColor(...LGRAY)
      doc.setLineWidth(0.5)
      doc.rect(ml, 8, cw, 276)
    }
  })

  // ── FOOTER NOTE ────────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 5
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(80, 80, 80)
  doc.text(
    '"This sales order is generated from Sapphire Sales Order System"',
    pw / 2, Math.min(finalY, 279), { align: 'center' }
  )

  // ── PAGE NUMBERS ───────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(`Page ${i} of ${pageCount}`, pw - mr - 2, 285, { align: 'right' })
  }

  doc.save(`SO-${order.so_number || 'draft'}.pdf`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
