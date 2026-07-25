// Sort a flat account list into chart-of-accounts (parent → child) order,
// tagging each with its depth for indentation in dropdowns.
export function sortAccountsTree(accounts = []) {
  const byId = {}
  accounts.forEach(a => { byId[a.id] = { ...a, children: [] } })
  const roots = []
  accounts.forEach(a => {
    const n = byId[a.id]
    if (a.parent && byId[a.parent]) byId[a.parent].children.push(n)
    else roots.push(n)
  })
  const cmp = (x, y) => String(x.code).localeCompare(String(y.code), undefined, { numeric: true })
  const flat = []
  const walk = (n, d) => { flat.push({ ...n, depth: d }); n.children.sort(cmp).forEach(c => walk(c, d + 1)) }
  roots.sort(cmp).forEach(r => walk(r, 0))
  return flat
}

export const acctLabel = (a) => `${'  '.repeat(a.depth || 0)}${a.code} · ${a.name}`
