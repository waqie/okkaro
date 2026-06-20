// WhatsApp helpers — build a wa.me link and open it.

// Normalise a Pakistani phone number to international format for wa.me.
// 03001234567 -> 923001234567 ; +92 300 1234567 -> 923001234567
export function normalizePhone(phone) {
  let p = (phone || '').replace(/[^0-9]/g, '')
  if (!p) return ''
  if (p.startsWith('92')) return p
  if (p.startsWith('0')) return '92' + p.slice(1)
  if (p.length === 10) return '92' + p // e.g. 3001234567
  return p
}

// Open WhatsApp with a prefilled message. If phone is empty, WhatsApp lets
// the user pick a contact themselves.
export function openWhatsApp(phone, message) {
  const num = normalizePhone(phone)
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/'
  const url = `${base}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

// Invoice details message
export function invoiceMessage(t, inv, businessName = 'OKKARO') {
  return [
    `${t('wa_hello')} ${inv.party_name || ''}`.trim(),
    '',
    `${t('wa_invoice')}: ${inv.invoice_number}`,
    `${t('wa_total')}: ${money(inv.grand_total)}`,
    `${t('wa_paid')}: ${money(inv.paid_amount)}`,
    `${t('wa_balance')}: ${money(inv.balance_due)}`,
    '',
    `${t('wa_thanks')} — ${businessName}`,
  ].join('\n')
}

// Payment reminder message
export function reminderMessage(t, inv, businessName = 'OKKARO') {
  return [
    `${t('wa_hello')} ${inv.party_name || ''}`.trim(),
    '',
    t('wa_reminder_line'),
    `${t('wa_invoice')}: ${inv.invoice_number}`,
    `${t('wa_balance')}: ${money(inv.balance_due)}`,
    '',
    `${t('wa_thanks')} — ${businessName}`,
  ].join('\n')
}
