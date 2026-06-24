// Plan-based feature gating.
// Trial & Pro = full access. Standard = + inventory/POS/accounting. Basic = invoicing core.
export const planRank = { basic: 1, standard: 2, pro: 3, trial: 3, ecommerce: 3 }

// Minimum rank required for each route. Routes not listed are allowed for everyone (rank 1).
export const routeMinRank = {
  '/expenses': 2,
  '/inventory': 2,
  '/pos': 2,
  '/vouchers': 2,
  '/general-ledger': 2,
  '/accounts': 2,
  '/insights': 2,
  '/store-manage': 3,
  '/assistant': 3,
}

// Features that belong ONLY to specific plans (not part of the rank ladder).
export const routeExclusive = {
  '/pricing': ['ecommerce'],  // Pricing Calculator = E-commerce plan only
}

export function routeAllowed(plan, to, isSuperuser = false) {
  if (isSuperuser) return true   // OKKARO owner/admin sees everything (incl. e-commerce)
  if (routeExclusive[to]) return routeExclusive[to].includes(plan)
  const need = routeMinRank[to] || 1
  return (planRank[plan] || 3) >= need
}

export function planLabel(plan) {
  return ({ basic: 'Basic', standard: 'Standard', pro: 'Pro', trial: 'Trial' }[plan] || 'Pro')
}
