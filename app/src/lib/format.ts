// Formatação em português do Brasil (R$, datas dd/mm/aaaa, números com vírgula)

export const moeda = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/** Quantidade de metros: 2 -> "2.00 m", 2.5 -> "2.50 m" */
export const metros = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(Number(v)) || Number(v) === 0
    ? '—'
    : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`

/**
 * Metragem do jeito que o cliente compra: o DTF UV é vendido em centímetros,
 * então um pedido de 0,45 m aparece como "45 cm". Os outros tipos seguem em metros.
 */
export const metrosPorTipo = (
  v: number | null | undefined,
  tipo?: string | null,
  unidadeCm = true,
) => {
  const m = Number(v) || 0
  if (m <= 0) return '—'
  if (tipo === 'uv' && unidadeCm)
    return `${(m * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} cm`
  return metros(m)
}

export const numeroBR = (v: number | null | undefined, dec = 2) =>
  (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

/** Percentual preservando casas decimais exatas (ex.: 4 -> "4%", 3.5 -> "3,5%", 2.75 -> "2,75%") */
export const percentualBR = (v: number | null | undefined) =>
  `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`

/** Converte 'YYYY-MM-DD' ou ISO em Date local sem sustos de fuso */
export const parseData = (valor?: string | null): Date | null => {
  if (!valor) return null
  const s = String(valor)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [a, m, d] = s.split('-').map(Number)
    return new Date(a, m - 1, d)
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export const dataBR = (valor?: string | null) => {
  const d = parseData(valor)
  if (!d) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export const dataHoraBR = (valor?: string | null) => {
  const d = parseData(valor)
  if (!d) return '—'
  return `${dataBR(valor)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' de hoje */
export const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const paraInputDate = (valor?: string | null) => {
  if (!valor) return ''
  return String(valor).slice(0, 10)
}

export const paraInputDateTime = (valor?: string | null) => {
  if (!valor) return ''
  const d = parseData(valor)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const diasEntre = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000)

export const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const fimDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

export const telLimpo = (t: string) => (t || '').replace(/\D/g, '')

export const soDigitos = (t: string) => (t || '').replace(/\D/g, '')

export const cepFormatado = (v: string) => {
  const d = soDigitos(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}
