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
import { lsGravar, lsLer, lsRemover } from './local'
import { definirVisualizacao } from './visualizacao'
import { gerarHashSenha, senhaConfere } from './senha'
import { clienteNuvem, emNuvem } from './supabase'
import { type TelasAcesso, type Usuario, type Vendedor } from './types'
import { emailInterno, normalizarUsuario, validarSenha, validarUsuario } from './usuario'
import { useStore } from './store'

/* as regras do nome de usuário ficam em lib/usuario.ts; continuam saindo daqui
   para não quebrar quem já importa deste módulo */
export { emailInterno, normalizarUsuario, validarUsuario } from './usuario'

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

const CHAVE_SESSAO = 'altoprints:sessao'
const CHAVE_TENTATIVAS = 'altoprints:tentativas'
/** marca usada só no modo de desenvolvimento (prévia): entra sozinho uma vez */
const CHAVE_ENTRADA_DEV = 'altoprints:entrada-automatica'
/** usuário da conta criada só na prévia (npm run dev) — nunca existe no sistema publicado */
const USUARIO_DEV = 'dev'
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
  /** o acesso em uso — no modo "ver como funcionário" é o acesso visualizado */
  usuario: Usuario | null
  /** o acesso de verdade (o proprietário, mesmo quando está visualizando) */
  usuarioReal: Usuario | null
  /** nome do vendedor vinculado à conta (para travar o campo vendedor nos pedidos) */
  vendedorNome: string
  carregando: boolean
  nuvem: boolean
  ehProprietario: boolean
  /** o proprietário está vendo o sistema com os olhos de alguém da equipe? */
  emVisualizacao: boolean
  /** abre o sistema como um acesso da equipe (só o proprietário pode) */
  visualizarComo: (usuarioId: string) => void
  /** volta para o acesso do proprietário */
  sairDaVisualizacao: () => void
  /** já existe alguma conta de proprietário no sistema? */
  temProprietario: boolean
  entrar: (usuario: string, senha: string, manter: boolean) => Promise<void>
  /**
   * Entra sem digitar senha: a pessoa tocou no próprio nome na tela de entrada.
   * Vale apenas para acesso de vendedor marcado como `sem_senha` — o
   * proprietário sempre precisa da senha.
   */
  entrarSemSenha: (usuarioId: string, manter?: boolean) => Promise<void>
  sair: () => Promise<void>
  criarContaProprietario: (dados: { nome: string; usuario: string; senha: string }) => Promise<void>
  criarContaVendedor: (dados: {
    nome: string
    usuario: string
    senha?: string
    vendedorId?: string
    /** sem senha: a pessoa entra tocando no próprio nome */
    semSenha?: boolean
  }) => Promise<void>
  /** cria a conta pelo painel do proprietário (Equipe → Nova conta) */
  criarContaComoDono: (dados: {
    nome: string
    usuario: string
    senha?: string
    vendedorId?: string
    administrador?: boolean
    /** sem senha (só para vendedor): a pessoa entra tocando no próprio nome */
    semSenha?: boolean
  }) => Promise<void>
  trocarMinhaSenha: (senhaAtual: string, nova: string) => Promise<void>
  atualizarMeuPerfil: (dados: { nome: string }) => Promise<void>
  /** troca o próprio nome de usuário (login) — no modo nuvem fica bloqueado */
  trocarMeuUsuario: (novoUsuario: string) => Promise<void>
  redefinirSenha: (usuarioId: string, novaSenha: string) => Promise<void>
  /** tira a senha de um acesso de vendedor: ele volta a entrar pelo nome */
  removerSenha: (usuarioId: string) => Promise<void>
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
  const usuarioReal = useMemo(() => usuarios.find((u) => u.id === usuarioId) ?? null, [usuarioId, usuarios])
  /** id do acesso que está sendo "espionado" no modo ver-como-funcionário */
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null)

  const visualizado = useMemo(
    () => (visualizandoId ? usuarios.find((u) => u.id === visualizandoId) ?? null : null),
    [usuarios, visualizandoId],
  )
  // só o proprietário de verdade pode entrar no modo, e nunca em cima de outro proprietário
  const emVisualizacao = Boolean(
    visualizado && usuarioReal?.papel === 'proprietario' && visualizado.papel !== 'proprietario' && visualizado.ativo,
  )
  const usuario = emVisualizacao ? visualizado : usuarioReal
  const temProprietario = useMemo(() => usuarios.some((u) => u.papel === 'proprietario'), [usuarios])

  // a camada de dados usa esta marca para não salvar nada no modo visualização
  useEffect(() => {
    definirVisualizacao(emVisualizacao ? visualizado?.id ?? null : null)
    return () => definirVisualizacao(null)
  }, [emVisualizacao, visualizado?.id])

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
          else lsRemover(CHAVE_SESSAO)
        } else if (import.meta.env.DEV && lsLer(CHAVE_ENTRADA_DEV) !== '1') {
          // SÓ NA PRÉVIA (npm run dev): abre a sessão sozinho uma única vez, para
          // não precisar digitar senha a cada reinício do Vite.
          // A versão publicada NUNCA faz isso (import.meta.env.DEV vira false no
          // build) e não existe senha padrão no sistema: a conta de
          // desenvolvimento é criada com uma senha aleatória impossível de
          // digitar — a entrada acontece pela sessão, não pela senha.
          lsGravar(CHAVE_ENTRADA_DEV, '1')
          // o StrictMode roda este efeito duas vezes: confere no banco antes de criar
          const noBanco = await lerUsuarios()
          let dev = noBanco.find((u) => u.usuario === USUARIO_DEV && u.ativo)
          if (!dev && !noBanco.some((u) => u.papel === 'proprietario')) {
            const conta: Usuario = {
              id: novoId(),
              nome: 'Desenvolvimento',
              usuario: USUARIO_DEV,
              senha_hash: await gerarHashSenha(novoId()),
              papel: 'proprietario',
              vendedor_id: '',
              ativo: true,
              criado_em: new Date().toISOString(),
            }
            try {
              await salvarRegistro('usuarios', conta)
              await recarregar()
              dev = conta
            } catch (e) {
              console.warn('[altoprints] não foi possível criar o acesso de desenvolvimento:', (e as Error).message)
            }
          }
          if (dev) {
            lsGravar(
              CHAVE_SESSAO,
              JSON.stringify({
                usuario_id: dev.id,
                expira_em: new Date(Date.now() + 30 * 86400000).toISOString(),
                conectado: true,
              }),
            )
            console.info(`[altoprints] prévia: sessão de desenvolvimento aberta como "${dev.usuario}".`)
            setUsuarioId(dev.id)
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
    // se o navegador não deixar guardar (anônima / sem espaço), a sessão vale só enquanto a aba estiver aberta
    lsGravar(CHAVE_SESSAO, JSON.stringify({ usuario_id: id, expira_em: expira, conectado: manter }))
  }

  /**
   * Entrada pelo nome (sem senha). Só funciona para acesso de VENDEDOR marcado
   * como `sem_senha` e ativo — proprietário nunca entra por aqui.
   */
  const entrarSemSenha = useCallback(
    async (usuarioId: string, manter = true) => {
      const noBanco = await lerUsuarios()
      const lista = noBanco.length ? noBanco : usuarios
      const conta = lista.find((u) => u.id === usuarioId)
      if (!conta) throw new Error('Este acesso não existe mais. Fale com o proprietário.')
      if (!conta.ativo) throw new Error('Este acesso está desativado. Fale com o proprietário.')
      if (conta.papel === 'proprietario' || !conta.sem_senha)
        throw new Error('Este acesso pede senha. Use "Entrar com usuário e senha".')
      setVisualizandoId(null)
      definirVisualizacao(null)
      setUsuarioId(conta.id)
      guardarSessao(conta.id, manter)
    },
    [usuarios],
  )

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

      // acesso de funcionário sem senha: entra tocando no nome, não digitando
      if (conta.sem_senha)
        throw new Error('Este acesso entra sem senha: toque no seu nome na tela de entrada.')

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
      setVisualizandoId(null)
      definirVisualizacao(null)
      setUsuarioId(conta.id)
      guardarSessao(conta.id, manter)
    },
    [usuarios],
  )

  const sair = useCallback(async () => {
    const sb = clienteNuvem()
    if (sb) await sb.auth.signOut()
    lsRemover(CHAVE_SESSAO)
    setVisualizandoId(null)
    definirVisualizacao(null)
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
    dados: { nome: string; usuario: string; senha?: string; vendedorId?: string; semSenha?: boolean },
    papel: 'proprietario' | 'vendedor',
  ): Promise<Usuario> => {
    const erro = validarUsuario(dados.usuario)
    if (erro) throw new Error(erro)
    // o proprietário sempre usa senha; o funcionário pode entrar só pelo nome
    const semSenha = papel === 'vendedor' && Boolean(dados.semSenha)
    const senha = dados.senha ?? ''
    if (semSenha) {
      if (senha) throw new Error('Para entrar sem senha, deixe o campo de senha vazio.')
    } else {
      const erroSenha = validarSenha(senha)
      if (erroSenha) throw new Error(erroSenha)
    }
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
      // sem senha: o hash fica vazio e a entrada é pelo nome (nunca para o dono)
      senha_hash: semSenha ? '' : await gerarHashSenha(senha),
      sem_senha: semSenha,
      papel,
      vendedor_id: idVendedor,
      ativo: true,
      criado_em: new Date().toISOString(),
    }
  }

  const criarContaVendedor: AuthContexto['criarContaVendedor'] = async ({
    nome,
    usuario,
    senha,
    vendedorId,
    semSenha,
  }) => {
    const conta = await prepararConta({ nome, usuario, senha, vendedorId, semSenha }, 'vendedor')

    const sb = clienteNuvem()
    // sem senha não há o que registrar no Supabase Auth
    if (sb && !conta.sem_senha) {
      const { error } = await sb.auth.signUp({ email: emailInterno(conta.usuario), password: senha ?? '' })
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
    semSenha,
  }) => {
    if (administrador && semSenha)
      throw new Error('O acesso de proprietário precisa de senha (ele vê tudo, inclusive valores).')
    const conta = await prepararConta(
      { nome, usuario, senha, vendedorId, semSenha },
      administrador ? 'proprietario' : 'vendedor',
    )
    await salvarRegistro('usuarios', conta)
    await recarregar()
    avisar(
      conta.sem_senha
        ? `Acesso de ${conta.nome} criado: entra tocando no próprio nome (sem senha).`
        : `Acesso de ${conta.nome} criado. Usuário: ${conta.usuario}.`,
    )
  }

  /* ------------------------------ perfil ------------------------------ */

  const trocarMinhaSenha: AuthContexto['trocarMinhaSenha'] = async (senhaAtual, nova) => {
    if (!usuario) throw new Error('Sessão expirada.')
    if (nova.length < 4) throw new Error('A nova senha precisa ter pelo menos 4 caracteres.')
    const noBanco = await lerUsuarios()
    const alvo = noBanco.find((u) => u.id === usuario.id) ?? usuario
    // no modo local (ou quando a validação for local) confere a senha atual
    if (!(await senhaConfere(senhaAtual, alvo.senha_hash))) throw new Error('A senha atual não confere.')

    // quem definiu uma senha passa a entrar por ela (sai da entrada só pelo nome)
    const atualizado: Usuario = { ...alvo, senha_hash: await gerarHashSenha(nova), sem_senha: false }
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
    const erroSenha = validarSenha(novaSenha)
    if (erroSenha) throw new Error(erroSenha)
    // definir uma senha tira a conta da entrada "só pelo nome"
    await salvarRegistro('usuarios', { ...alvo, senha_hash: await gerarHashSenha(novaSenha), sem_senha: false })
    await recarregar()
    avisar(`Senha de ${alvo.nome} redefinida. Agora essa conta entra com usuário e senha.`)
  }

  /**
   * Tira a senha de um acesso de vendedor: a pessoa volta a entrar tocando no
   * próprio nome. Não vale para o proprietário (ele vê tudo, inclusive valores).
   */
  const removerSenha: AuthContexto['removerSenha'] = async (usuarioId) => {
    const noBanco = await lerUsuarios()
    const alvo = (noBanco.length ? noBanco : usuarios).find((u) => u.id === usuarioId)
    if (!alvo) throw new Error('Conta não encontrada.')
    if (alvo.papel === 'proprietario')
      throw new Error('O acesso de proprietário não pode ficar sem senha.')
    await salvarRegistro('usuarios', { ...alvo, senha_hash: '', sem_senha: true })
    await recarregar()
    avisar(`${alvo.nome} agora entra sem senha (tocando no próprio nome).`, 'info')
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

  /**
   * Exclui uma conta de acesso.
   * Regras: ninguém exclui o próprio acesso e o sistema nunca fica sem
   * proprietário ativo — mas, havendo mais de um, os extras podem ser apagados
   * (ex.: um acesso de dono criado por engano, ou alguém que deixou a sociedade).
   */
  const excluirUsuario: AuthContexto['excluirUsuario'] = async (usuarioId) => {
    if (usuarioId === usuarioReal?.id) throw new Error('Você não pode excluir o seu próprio acesso.')
    const noBanco = await lerUsuarios()
    const lista = noBanco.length ? noBanco : usuarios
    const alvo = lista.find((u) => u.id === usuarioId)
    if (!alvo) return
    if (alvo.papel === 'proprietario') {
      const outrosDonos = lista.filter((u) => u.papel === 'proprietario' && u.ativo && u.id !== alvo.id)
      if (!outrosDonos.length)
        throw new Error(
          'Este é o único proprietário ativo do sistema: crie (ou libere) outro acesso de proprietário antes de excluí-lo.',
        )
    }
    await removerRegistro('usuarios', usuarioId)
    await recarregar()
    avisar(`Acesso de ${alvo.nome} excluído.`, 'info')
  }

  const vendedorNome = useMemo(() => {
    if (!usuario) return ''
    if (usuario.papel === 'proprietario') return 'Proprietário'
    return db.vendedores.find((v) => v.id === usuario.vendedor_id)?.nome ?? usuario.nome
  }, [db.vendedores, usuario])

  const visualizarComo = useCallback(
    (id: string) => {
      if (usuarioReal?.papel !== 'proprietario') {
        avisar('Só o proprietário pode ver o sistema como outra pessoa.', 'erro')
        return
      }
      const alvo = usuarios.find((u) => u.id === id)
      if (!alvo || alvo.papel === 'proprietario') {
        avisar('Escolha um acesso de vendedor para visualizar.', 'erro')
        return
      }
      setVisualizandoId(id)
      avisar(`Agora você está vendo o sistema como ${alvo.nome}. Nada será salvo neste modo.`, 'info')
    },
    [avisar, usuarioReal?.papel, usuarios],
  )

  const sairDaVisualizacao = useCallback(() => {
    setVisualizandoId(null)
    definirVisualizacao(null)
    avisar('De volta ao seu acesso de proprietário.', 'info')
  }, [avisar])

  const valor: AuthContexto = {
    usuario,
    usuarioReal,
    emVisualizacao,
    visualizarComo,
    sairDaVisualizacao,
    vendedorNome,
    carregando: carregando || carregandoDados,
    nuvem: emNuvem(),
    ehProprietario: usuario?.papel === 'proprietario',
    temProprietario,
    entrar,
    entrarSemSenha,
    sair,
    criarContaProprietario,
    criarContaVendedor,
    criarContaComoDono,
    trocarMinhaSenha,
    atualizarMeuPerfil,
    trocarMeuUsuario,
    redefinirSenha,
    removerSenha,
    atualizarVinculo,
    salvarTelas,
    alternarAtivo,
    excluirUsuario,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
