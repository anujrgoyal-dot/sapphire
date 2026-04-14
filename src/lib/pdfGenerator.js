import jsPDF from 'jspdf'
import 'jspdf-autotable'

const BANK_DETAILS = {
  accountName: 'SAPPHIRE SALES CORPORATION PRIVATE LIMITED',
  accountNo: '50200047645902',
  bankName: 'HDFC Bank',
  branch: 'Bhandarkar Road & HDFC0000007',
}

const TERMS = [
  '1. Payment 100% in Advance.',
  '2. Local Transport Extra.',
  '3. Unloading at site by Customer',
  '4. Goods sold will not be returned/replaced/exchanged.',
]

function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (num === 0) return 'Zero only'
  function convert(n) {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  return convert(Math.round(num)) + ' only'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcItem(item) {
  const qty = Number(item.quantity) || 0
  const price = Number(item.price) || 0
  const disc = Number(item.discount) || 0
  const taxRate = Number(item.tax_rate) || 0.18
  const grossValue = qty * price
  const taxableValue = grossValue * (1 - disc / 100)
  const gstAmount = taxableValue * taxRate
  const totalValue = taxableValue + gstAmount
  return { qty, price, disc, taxableValue, gstAmount, totalValue, taxRate }
}

export function generateSaleOrderPDF(order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = 210, ml = 10, mr = 10, cw = pw - ml - mr
  const halfX = ml + cw / 2

  const BLACK = [0, 0, 0]
  const WHITE = [255, 255, 255]
  const LGRAY = [180, 180, 180]
  const BGRAY = [235, 235, 235]
  const NAVY = [26, 58, 92]

  const client = order.client_snapshot || {}
  const items = order.items || []

  // ── TITLE ─────────────────────────────────────────────────────────────────
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Sales Quotation', pw / 2, 13, { align: 'center' })

  // ── LOGO BOX LEFT ─────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(ml, 16, 36, 26, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Sapphire', ml + 18, 26, { align: 'center' })
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Since 1988', ml + 18, 30, { align: 'center' })
  doc.text('Redefining Customer', ml + 18, 34, { align: 'center' })
  doc.text('Satisfaction', ml + 18, 38, { align: 'center' })

  // ── COMPANY NAME CENTER ───────────────────────────────────────────────────
  doc.setTextColor(...BLACK)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('SAPPHIRE SALES CORPORATION PRIVATE LIMITED', pw / 2, 21, { align: 'center' })
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('S.No.66/19, Katraj-Kondhwa Road, Opp. Shatrunjay Temple, Near Kanha Hotel,', pw / 2, 25.5, { align: 'center' })
  doc.text('Kondhwa (Bk) Pune - 411048 Maharashtra, India  Ph.+91 7887859228', pw / 2, 29, { align: 'center' })
  doc.text('Email : orders@sapphiresalespune.com  |  Website : www.sapphiresalespune.com', pw / 2, 32.5, { align: 'center' })
  doc.text('GSTIN : 27ABCCS3513N1Z5   CIN NO : U74999PN2019PTC185412   PAN NO : ABCCS3513N', pw / 2, 36, { align: 'center' })

  // ── MEMBER PTSDA BOX RIGHT ────────────────────────────────────────────────
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.rect(ml + cw - 20, 16, 20, 26)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('Member', ml + cw - 10, 27, { align: 'center' })
  doc.text('PTSDA', ml + cw - 10, 32, { align: 'center' })

  // ── CUSTOMER + META BOX ───────────────────────────────────────────────────
  let y = 44
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.rect(ml, y, cw, 38)
  doc.line(halfX, y, halfX, y + 38)

  // LEFT — Customer info
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Customer Code : ', ml + 2, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.text(client.customer_code || '', ml + 32, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.text('Customer Name : ', ml + 2, y + 12)
  doc.setFont('helvetica', 'bold')
  doc.text(client.name || '', ml + 32, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const addrLines = doc.splitTextToSize('Address : ' + (client.address || ''), halfX - ml - 4)
  doc.text(addrLines, ml + 2, y + 18)

  doc.line(ml, y + 26, halfX, y + 26)
  doc.text('Contact Person : ' + (client.contact_person || ''), ml + 2, y + 30)
  doc.text('Contact Person No : ' + (client.phone || ''), ml + 2, y + 34)
  doc.text('Email ID : ' + (client.email || ''), ml + 2, y + 38)

  // RIGHT — Quotation meta
  const rX = halfX + 2
  const metaRows = [
    ['Quotation No.', order.so_number || ''],
    ['Quotation Date', ':  ' + formatDate(order.so_date)],
    ['Despatch Through', ':'],
    ['Payment Terms', ':  ' + (order.payment_terms || 'Net-30')],
    ['Salesman', ':  ' + (order.salesperson_name || '')],
  ]
  metaRows.forEach(([label, value], i) => {
    const ry = y + 6 + i * 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text(label, rX, ry)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value), rX + 34, ry)
  })
  doc.line(halfX, y + 26, ml + cw, y + 26)
  doc.setFontSize(7)
  doc.text('GST No : ' + (client.gst_no || ''), rX, y + 30)
  doc.text('PAN No : ' + (client.pan_no || ''), rX, y + 34)

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  y += 40

  const totals = items.reduce((acc, item) => {
    const c = calcItem(item)
    acc.totalQty += c.qty
    acc.taxableValue += c.taxableValue
    acc.gstAmount += c.gstAmount
    acc.totalValue += c.totalValue
    return acc
  }, { totalQty: 0, taxableValue: 0, gstAmount: 0, totalValue: 0 })

  const roundedOff = Math.round(totals.totalValue) - totals.totalValue
  const finalTotal = Math.round(totals.totalValue)
  const cgst = totals.gstAmount / 2
  const sgst = totals.gstAmount / 2

  doc.autoTable({
    startY: y,
    margin: { left: ml, right: mr },
    head: [['S.\nNO', 'Description of the Material', 'HSN', 'UOM', 'Qty', 'Price', 'Disc\n%', 'GST\n%', 'Taxable\nValue']],
    body: items.map((item, i) => {
      const c = calcItem(item)
      return [
        i + 1,
        item.description,
        item.hsn_code || '',
        item.uom || 'NOS',
        c.qty.toFixed(2),
        Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        c.disc.toFixed(2),
        (c.taxRate * 100).toFixed(2),
        c.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      ]
    }),
    foot: [
      [{ content: 'Total Quantity / Taxable Value', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totals.totalQty.toFixed(2), styles: { halign: 'center', fontStyle: 'bold' } }, { content: '', colSpan: 3 }, { content: totals.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }],
      [{ content: 'Output CGST @ 9%', colSpan: 8, styles: { halign: 'right' } }, { content: cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }],
      [{ content: 'Output SGST @ 9%', colSpan: 8, styles: { halign: 'right' } }, { content: sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }],
      [{ content: 'Rounded Off', colSpan: 8, styles: { halign: 'right' } }, { content: roundedOff.toFixed(2), styles: { halign: 'right' } }],
      [{ content: 'Total Value', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } }, { content: finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } }],
    ],
    headStyles: { fillColor: BGRAY, textColor: BLACK, fontSize: 7, fontStyle: 'bold', halign: 'center', lineColor: LGRAY, lineWidth: 0.3 },
    bodyStyles: { fontSize: 7, textColor: BLACK, lineColor: LGRAY, lineWidth: 0.2 },
    footStyles: { fillColor: WHITE, textColor: BLACK, fontSize: 7.5, lineColor: LGRAY, lineWidth: 0.2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'center', cellWidth: 12 },
      8: { halign: 'right', cellWidth: 22 },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.3,
  })

  let finalY = doc.lastAutoTable.finalY + 2

  // ── TOTAL IN WORDS ────────────────────────────────────────────────────────
  doc.setDrawColor(...LGRAY)
  doc.rect(ml, finalY, cw, 8)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('Total Value In Words : ', ml + 2, finalY + 5)
  doc.setFont('helvetica', 'normal')
  doc.text(numberToWords(finalTotal), ml + 40, finalY + 5)
  finalY += 10

  // ── REMARKS ───────────────────────────────────────────────────────────────
  if (order.notes) {
    doc.rect(ml, finalY, cw, 8)
    doc.setFont('helvetica', 'bold')
    doc.text('Remarks : ', ml + 2, finalY + 5)
    doc.setFont('helvetica', 'normal')
    const remarkLines = doc.splitTextToSize(order.notes, cw - 30)
    doc.text(remarkLines, ml + 22, finalY + 5)
    finalY += 10
  }

  // ── BANK DETAILS + TERMS ──────────────────────────────────────────────────
  doc.rect(ml, finalY, cw, 32)
  doc.line(halfX, finalY, halfX, finalY + 32)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text("Company's Bank Details :", ml + 2, finalY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Account Name : ' + BANK_DETAILS.accountName, ml + 2, finalY + 11)
  doc.text('Bank Name : ' + BANK_DETAILS.bankName, ml + 2, finalY + 16)
  doc.text('A/C No. : ' + BANK_DETAILS.accountNo, ml + 2, finalY + 21)
  doc.text('Branch & IFS Code : ' + BANK_DETAILS.branch, ml + 2, finalY + 26)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('Terms & Conditions :', rX, finalY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  TERMS.forEach((t, i) => doc.text(t, rX, finalY + 12 + i * 5))

  finalY += 34

  // ── AUTHORISED SIGNATORY ──────────────────────────────────────────────────
  doc.rect(ml, finalY, cw, 18)
  doc.line(halfX, finalY, halfX, finalY + 18)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('For SAPPHIRE SALES CORPORATION PRIVATE LIMITED', rX, finalY + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Authorised Signatory', rX, finalY + 16)

  // ── PAGE NUMBERS ──────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(`Page ${i} of ${pageCount}`, pw - mr, 290, { align: 'right' })
  }

  doc.save(`QTN-${order.so_number || 'draft'}.pdf`)
}
