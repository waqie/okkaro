// Lightweight exports — CSV (opens in Excel) and JSON backup. No dependencies.

function download(filename, text, mime = 'text/plain') {
  const blob = new Blob(['﻿' + text], { type: mime + ';charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// rows: array of objects; columns: [{key, label}]
export function exportCSV(filename, rows, columns) {
  const head = columns.map(c => `"${c.label}"`).join(',')
  const body = rows.map(r =>
    columns.map(c => {
      const v = r[c.key] ?? ''
      return `"${String(v).replace(/"/g, '""')}"`
    }).join(',')
  ).join('\n')
  download(filename, head + '\n' + body, 'text/csv')
}

// Parse CSV text into array of objects keyed by header row.
export function parseCSV(text) {
  const rows = []
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (!lines.length) return rows
  const split = (line) => {
    const out = []; let cur = ''; let q = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
      else if (c === ',' && !q) { out.push(cur); cur = '' }
      else cur += c
    }
    out.push(cur)
    return out
  }
  const headers = split(lines[0]).map(h => h.trim().toLowerCase())
  for (let i = 1; i < lines.length; i++) {
    const vals = split(lines[i])
    const obj = {}
    headers.forEach((h, j) => { obj[h] = (vals[j] ?? '').trim() })
    rows.push(obj)
  }
  return rows
}

export function downloadBackup(data) {
  const stamp = new Date().toISOString().slice(0, 10)
  download(`okkaro-backup-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json')
}
