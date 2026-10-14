/**
 * Equipe inicial da loja.
 *
 * Estas são as pessoas que já trabalham aqui: o sistema cria o acesso delas na
 * primeira abertura, **sem senha** — cada uma entra tocando no próprio nome na
 * tela de entrada.
 *
 * Para mudar a equipe:
 *  • dia a dia  → dentro do sistema: Equipe → Nova conta / Desativar / Excluir
 *  • na instalação (nomes que já entram prontos) → edite a lista EQUIPE_INICIAL
 *
 * O acesso do PROPRIETÁRIO nunca vem pronto: ele é criado pela porta
 * administrativa (#/administracao) e exige senha.
 */
import { novoId } from './files'
import { type DB, type Usuario, type Vendedor } from './types'
import { normalizarUsuario } from './usuario'

/** Quem já trabalha na loja (só o primeiro nome, como aparece nos pedidos) */
export const EQUIPE_INICIAL = ['JESSICA', 'RAISSA', 'ANDREIA']

/**
 * Marca de "equipe inicial já criada". Sem ela, apagar uma conta de propósito
 * faria o sistema criar tudo de novo na próxima abertura.
 */
export const CHAVE_EQUIPE_INICIAL = 'altoprints:equipe-inicial-criada'

/**
 * Monta os registros que faltam para a equipe inicial existir.
 * Aproveita o que já estiver no banco (vendedor de mesmo nome, login já usado)
 * e nunca cria duplicado — assim dá para rodar em qualquer aparelho, no modo
 * local ou na nuvem.
 */
export function registrosEquipeInicial(db: DB): { vendedores: Vendedor[]; usuarios: Usuario[] } {
  const agora = new Date().toISOString()
  const vendedores: Vendedor[] = []
  const usuarios: Usuario[] = []

  const vinculosEmUso = new Set(db.usuarios.map((u) => u.vendedor_id).filter(Boolean))

  for (const nome of EQUIPE_INICIAL) {
    const login = normalizarUsuario(nome)
    if (!login) continue

    // já existe conta com este login? Se for de vendedor e ainda pedia senha,
    // passa para a entrada pelo nome (sem senha)
    const contaExistente = db.usuarios.find((u) => u.usuario === login)
    if (contaExistente) {
      if (contaExistente.papel === 'vendedor' && !contaExistente.sem_senha) {
        usuarios.push({ ...contaExistente, senha_hash: '', sem_senha: true })
      }
      continue
    }

    // já existe um vendedor com este nome (histórico antigo)? aproveita o cadastro
    const existente = db.vendedores.find((v) => v.nome.trim().toLowerCase() === nome.trim().toLowerCase())
    let vendedorId = existente?.id ?? ''
    if (!vendedorId) {
      const novo: Vendedor = { id: novoId(), nome, created_at: agora }
      vendedores.push(novo)
      vendedorId = novo.id
    }
    // este vendedor já tem um acesso criado: não cria o segundo
    if (vinculosEmUso.has(vendedorId)) continue

    usuarios.push({
      id: novoId(),
      nome,
      usuario: login,
      // sem senha: a entrada é pelo nome, na tela de início
      senha_hash: '',
      sem_senha: true,
      papel: 'vendedor',
      vendedor_id: vendedorId,
      ativo: true,
      criado_em: agora,
    })
  }

  return { vendedores, usuarios }
}
