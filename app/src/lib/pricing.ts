// Tabela de preços da metragem (DTF) e cálculo automático do valor

import type { Pedido } from './types'

export const FAIXAS = [
  { de: 1, ate: 4, valor: 59.9, rotulo: '1 a 4 metros' },
  { de: 5, ate: 19, valor: 54.9, rotulo: '5 a 19 metros' },
  { de: 20, ate: Infinity, valor: 44.9, rotulo: '20 metros ou mais' },
] as const

/** Preço do metro conforme a faixa de metragem */
export const precoMetro = (m: number): number => {
  const metros = Number(m) || 0
  if (metros <= 0) return FAIXAS[0].valor
  if (metros <= 4) return FAIXAS[0].valor
  if (metros <= 19) return FAIXAS[1].valor
  return FAIXAS[2].valor
}

export const faixaRotulo = (m: number) => {
  const metros = Number(m) || 0
  if (metros <= 4) return FAIXAS[0].rotulo
  if (metros <= 19) return FAIXAS[1].rotulo
  return FAIXAS[2].rotulo
}

/** Arredonda como o sistema original (2 casas, mesma regra do toFixed do JS) */
const arredonda = (v: number) => Number(v.toFixed(2))

/**
 * Valor automático do pedido.
 * Se o cliente tiver "valor especial do metro", esse valor é usado no lugar da tabela.
 */
export const calcularValor = (m: number | null | undefined, valorEspecial?: number | null) => {
  const metros = Number(m) || 0
  if (metros <= 0) return 0
  const base =
    valorEspecial !== null && valorEspecial !== undefined && Number(valorEspecial) > 0
      ? Number(valorEspecial)
      : precoMetro(metros)
  return arredonda(metros * base)
}

/** Valor por metro efetivamente praticado no pedido */
export const valorPorMetro = (p: Pick<Pedido, 'metragem' | 'valor' | 'valor_modo'>) => {
  const m = Number(p.metragem) || 0
  if (!m) return 0
  return Number((Number(p.valor) / m).toFixed(2))
}

export const proximoNumero = (numeros: number[]) =>
  numeros.length ? Math.max(...numeros) + 1 : 1
