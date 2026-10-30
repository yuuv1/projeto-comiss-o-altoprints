// Busca rápida do sistema (Ctrl + K): acha pedido, cliente e vendedor de
// qualquer tela, sem precisar lembrar em qual lista cada coisa está.
//
// É uma função pura de propósito: a janela de busca só desenha o resultado.
// Assim dá para testar as regras (acento, telefone, o que cada pessoa pode ver)
// sem abrir o navegador.
import { telLimpo } from './format'
import type { Cliente, DB, ID, Pedido, Vendedor } from './types'

export type Achado =
  | { tipo: 'pedido'; pedido: Pedido }
  | { tipo: 'cliente'; cliente: Cliente }
  | { tipo: 'vendedor'; vendedor: Vendedor }

/**
 * Máximo de resultados na janela (o resto é refinado pela pessoa).
 * São 7 pedidos + 5 clientes + 3 vendedores: assim nenhuma categoria
 * desaparece só porque as outras encheram a lista.
 */
export const LIMITE_BUSCA = 15

/** minúsculo e sem acento — "JOSÉ" e "jose" acham a mesma coisa */
export const normalizarBusca = (texto: string) =>
  (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export interface FiltroBusca {
  /**
   * quando vem, a busca fica restrita a esse vendedor — é o que garante que o
   * funcionário não encontre pedido nem cliente de outra pessoa
   */
  vendedorId?: ID | ''
  /** vendedores só aparecem para o proprietário */
  verVendedores?: boolean
}

/**
 * Procura em pedidos (#número, cliente, descrição, cidade, rastreio),
 * clientes (nome, telefone, e-mail) e vendedores (nome).
 * Aceita telefone digitado com ou sem máscara.
 */
export function buscarTudo(db: DB, termo: string, filtro: FiltroBusca = {}): Achado[] {
  const alvo = normalizarBusca(termo)
  if (!alvo) return []

  const digitos = telLimpo(termo)
  const casa = (...campos: (string | number | null | undefined)[]) => {
    const texto = normalizarBusca(campos.filter((c) => c !== null && c !== undefined).join(' '))
    if (texto.includes(alvo)) return true
    // telefone: "(62) 99999-0000" também é achado digitando só "99999"
    return digitos.length >= 3 && telLimpo(texto).includes(digitos)
  }

  const doVendedor = (vendedorId: string) => !filtro.vendedorId || vendedorId === filtro.vendedorId

  const pedidos = [...db.pedidos]
    .filter((p) => doVendedor(p.vendedor_id || ''))
    .filter((p) =>
      casa(
        p.numero,
        `#${p.numero}`,
        p.cliente_nome,
        p.descricao,
        p.cidade,
        p.estado,
        p.codigo_rastreio,
        p.observacoes,
        p.forma_pagamento,
      ),
    )
    .sort((a, b) => b.numero - a.numero)

  const clientes = [...db.clientes]
    .filter((c) => doVendedor(c.vendedor_id || ''))
    .filter((c) => casa(c.nome, c.telefone, c.email, c.observacoes))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const vendedores = filtro.verVendedores
    ? [...db.vendedores].filter((v) => casa(v.nome)).sort((a, b) => a.nome.localeCompare(b.nome))
    : []

  const achados: Achado[] = []
  for (const pedido of pedidos.slice(0, 7)) achados.push({ tipo: 'pedido', pedido })
  for (const cliente of clientes.slice(0, 5)) achados.push({ tipo: 'cliente', cliente })
  for (const vendedor of vendedores.slice(0, 3)) achados.push({ tipo: 'vendedor', vendedor })
  return achados.slice(0, LIMITE_BUSCA)
}
