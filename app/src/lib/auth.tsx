// Login do sistema — **só do proprietário**.
//
// O dia a dia da loja NÃO pede login: qualquer pessoa abre o sistema e registra
// as filas escolhendo o próprio nome no pedido. O login existe apenas para o
// proprietário, que entra pelo cantinho “Login proprietário” no topo da tela e
// passa a ver os recursos do dono (Painel, Relatório, Funcionários, Configurações).
//
// A senha do proprietário fica só como hash no banco do sistema (local ou
// Supabase) — nunca em texto puro. Quando a nuvem está conectada, o login vale em
// qualquer aparelho, porque a conta viaja junto com os dados.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarTudo, removerRegistro, salvarRegistro } from './backend'
import { novoId } from './files'
import { lsGravar, lsLer, lsRemover } from './local'
import { gerarHashSenha, senhaConfere } from './senha'
import { emNuvem } from './supabase'
import type { Usuario } from './types'
import { normalizarUsuario, validarSenha, validarUsuario } from './usuario'
import { useStore } from './store'

/* as regras do nome de usuário ficam em lib/usuario.ts; continuam saindo daqui
   para não quebrar quem já importa deste módulo */
export { emailInterno, normalizarUsuario, validarUsuario } from './usuario'

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

const CHAVE_SESSAO = 'altoprints:sessao'
const CHAVE_TENTATIVAS = 'altoprints:tentativas'
const DIAS_CONECTADO = 30
const MAX_TENTATIVAS = 5
const BLOQUEIO_MINUTOS = 5

interface Sessao {
  usuario_id: string
  expira_em: string
  conectado: boolean
}

const lerSessao = (): Sessao | null => {
  try {
    const bruto = lsLer(CHAVE_SESSAO)
    if (!bruto) return null
    const s = JSON.parse(bruto) as Sessao
    if (new Date(s.expira_em).getTime() < Date.now()) {
      lsRemover(CHAVE_SESSAO)
      return null
    }
    return s
  } catch {
    return null
  }
}

interface Tentativas {
  [usuario: string]: { erros: number; bloqueado_ate?: string }
}

const lerTentativas = (): Tentativas => {
  try {
    return JSON.parse(lsLer(CHAVE_TENTATIVAS) || '{}') as Tentativas
  } catch {
    return {}
  }
}

/** anotar as tentativas é importante, mas nunca pode impedir o login */
const gravarTentativas = (t: Tentativas) => {
  lsGravar(CHAVE_TENTATIVAS, JSON.stringify(t))
}

/* ------------------------------------------------------------------ */
/* contexto                                                            */
/* ------------------------------------------------------------------ */

export interface AuthContexto {
  /** o proprietário conectado — `null` quando o sistema está no modo aberto (equipe) */
  usuario: Usuario | null
  carregando: boolean
  nuvem: boolean
  ehProprietario: boolean
  /** já existe alguma conta de proprietário no sistema? (se não, a tela oferece criar) */
  temProprietario: boolean
  entrar: (usuario: string, senha: string, manter: boolean) => Promise<void>
  sair: () => Promise<void>
  /** primeiro acesso do dono (a tela só oferece quando ainda não existe nenhum) */
  criarContaProprietario: (dados: { nome: string; usuario: string; senha: string }) => Promise<void>
  /** outro acesso de proprietário, criado na tela Funcionários e acessos */
  criarOutroProprietario: (dados: { nome: string; usuario: string; senha: string }) => Promise<void>
  trocarMinhaSenha: (senhaAtual: string, nova: string) => Promise<void>
  atualizarMeuPerfil: (dados: { nome: string }) => Promise<void>
  /** troca o próprio nome de usuário (login) */
  trocarMeuUsuario: (novoUsuario: string) => Promise<void>
  /** redefine a senha de outro acesso de proprietário */
  redefinirSenha: (usuarioId: string, novaSenha: string) => Promise<void>
  alternarAtivo: (usuarioId: string, ativo: boolean) => Promise<void>
  excluirUsuario: (usuarioId: string) => Promise<void>
}

const AuthContext = createContext<AuthContexto | null>(null)
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

/**
 * Lê o banco na hora. O estado do React pode estar desatualizado (duas abas,
 * cliques muito rápidos), então as regras importantes são conferidas aqui.
 */
const lerUsuarios = async (): Promise<Usuario[]> => {
  try {
    const atual = await carregarTudo()
    return atual.usuarios ?? []
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/* provider                                                            */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const { db, carregando: carregandoDados, recarregar, avisar } = useStore()
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  const usuarios = db.usuarios ?? []
  const existentes = useMemo(() => usuarios.filter((u) => u.papel === 'proprietario'), [usuarios])
  const contaAtual = useMemo(() => usuarios.find((u) => u.id === usuarioId) ?? null, [usuarioId, usuarios])
  /** só vale como sessão se a conta ainda existir, estiver ativa e for de proprietário */
  const usuario = contaAtual && contaAtual.ativo && contaAtual.papel === 'proprietario' ? contaAtual : null
  const temProprietario = existentes.length > 0

  // restaura a sessão guardada (se a conta sumiu do banco, a sessão é descartada)
  useEffect(() => {
    if (carregandoDados) return
    const sessao = lerSessao()
    if (sessao) {
      const achou = usuarios.find((u) => u.id === sessao.usuario_id && u.ativo && u.papel === 'proprietario')
      if (achou) setUsuarioId(achou.id)
      else lsRemover(CHAVE_SESSAO)
    }
    setCarregando(false)
  }, [carregandoDados, usuarios])

  const guardarSessao = (id: string, manter: boolean) => {
    const dias = manter ? DIAS_CONECTADO : 1 / 24 // "não manter": 1 hora
    const expira = new Date(Date.now() + dias * 86400000).toISOString()
    // se o navegador não deixar guardar (anônima / sem espaço), a sessão vale só enquanto a aba estiver aberta
    lsGravar(CHAVE_SESSAO, JSON.stringify({ usuario_id: id, expira_em: expira, conectado: manter }))
  }

  /* ------------------------------ entrar ------------------------------ */

  const entrar = useCallback(
    async (login: string, senha: string, manter: boolean) => {
      const nomeUsuario = normalizarUsuario(login)
      const tentativas = lerTentativas()
      const registroTentativa = tentativas[nomeUsuario]
      if (registroTentativa?.bloqueado_ate && new Date(registroTentativa.bloqueado_ate).getTime() > Date.now()) {
        const minutos = Math.ceil((new Date(registroTentativa.bloqueado_ate).getTime() - Date.now()) / 60000)
        throw new Error(`Muitas tentativas. Tente novamente em ${minutos} minuto(s).`)
      }

      const noBanco = await lerUsuarios()
      const lista = noBanco.length ? noBanco : usuarios
      const conta = lista.find((u) => u.usuario === nomeUsuario)
      const registrarErro = () => {
        const erros = (registroTentativa?.erros ?? 0) + 1
        tentativas[nomeUsuario] = {
          erros,
          bloqueado_ate:
            erros >= MAX_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60000).toISOString() : undefined,
        }
        gravarTentativas(tentativas)
      }

      if (!conta) {
        registrarErro()
        throw new Error('Usuário ou senha inválidos.')
      }
      if (conta.papel !== 'proprietario')
        throw new Error('Este login é exclusivo do proprietário. Para registrar pedidos, feche esta tela.')
      if (!conta.ativo) throw new Error('Este acesso está desativado.')
      if (!(await senhaConfere(senha, conta.senha_hash))) {
        registrarErro()
        throw new Error('Usuário ou senha inválidos.')
      }

      delete tentativas[nomeUsuario]
      gravarTentativas(tentativas)
      setUsuarioId(conta.id)
      guardarSessao(conta.id, manter)
    },
    [usuarios],
  )

  const sair = useCallback(async () => {
    lsRemover(CHAVE_SESSAO)
    setUsuarioId(null)
    avisar('Você saiu do acesso do proprietário. O sistema continua aberto para a equipe.', 'info')
  }, [avisar])

  /* --------------------------- criar acessos --------------------------- */

  /**
   * Cria um acesso de proprietário. `entrarAgora` só é `true` no primeiro acesso
   * (a pessoa acabou de ser convidada a criar o login dela).
   */
  const criarDono = useCallback(
    async (dados: { nome: string; usuario: string; senha: string }, entrarAgora: boolean) => {
      const erro = validarUsuario(dados.usuario)
      if (erro) throw new Error(erro)
      const erroSenha = validarSenha(dados.senha)
      if (erroSenha) throw new Error(erroSenha)
      if (!dados.nome.trim()) throw new Error('Informe o seu nome.')

      const nomeUsuario = normalizarUsuario(dados.usuario)
      const noBanco = await lerUsuarios()
      const lista = noBanco.length ? noBanco : usuarios
      if (lista.some((u) => u.usuario === nomeUsuario)) throw new Error('Este nome de usuário já está em uso.')

      const conta: Usuario = {
        id: novoId(),
        nome: dados.nome.trim(),
        usuario: nomeUsuario,
        senha_hash: await gerarHashSenha(dados.senha),
        papel: 'proprietario',
        vendedor_id: '',
        ativo: true,
        criado_em: new Date().toISOString(),
      }
      await salvarRegistro('usuarios', conta)
      await recarregar()
      if (entrarAgora) {
        setUsuarioId(conta.id)
        guardarSessao(conta.id, true)
        avisar(`Bem-vindo, ${conta.nome}! Sua senha de proprietário está valendo.`)
      } else {
        avisar(`Acesso de ${conta.nome} criado. Usuário: ${conta.usuario}.`)
      }
    },
    [avisar, recarregar, usuarios],
  )

  const criarContaProprietario = useCallback<AuthContexto['criarContaProprietario']>(
    async (dados) => {
      const noBanco = await lerUsuarios()
      if ((noBanco.length ? noBanco : usuarios).some((u) => u.papel === 'proprietario'))
        throw new Error('O sistema já tem um proprietário cadastrado.')
      await criarDono(dados, true)
    },
    [criarDono, usuarios],
  )

  const criarOutroProprietario = useCallback<AuthContexto['criarOutroProprietario']>(
    async (dados) => {
      await criarDono(dados, false)
    },
    [criarDono],
  )

  /* ------------------------------ perfil ------------------------------ */

  const trocarMinhaSenha: AuthContexto['trocarMinhaSenha'] = async (senhaAtual, nova) => {
    if (!usuario) throw new Error('Sessão expirada.')
    const erroSenha = validarSenha(nova)
    if (erroSenha) throw new Error(erroSenha)
    const noBanco = await lerUsuarios()
    const alvo = noBanco.find((u) => u.id === usuario.id) ?? usuario
    if (!(await senhaConfere(senhaAtual, alvo.senha_hash))) throw new Error('A senha atual não confere.')
    await salvarRegistro('usuarios', { ...alvo, senha_hash: await gerarHashSenha(nova) })
    await recarregar()
    avisar('Senha alterada com sucesso!')
  }

  const atualizarMeuPerfil: AuthContexto['atualizarMeuPerfil'] = async ({ nome }) => {
    if (!usuario) throw new Error('Sessão expirada.')
    const noBanco = await lerUsuarios()
    const alvo = noBanco.find((u) => u.id === usuario.id) ?? usuario
    await salvarRegistro('usuarios', { ...alvo, nome: nome.trim() || alvo.nome })
    await recarregar()
    avisar('Perfil atualizado!')
  }

  const trocarMeuUsuario: AuthContexto['trocarMeuUsuario'] = async (novo) => {
    if (!usuario) throw new Error('Sessão expirada.')
    const erro = validarUsuario(novo)
    if (erro) throw new Error(erro)
    const normalizado = normalizarUsuario(novo)
    const noBanco = await lerUsuarios()
    if (noBanco.some((u) => u.id !== usuario.id && u.usuario === normalizado))
      throw new Error('Este nome de usuário já está em uso.')
    const alvo = noBanco.find((u) => u.id === usuario.id) ?? usuario
    await salvarRegistro('usuarios', { ...alvo, usuario: normalizado })
    await recarregar()
    avisar(`Agora o seu usuário é "${normalizado}".`)
  }

  const redefinirSenha: AuthContexto['redefinirSenha'] = async (usuarioId, novaSenha) => {
    if (usuarioId === usuario?.id) throw new Error('Para trocar a sua própria senha, use "Meu acesso".')
    const noBanco = await lerUsuarios()
    const alvo = (noBanco.length ? noBanco : usuarios).find((u) => u.id === usuarioId)
    if (!alvo) throw new Error('Conta não encontrada.')
    const erroSenha = validarSenha(novaSenha)
    if (erroSenha) throw new Error(erroSenha)
    await salvarRegistro('usuarios', { ...alvo, senha_hash: await gerarHashSenha(novaSenha) })
    await recarregar()
    avisar(`Senha de ${alvo.nome} redefinida.`)
  }

  const alternarAtivo: AuthContexto['alternarAtivo'] = async (usuarioId, ativo) => {
    const noBanco = await lerUsuarios()
    const lista = noBanco.length ? noBanco : usuarios
    const alvo = lista.find((u) => u.id === usuarioId)
    if (!alvo) return
    if (!ativo && alvo.papel === 'proprietario' && lista.filter((u) => u.papel === 'proprietario' && u.ativo).length <= 1) {
      throw new Error('Não é possível desativar o único proprietário do sistema.')
    }
    if (!ativo && alvo.id === usuario?.id) throw new Error('Você não pode desativar o seu próprio acesso.')
    await salvarRegistro('usuarios', { ...alvo, ativo })
    await recarregar()
    avisar(ativo ? `Acesso de ${alvo.nome} liberado.` : `Acesso de ${alvo.nome} desativado.`, ativo ? 'sucesso' : 'info')
  }

  /**
   * Exclui um acesso de proprietário.
   * Regras: ninguém exclui o próprio acesso e o sistema nunca fica sem nenhum
   * proprietário ativo.
   */
  const excluirUsuario: AuthContexto['excluirUsuario'] = async (usuarioId) => {
    if (usuarioId === usuario?.id) throw new Error('Você não pode excluir o seu próprio acesso.')
    const noBanco = await lerUsuarios()
    const lista = noBanco.length ? noBanco : usuarios
    const alvo = lista.find((u) => u.id === usuarioId)
    if (!alvo) return
    const outrosDonos = lista.filter((u) => u.papel === 'proprietario' && u.ativo && u.id !== alvo.id)
    if (!outrosDonos.length)
      throw new Error(
        'Este é o único proprietário ativo do sistema: crie (ou libere) outro acesso de proprietário antes de excluí-lo.',
      )
    await removerRegistro('usuarios', usuarioId)
    await recarregar()
    avisar(`Acesso de ${alvo.nome} excluído.`, 'info')
  }

  const valor: AuthContexto = {
    usuario,
    carregando: carregando || carregandoDados,
    nuvem: emNuvem(),
    ehProprietario: Boolean(usuario),
    temProprietario,
    entrar,
    sair,
    criarContaProprietario,
    criarOutroProprietario,
    trocarMinhaSenha,
    atualizarMeuPerfil,
    trocarMeuUsuario,
    redefinirSenha,
    alternarAtivo,
    excluirUsuario,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
