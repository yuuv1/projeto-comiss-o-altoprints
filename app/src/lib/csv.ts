// Exportação CSV compatível com Excel pt-BR (separador ";" e BOM para acentos)

const escapa = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export const gerarCSV = (linhas: (string | number | null | undefined)[][]) =>
  linhas.map((l) => l.map(escapa).join(';')).join('\r\n')

export const baixarCSV = (nomeArquivo: string, linhas: (string | number | null | undefined)[][]) => {
  const csv = '\uFEFF' + gerarCSV(linhas)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const copiarTexto = async (texto: string) => {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}
