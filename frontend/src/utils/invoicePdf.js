// Generate a clean invoice PDF and share it on WhatsApp.
// Phone: native share sheet attaches the PDF (pick WhatsApp). Desktop: downloads the PDF.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export function buildInvoiceBlob(inv, business) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const teal = [31, 175, 169], charcoal = [46, 67, 76]
  let y = 44

  // logo
  const hasLogo = !!business?.logo_base64
  try {
    if (hasLogo) {
      const fmt = business.logo_base64.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(business.logo_base64, fmt, 40, y - 12, 48, 48)
    }
  } catch { /* ignore bad logo */ }
  const lx = hasLogo ? 100 : 40

  doc.setTextColor(...charcoal); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text(business?.business_name || 'OKKARO', lx, y + 6)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110)
  let iy = y + 22
  if (business?.phone) { doc.text(String(business.phone), lx, iy); iy += 12 }
  if (business?.address) { doc.text(`${business.address}${business.city ? ', ' + business.city : ''}`, lx, iy); iy += 12 }

  // invoice no + date (right)
  doc.setTextColor(...teal); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text(String(inv.invoice_number || ''), W - 40, y + 6, { align: 'right' })
  doc.setTextColor(110); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(`Date: ${inv.date || ''}`, W - 40, y + 22, { align: 'right' })

  y = Math.max(iy, y + 48) + 12

  // bill to
  doc.setTextColor(150); doc.setFontSize(8); doc.text('BILL TO', 40, y)
  doc.setTextColor(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text(String(inv.party_name || ''), 40, y + 14)
  if (inv.party_phone) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110); doc.text(String(inv.party_phone), 40, y + 28) }
  y += 42

  // items
  const body = (inv.items || []).map(it => [it.product_name, String(Number(it.quantity)), money(it.unit_price), money(it.total)])
  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Rate', 'Amount']],
    body,
    theme: 'grid',
    headStyles: { fillColor: charcoal, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  })

  let ty = doc.lastAutoTable.finalY + 16
  const rx = W - 40, llx = W - 200
  const line = (label, val, bold = false, color) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10)
    doc.setTextColor(...(color || [60, 60, 60]))
    doc.text(label, llx, ty); doc.text(val, rx, ty, { align: 'right' }); ty += 16
  }
  line('Subtotal', money(inv.subtotal))
  if (Number(inv.discount_amount) > 0) line('Discount', '- ' + money(inv.discount_amount))
  if (Number(inv.tax_amount) > 0) line('Tax', money(inv.tax_amount))
  line('Grand Total', money(inv.grand_total), true, teal)
  line('Paid', money(inv.paid_amount), false, [34, 150, 80])
  line('Balance', money(inv.balance_due), true, [200, 50, 50])

  if (inv.notes) { doc.setTextColor(110); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(String(inv.notes), 40, ty + 8) }
  doc.setTextColor(150); doc.setFontSize(9)
  doc.text('Thank you for your business!', W / 2, H - 36, { align: 'center' })

  return doc.output('blob')
}

// Returns 'shared' | 'downloaded' | 'cancel'
export async function shareInvoicePdf(inv, business) {
  const blob = buildInvoiceBlob(inv, business)
  const fname = `${inv.invoice_number || 'invoice'}.pdf`
  const file = new File([blob], fname, { type: 'application/pdf' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: String(inv.invoice_number || 'Invoice'), text: `Invoice ${inv.invoice_number || ''}` })
      return 'shared'
    } catch (e) { if (e?.name === 'AbortError') return 'cancel' }
  }
  // fallback (desktop): download so the user can attach it in WhatsApp
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = fname; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'downloaded'
}
