/**
 * Funcionários que já trabalham na loja.
 *
 * **Não existe mais conta de funcionário.** Estas pessoas são só nomes na lista
 * de funcionários: na hora de registrar uma fila, a pessoa escolhe o próprio
 * nome e ele fica gravado no pedido (é o que alimenta o relatório de comissão).
 *
 * Para mudar a equipe:
 *  • dia a dia → dentro do sistema: Funcionários e acessos → Novo funcionário
 *  • na instalação (nomes que já vêm prontos) → edite a lista EQUIPE_INICIAL
 *
 * O acesso do PROPRIETÁRIO nunca vem pronto: ele é criado no primeiro “Login
 * proprietário”, com senha.
 */
import { novoId } from './files'
import type { DB, Vendedor } from './types'

/** Quem já trabalha na loja (só o primeiro nome, como aparece nos pedidos) */
export const EQUIPE_INICIAL = ['JESSICA', 'RAISSA', 'ANDREIA']

/**
 * Marca de "equipe inicial já criada". Sem ela, apagar um funcionário de
 * propósito faria o sistema criar tudo de novo na próxima abertura.
 */
export const CHAVE_EQUIPE_INICIAL = 'altoprints:equipe-inicial-criada'

/**
 * Monta os cadastros de funcionário que ainda faltam. Aproveita quem já existe
 * (mesmo nome) e nunca duplica — assim dá para rodar em qualquer aparelho, no
 * modo local ou na nuvem.
 */
export function vendedoresDaEquipeInicial(db: DB): Vendedor[] {
  const agora = new Date().toISOString()
  const existentes = new Set(db.vendedores.map((v) => v.nome.trim().toLowerCase()))
  const faltando: Vendedor[] = []
  for (const nome of EQUIPE_INICIAL) {
    if (existentes.has(nome.trim().toLowerCase())) continue
    existentes.add(nome.trim().toLowerCase())
    faltando.push({ id: novoId(), nome, created_at: agora })
  }
  return faltando
}
