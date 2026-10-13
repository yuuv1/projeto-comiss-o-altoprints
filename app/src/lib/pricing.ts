// Tabela de preços da metragem (DTF) e cálculo automático do valor.
//
// Os preços moram nas configurações do sistema (Configurações → Preços), então
// o proprietário muda a tabela sem mexer no código.

import { FAIXAS_PRECO_PADRAO, type FaixaPreco, type Pedido } from './types'

/** faixas em uso (as salvas pelo proprietário ou a tabela padrão) */
export const faixasDePreco = (faixas?: FaixaPreco[] | null): FaixaPreco[] =>
  faixas && faixas.length ? faixas : FAIXAS_PRECO_PADRAO

/** Faixa de preço em que a metragem cai */
export const faixaDePreco = (m: number, faixas?: FaixaPreco[] | null): FaixaPreco | undefined => {
  const metros = Number(m) || 0
  const lista = [...faixasDePreco(faixas)].sort((a, b) => a.de - b.de)
  return (
    lista.find((f) => metros >= f.de && (f.ate === null || metros < f.ate)) ??
    // metragem acima da última faixa: usa a última mesmo
    [...lista].reverse().find((f) => metros >= f.de) ??
    lista[0]
  )
}

/** Preço do metro conforme a faixa de metragem */
export const precoMetro = (m: number, faixas?: FaixaPreco[] | null): number =>
  Number(faixaDePreco(m, faixas)?.valor ?? 0)

export const faixaRotulo = (m: number, faixas?: FaixaPreco[] | null) => faixaDePreco(m, faixas)?.rotulo ?? ''

/** Arredonda como o sistema original (2 casas, mesma regra do toFixed do JS) */
const arredonda = (v: number) => Number(v.toFixed(2))

/**
 * Valor automático da fila.
 * Se o cliente tiver "valor especial do metro", esse valor é usado no lugar da tabela.
 */
export const calcularValor = (
  m: number | null | undefined,
  valorEspecial?: number | null,
  faixas?: FaixaPreco[] | null,
) => {
  const metros = Number(m) || 0
  if (metros <= 0) return 0
  const base =
    valorEspecial !== null && valorEspecial !== undefined && Number(valorEspecial) > 0
      ? Number(valorEspecial)
      : precoMetro(metros, faixas)
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
