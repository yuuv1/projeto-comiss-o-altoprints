// Login do sistema.
//
// Hoje o login funciona em dois formatos, com a MESMA tela:
//  • local  — as contas ficam no banco do sistema (navegador), senha com hash
//  • nuvem  — quando o Supabase Auth estiver configurado, a senha é validada pelo
//             próprio Supabase (mais seguro) e o perfil local guarda papel/vínculo.
//
// A troca de um modo para o outro não muda nenhuma tela do sistema.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarTudo, removerRegistro, salvarRegistro } from './backend'
import { novoId } from './files'
import { ACESSO_DEMO, contaDemo } from './seed'
import { gerarHashSenha, senhaConfere } from './senha'
import { clienteNuvem, emNuvem } from './supabase'
import { type TelasAcesso, type Usuario, type Vendedor } from './types'
import { useStore } from './store'

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

/** normaliza o nome de usuário digitado (sem espaços, acentos, minúsculo) */
export const normalizarUsuario = (valor: string) =>
  (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24)

export const validarUsuario = (valor: string) => {
  const u = normalizarUsuario(valor)
  if (u.length < 3) return 'O nome de usuário precisa ter pelo menos 3 letras.'
  if (/^[._-]/.test(u)) return 'O nome de usuário não pode começar com ponto, traço ou underline.'
  return ''
}

/** e-mail interno usado quando o login é por nome de usuário (Supabase Auth precisa de e-mail) */
export const emailInterno = (usuario: string) => `${normalizarUsuario(usuario)}@altoprints.local`

const CHAVE_SESSAO = 'altoprints:sessao'
const CHAVE_TENTATIVAS = 'altoprints:tentativas'
/** marca usada só no modo de desenvolvimento (prévia): entra sozinho uma vez */
const CHAVE_ENTRADA_DEV = 'altoprints:entrada-automatica'
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
    const bruto = localStorage.getItem(CHAVE_SESSAO)
    if (!bruto) return null
    const s = JSON.parse(bruto) as Sessao
    if (new Date(s.expira_em).getTime() < Date.now()) {
      localStorage.removeItem(CHAVE_SESSAO)
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
    return JSON.parse(localStorage.getItem(CHAVE_TENTATIVAS) || '{}') as Tentativas
  } catch {
    return {}
  }
}

const gravarTentativas = (t: Tentativas) => localStorage.setItem(CHAVE_TENTATIVAS, JSON.stringify(t))

/* ------------------------------------------------------------------ */
/* contexto                                                            */
/* ------------------------------------------------------------------ */

export interface AuthContexto {
  usuario: Usuario | null
  /** nome do vendedor vinculado à conta (para travar o campo vendedor nos pedidos) */
  vendedorNome: string
  carregando: boolean
  nuvem: boolean
  ehProprietario: boolean
  /** já existe alguma conta de proprietário no sistema? */
  temProprietario: boolean
  entrar: (usuario: string, senha: string, manter: boolean) => Promise<void>
  sair: () => Promise<void>
  criarContaProprietario: (dados: { nome: string; usuario: string; senha: string }) => Promise<void>
  criarContaVendedor: (dados: { nome: string; usuario: string; senha: string; vendedorId?: string }) => Promise<void>
  /** cria a conta pelo painel do proprietário (Equipe → Nova conta) */
  criarContaComoDono: (dados: {
    nome: string
    usuario: string
    senha: string
    vendedorId?: string
    administrador?: boolean
  }) => Promise<void>
  trocarMinhaSenha: (senhaAtual: string, nova: string) => Promise<void>
  atualizarMeuPerfil: (dados: { nome: string }) => Promise<void>
  /** troca o próprio nome de usuário (login) — no modo nuvem fica bloqueado */
  trocarMeuUsuario: (novoUsuario: string) => Promise<void>
  redefinirSenha: (usuarioId: string, novaSenha: string) => Promise<void>
  atualizarVinculo: (usuarioId: string, vendedorId: string) => Promise<void>
  /** libera/bloqueia as telas de relatório de um acesso de vendedor */
  salvarTelas: (usuarioId: string, telas: Partial<TelasAcesso>) => Promise<void>
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
  const usuario = useMemo(() => usuarios.find((u) => u.id === usuarioId) ?? null, [usuarioId, usuarios])
  const temProprietario = useMemo(() => usuarios.some((u) => u.papel === 'proprietario'), [usuarios])

  // restaura a sessão guardada
  useEffect(() => {
    if (carregandoDados) return
    ;(async () => {
      try {
        // se estiver no modo nuvem com Supabase Auth, usa a sessão do Supabase
        const sb = clienteNuvem()
        if (sb) {
          const { data } = await sb.auth.getSession()
          const email = data.session?.user?.email
          if (email) {
            const login = email.split('@')[0]
            const perfil = usuarios.find((u) => u.usuario === login && u.ativo)
            if (perfil) {
              setUsuarioId(perfil.id)
              setCarregando(false)
              return
            }
          }
        }
        const sessao = lerSessao()
        if (sessao) {
          const achou = usuarios.find((u) => u.id === sessao.usuario_id && u.ativo)
          if (achou) setUsuarioId(achou.id)
          else localStorage.removeItem(CHAVE_SESSAO)
        } else if (import.meta.env.DEV) {
          // Na prévia (modo de desenvolvimento) o sistema entra sozinho com o
          // acesso de exemplo, uma única vez — para ver o sistema sem passar pelo
          // login. A versão publicada nunca faz isso.
          const demo = usuarios.find((u) => u.usuario === ACESSO_DEMO.usuario && u.ativo)
          if (demo && localStorage.getItem(CHAVE_ENTRADA_DEV) !== '1') {
            try {
              localStorage.setItem(CHAVE_ENTRADA_DEV, '1')
            } catch {
              /* sem problema: só não vai lembrar que já entrou */
            }
            localStorage.setItem(
              CHAVE_SESSAO,
              JSON.stringify({
                usuario_id: demo.id,
                expira_em: new Date(Date.now() + 30 * 86400000).toISOString(),
                conectado: true,
              }),
            )
            setUsuarioId(demo.id)
          }
        }
      } finally {
        setCarregando(false)
      }
    })()
  }, [carregandoDados, usuarios])

  const guardarSessao = (id: string, manter: boolean) => {
    const dias = manter ? DIAS_CONECTADO : 1 / 24 // "não manter": 1 hora
    const expira = new Date(Date.now() + dias * 86400000).toISOString()
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ usuario_id: id, expira_em: expira, conectado: manter }))
  }

  /* ------------------------------ entrar ------------------------------ */

  const entrar = useCallback(
    async (login: string, senha: string, manter: boolean) => {
      const nomeUsuario = normalizarUsuario(login)
      const tentativas = lerTentativas()
      const registroTentativa = tentativas[nomeUsuario]
      if (registroTentativa?.bloqueado_ate && new Date(registroTentativa.bloqueado_ate).getTime() > Date.now()) {
        const minutos = Math.ceil(
          (new Date(registroTentativa.bloqueado_ate).getTime() - Date.now()) / 60000,
        )
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

      if (!conta.ativo) throw new Error('Este acesso está desativado. Fale com o proprietário.')

      // 1) tenta pelo Supabase Auth quando configurado
      const sb = clienteNuvem()
      if (sb) {
        const { error } = await sb.auth.signInWithPassword({ email: emailInterno(conta.usuario), password: senha })
        if (error) {
          // se a conta ainda não existe na nuvem, cria agora (primeiro login)
          const { error: erroCadastro } = await sb.auth.signUp({
            email: emailInterno(conta.usuario),
            password: senha,
          })
          if (erroCadastro) {
            registrarErro()
            throw new Error('Usuário ou senha inválidos.')
          }
        }
      } else if (!(await senhaConfere(senha, conta.senha_hash))) {
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
    const sb = clienteNuvem()
    if (sb) await sb.auth.signOut()
    localStorage.removeItem(CHAVE_SESSAO)
    setUsuarioId(null)
  }, [])

  /* --------------------------- criar contas --------------------------- */

  const criarContaProprietario: AuthContexto['criarContaProprietario'] = async ({ nome, usuario, senha }) => {
    const noBanco = await lerUsuarios()
    if (noBanco.some((u) => u.papel === 'proprietario') || temProprietario)
      throw new Error('O sistema já tem um proprietário cadastrado.')
    if (noBanco.some((u) => u.usuario === normalizarUsuario(usuario)))
      throw new Error('Este nome de usuário já está em uso.')
    const erro = validarUsuario(usuario)
    if (erro) throw new Error(erro)
    if (senha.length < 4) throw new Error('A senha precisa ter pelo menos 4 caracteres.')
    if (!nome.trim()) throw new Error('Informe o seu nome.')

    const conta: Usuario = {
      id: novoId(),
      nome: nome.trim(),
      usuario: normalizarUsuario(usuario),
      senha_hash: await gerarHashSenha(senha),
      papel: 'proprietario',
      vendedor_id: '',
      ativo: true,
      criado_em: new Date().toISOString(),
    }

    await salvarRegistro('usuarios', conta)
    await recarregar()
    setUsuarioId(conta.id)
    guardarSessao(conta.id, true)
    avisar(`Bem-vindo, ${conta.nome}! Sua conta de proprietário foi criada.`)
  }

  /**
   * Regras comuns das telas de cadastro (login e painel do proprietário).
   * Confere tudo no banco na hora, liga o vendedor e cria o vendedor novo quando
   * a pessoa informa um nome que ainda não existe.
   */
  const prepararConta = async (
    dados: { nome: string; usuario: string; senha: string; vendedorId?: string },
    papel: 'proprietario' | 'vendedor',
  ): Promise<Usuario> => {
    const erro = validarUsuario(dados.usuario)
    if (erro) throw new Error(erro)
    if (dados.senha.length < 4) throw new Error('A senha precisa ter pelo menos 4 caracteres.')
    if (!dados.nome.trim()) throw new Error('Informe o seu nome.')

    const noBanco = await lerUsuarios()
    const contas = noBanco.length ? noBanco : usuarios
    if (contas.some((u) => u.usuario === normalizarUsuario(dados.usuario)))
      throw new Error('Este nome de usuário já está em uso.')

    let idVendedor = ''
    if (papel === 'vendedor') {
      idVendedor = dados.vendedorId ?? ''
      if (idVendedor) {
        // nome escolhido na lista: só pode ser assumido se ninguém tiver conta nele
        if (contas.some((u) => u.vendedor_id === idVendedor))
          throw new Error('Este nome já tem um acesso criado. Fale com o proprietário.')
      } else {
        // sem escolha: aproveita o vendedor de mesmo nome ou cria um novo
        const existente = db.vendedores.find((v) => v.nome.trim().toLowerCase() === dados.nome.trim().toLowerCase())
        if (existente) {
          if (contas.some((u) => u.vendedor_id === existente.id))
            throw new Error('Já existe um acesso para este nome. Fale com o proprietário.')
          idVendedor = existente.id
        } else {
          const novoVendedor: Vendedor = {
            id: novoId(),
            nome: dados.nome.trim(),
            created_at: new Date().toISOString(),
          }
          await salvarRegistro('vendedores', novoVendedor)
          idVendedor = novoVendedor.id
        }
      }
    }

    return {
      id: novoId(),
      nome: dados.nome.trim(),
      usuario: normalizarUsuario(dados.usuario),
      senha_hash: await gerarHashSenha(dados.senha),
      papel,
      vendedor_id: idVendedor,
      ativo: true,
      criado_em: new Date().toISOString(),
    }
  }

  const criarContaVendedor: AuthContexto['criarContaVendedor'] = async ({ nome, usuario, senha, vendedorId }) => {
    const conta = await prepararConta({ nome, usuario, senha, vendedorId }, 'vendedor')

    const sb = clienteNuvem()
    if (sb) {
      const { error } = await sb.auth.signUp({ email: emailInterno(conta.usuario), password: senha })
      if (error && !/already registered/i.test(error.message)) {
        throw new Error(`Não foi possível criar a conta na nuvem: ${error.message}`)
      }
    }

    await salvarRegistro('usuarios', conta)
    await recarregar()
    setUsuarioId(conta.id)
    guardarSessao(conta.id, true)
    avisar(`Acesso criado! Bem-vindo, ${conta.nome}.`)
  }

  /** usado pelo proprietário na tela Equipe: cria a conta sem trocar a sessão dele */
  const criarContaComoDono: AuthContexto['criarContaComoDono'] = async ({
    nome,
    usuario,
    senha,
    vendedorId,
    administrador,
  }) => {
    const conta = await prepararConta({ nome, usuario, senha, vendedorId }, administrador ? 'proprietario' : 'vendedor')
    await salvarRegistro('usuarios', conta)
    await recarregar()
    avisar(`Acesso de ${conta.nome} criado. Usuário: ${conta.usuario}.`)
  }

  /* ------------------------------ perfil ------------------------------ */

  const trocarMinhaSenha: AuthContexto['trocarMinhaSenha'] = async (senhaAtual, nova) => {
    if (!usuario) throw new Error('Sessão expirada.')
    if (nova.length < 4) throw new Error('A nova senha precisa ter pelo menos 4 caracteres.')
    const noBanco = await lerUsuarios()
    const alvo = noBanco.find((u) => u.id === usuario.id) ?? usuario
    // no modo local (ou quando a validação for local) confere a senha atual
    if (!(await senhaConfere(senhaAtual, alvo.senha_hash))) throw new Error('A senha atual não confere.')

    const atualizado: Usuario = { ...alvo, senha_hash: await gerarHashSenha(nova) }
    await salvarRegistro('usuarios', atualizado)
    const sb = clienteNuvem()
    if (sb) await sb.auth.updateUser({ password: nova })
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
    if (emNuvem())
      throw new Error(
        'No modo nuvem o nome de usuário não pode ser trocado por aqui. Troque em Conexões → Nuvem antes de conectar o banco.',
      )
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
    const noBanco = await lerUsuarios()
    const alvo = (noBanco.length ? noBanco : usuarios).find((u) => u.id === usuarioId)
    if (!alvo) throw new Error('Conta não encontrada.')
    if (novaSenha.length < 4) throw new Error('A senha precisa ter pelo menos 4 caracteres.')
    await salvarRegistro('usuarios', { ...alvo, senha_hash: await gerarHashSenha(novaSenha) })
    await recarregar()
    avisar(`Senha de ${alvo.nome} redefinida.`)
  }

  const atualizarVinculo: AuthContexto['atualizarVinculo'] = async (usuarioId, vendedorId) => {
    const noBanco = await lerUsuarios()
    const alvo = (noBanco.length ? noBanco : usuarios).find((u) => u.id === usuarioId)
    if (!alvo) throw new Error('Conta não encontrada.')
    await salvarRegistro('usuarios', { ...alvo, vendedor_id: vendedorId })
    await recarregar()
    const nome = db.vendedores.find((v) => v.id === vendedorId)?.nome
    avisar(nome ? `Acesso ligado ao vendedor ${nome}.` : 'Acesso desligado de qualquer vendedor.')
  }

  const salvarTelas: AuthContexto['salvarTelas'] = async (usuarioId, telas) => {
    const noBanco = await lerUsuarios()
    const alvo = (noBanco.length ? noBanco : usuarios).find((u) => u.id === usuarioId)
    if (!alvo) throw new Error('Conta não encontrada.')
    await salvarRegistro('usuarios', { ...alvo, telas })
    await recarregar()
    avisar(`Telas de ${alvo.nome} atualizadas.`)
  }

  const alternarAtivo: AuthContexto['alternarAtivo'] = async (usuarioId, ativo) => {
    const noBanco = await lerUsuarios()
    const lista = noBanco.length ? noBanco : usuarios
    const alvo = lista.find((u) => u.id === usuarioId)
    if (!alvo) return
    if (!ativo && alvo.papel === 'proprietario' && lista.filter((u) => u.papel === 'proprietario' && u.ativo).length <= 1) {
      throw new Error('Não é possível desativar o único proprietário do sistema.')
    }
    await salvarRegistro('usuarios', { ...alvo, ativo })
    await recarregar()
    avisar(ativo ? `Acesso de ${alvo.nome} liberado.` : `Acesso de ${alvo.nome} desativado.`, ativo ? 'sucesso' : 'info')
  }

  const excluirUsuario: AuthContexto['excluirUsuario'] = async (usuarioId) => {
    const alvo = usuarios.find((u) => u.id === usuarioId)
    if (!alvo) return
    if (alvo.papel === 'proprietario') throw new Error('Contas de proprietário não podem ser excluídas.')
    await removerRegistro('usuarios', usuarioId)
    await recarregar()
    avisar('Conta excluída.', 'info')
  }

  const vendedorNome = useMemo(() => {
    if (!usuario) return ''
    if (usuario.papel === 'proprietario') return 'Proprietário'
    return db.vendedores.find((v) => v.id === usuario.vendedor_id)?.nome ?? usuario.nome
  }, [db.vendedores, usuario])

  const valor: AuthContexto = {
    usuario,
    vendedorNome,
    carregando: carregando || carregandoDados,
    nuvem: emNuvem(),
    ehProprietario: usuario?.papel === 'proprietario',
    temProprietario,
    entrar,
    sair,
    criarContaProprietario,
    criarContaVendedor,
    criarContaComoDono,
    trocarMinhaSenha,
    atualizarMeuPerfil,
    trocarMeuUsuario,
    redefinirSenha,
    atualizarVinculo,
    salvarTelas,
    alternarAtivo,
    excluirUsuario,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
