// Exportação CSV compatível com Excel pt-BR (separador ";" e BOM para acentos)

const escapa = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export const gerarCSV = (linhas: (string | number | null | undefined)[][]) =>
  linhas.map((l) => l.map(escapa).join(';')).join('\r\n')

/**
 * Baixa o CSV inteiro, sem cortar nada.
 *
 * Relatório muito grande (histórico completo) é gerado em pedaços dentro do
 * Blob, e não numa única string gigante, para o navegador não travar antes de
 * começar o download.
 */
const PEDACO_LINHAS = 2000

export const baixarCSV = (nomeArquivo: string, linhas: (string | number | null | undefined)[][]) => {
  const pedacos: string[] = ['\uFEFF']
  for (let i = 0; i < linhas.length; i += PEDACO_LINHAS) {
    pedacos.push(gerarCSV(linhas.slice(i, i + PEDACO_LINHAS)))
    if (i + PEDACO_LINHAS < linhas.length) pedacos.push('\r\n')
  }
  const blob = new Blob(pedacos, { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const copiarTexto = async (texto: string) => {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}
