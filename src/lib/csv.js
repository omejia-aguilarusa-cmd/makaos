// Tiny client-side CSV export — builds a CSV from headers + rows and triggers a
// download. Used to export a filtered Mac Painters pay period from the browser.
export function toCSV(headers, rows) {
  const esc = (s) => {
    s = s == null ? '' : String(s)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n')
}

export function downloadCSV(filename, headers, rows) {
  const blob = new Blob([toCSV(headers, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
