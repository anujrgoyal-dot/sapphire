export function downloadQuotation(doc, order) {
  const rawName = (order.client_snapshot && order.client_snapshot.name)
    ? order.client_snapshot.name
    : 'Customer'
  const clientName = rawName.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const soNumber = order.so_number || 'draft'
  const qtnNum = soNumber.includes('/') ? soNumber.split('/').pop() : soNumber
  const filename = clientName + '_QTN_' + qtnNum + '.pdf'
  doc.save(filename)
}
