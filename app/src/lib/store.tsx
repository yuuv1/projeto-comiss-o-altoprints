import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  carregarTudo,
  limparTudo,
  removerArquivosDoPedido,
  removerRegistro,
  salvarConfiguracoes,
  salvarRegistro,
  salvarVarios,
  substituirTudo,
} from './backend'
import { apagarVariosArquivos, enviarArquivo, novoId } from './files'
import {
  clienteNuvem,
  conectar as conectarSupabase,
  conexaoRecebidaAgora,
  desconectar as desconectarSupabase,
  emNuvem,
  limparAvisoDeConexao,
  nuvemObrigatoria,
} from './supabase'
import { calcularValor, proximoNumero } from './pricing'
import { gerarDadosDemo } from './seed'
import { prepararBackup } from './backup'
import { prepararMesclaRelatorioCSV, type MesclaRelatorio } from './relatorio-backup'
import {
  espacoNoLocalStorage,
  liberarCopiaAntiga,
  ondeEstaGuardado,
  testarArmazenamento,
  type DiagnosticoArmazenamento,
  type OndeEstaGuardado,
} from './armazenamento'
import { limparChavesDoSistema, lsGravar, lsLer, lsRemover } from './local'
import { CHAVE_EQUIPE_INICIAL, vendedoresDaEquipeInicial } from './equipe-inicial'
import {
  CONFIG_PADRAO,
  type Arquivo,
  type Cliente,
  type Configuracoes,
  type DB,
  type ID,
  type Impressao,
  type Pedido,
  type Usuario,
  type Vendedor,
} from './types'

export interface Toast {
  id: number
  texto: string
  tipo: 'sucesso' | 'erro' | 'info'
}

interface Ctx {
  db: DB
  carregando: boolean
  erro: string | null
  nuvem: boolean
  ultimaSincronizacao: string | null
  erroSincronizacao: string | null
  realtimeAtivo: boolean
  limparErro: () => void
  /** relê o banco; `silencioso` evita a tela de "Carregando" nas sincronizações automáticas */
  recarregar: (silencioso?: boolean) => Promise<DB>
  /* toasts */
  toasts: Toast[]
  avisar: (texto: string, tipo?: Toast['tipo']) => void
  fecharToast: (id: number) => void
  /* vendedores */
  salvarVendedor: (dados: { nome: string }, id?: ID) => Promise<void>
  excluirVendedor: (id: ID) => Promise<void>
  /* clientes */
  salvarCliente: (dados: Omit<Cliente, 'id' | 'created_at'>, id?: ID) => Promise<void>
  excluirCliente: (id: ID) => Promise<void>
  /* pedidos */
  salvarPedido: (dados: Omit<Pedido, 'id'>, id: ID | undefined, arquivosNovos: File[]) => Promise<Pedido>
  atualizarPedido: (id: ID, patch: Partial<Pedido>) => Promise<void>
  excluirPedido: (id: ID) => Promise<void>
  /* arquivos */
  enviarArquivos: (pedidoId: ID, arquivos: File[]) => Promise<void>
  excluirArquivoDoPedido: (arquivo: Arquivo) => Promise<void>
  /* configurações */
  salvarConfig: (parcial: Partial<Configuracoes>) => Promise<void>
  /** apaga tudo; com `manterContaId`, o acesso do proprietário atual é preservado */
  resetarDados: (manterContaId?: string) => Promise<void>
  carregarDemo: () => Promise<void>
  /** conecta o sistema ao banco na nuvem (Supabase) neste aparelho */
  conectarNuvem: (url: string, chave: string) => Promise<void>
  /** desconexão disponível somente no ambiente de desenvolvimento */
  desconectarNuvem: () => void
  /** envia os dados deste aparelho para a nuvem (usado logo depois de conectar) */
  enviarDadosParaNuvem: () => Promise<void>
  /** baixa um arquivo .json com todo o banco */
  baixarBackup: () => void
  /** restaura um backup JSON completo (substitui tudo) */
  restaurarBackup: (arquivo: File) => Promise<void>
  /** importa os pedidos do CSV de relatório sem apagar nem sobrescrever os atuais */
  mesclarRelatorioCSV: (conteudo: string) => Promise<MesclaRelatorio>
  /* utilidades */
  vendedorPorId: (id: ID | '' | null | undefined) => Vendedor | undefined
  nomeVendedor: (id: ID | '' | null | undefined) => string
  proximoNumeroPedido: number
  pedidoPorId: (id: ID | undefined) => Pedido | undefined
  /* espaço no aparelho (Configurações → Dados e tela de login) */
  /** testa o armazenamento deste navegador e diz onde os dados estão guardados */
  medirEspaco: () => Promise<DiagnosticoArmazenamento>
  /** tira do localStorage a cópia antiga do banco (libera o espaço pequeno) */
  liberarEspaco: () => Promise<number>
  /**
   * Socorro para navegador sem espaço nenhum: baixa um backup e limpa só os
   * dados do sistema neste aparelho, para o sistema voltar a funcionar.
   */
  comecarLimpoNesteAparelho: () => Promise<void>
}

const StoreContext = createContext<Ctx | null>(null)

const dbVazio = (): DB => ({
  vendedores: [],
  clientes: [],
  pedidos: [],
  arquivos: [],
  impressoes: [],
  usuarios: [],
  configuracoes: { ...CONFIG_PADRAO },
})

/**
 * Marca de versões antigas, que semeavam dados de exemplo sozinhas no primeiro
 * acesso. Hoje o sistema **sempre** começa vazio; a chave só é apagada de
 * aparelhos que já tinham o sistema instalado, para não sobrar lixo.
 */
const CHAVE_DEMO_ANTIGA = 'altoprints:demo-inicial-carregada'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(dbVazio())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string | null>(null)
  const [erroSincronizacao, setErroSincronizacao] = useState<string | null>(null)
  const [realtimeAtivo, setRealtimeAtivo] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [nuvem, setNuvem] = useState(emNuvem())
  const contadorToast = useRef(0)

  const avisar = useCallback((texto: string, tipo: Toast['tipo'] = 'sucesso') => {
    contadorToast.current += 1
    const id = contadorToast.current
    setToasts((t) => [...t, { id, texto, tipo }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  /* No modo "ver como funcionário" toda gravação é bloqueada: aqui a pessoa
     recebe o aviso na tela em vez de o botão simplesmente não fazer nada. */
  const recarregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    try {
      const dados = await carregarTudo()
      setDb(dados)
      setErro(null)
      if (emNuvem()) {
        setUltimaSincronizacao(new Date().toISOString())
        setErroSincronizacao(null)
      }
      return dados
    } catch (e) {
      const mensagem = (e as Error).message
      setErro(mensagem)
      if (emNuvem()) setErroSincronizacao(mensagem)
      throw e
    } finally {
      if (!silencioso) setCarregando(false)
    }
  }, [])

  /**
   * Cadastra os FUNCIONÁRIOS da equipe inicial (JESSICA, RAISSA, ANDREIA — lista
   * em `lib/equipe-inicial.ts`) na primeira abertura. Não existe conta nem senha
   * de funcionário: são só nomes na lista que aparece ao registrar uma fila.
   *
   * O acesso do PROPRIETÁRIO nunca vem pronto — ele é criado no primeiro
   * “Login proprietário” e exige senha.
   */
  const criarEquipeInicial = useCallback(
    async (dados: DB): Promise<DB> => {
      if (dados.configuracoes.modo_exemplo || lsLer(CHAVE_EQUIPE_INICIAL) === '1') return dados
      const vendedores = vendedoresDaEquipeInicial(dados)
      if (!vendedores.length) {
        lsGravar(CHAVE_EQUIPE_INICIAL, '1')
        return dados
      }
      try {
        await salvarVarios('vendedores', vendedores)
        // só marca depois de gravado: se o banco ainda não tiver a coluna nova,
        // tenta de novo na próxima abertura em vez de desistir para sempre
        lsGravar(CHAVE_EQUIPE_INICIAL, '1')
        avisar(`Funcionários prontos: ${vendedores.map((v) => v.nome).join(', ')}.`, 'info')
        return {
          ...dados,
          vendedores: [...dados.vendedores, ...vendedores].sort((a, b) => a.nome.localeCompare(b.nome)),
        }
      } catch (e) {
        console.warn('[altoprints] não foi possível cadastrar os funcionários da equipe:', (e as Error).message)
        return dados
      }
    },
    [avisar],
  )

  /*
   * SINCRONIA DA NUVEM — Realtime atualiza assim que outra máquina grava.
   * A checagem a cada 15 s continua como reserva; ao voltar para o app também
   * buscamos de novo. O estado de cada etapa fica visível em Configurações → Nuvem.
   */
  useEffect(() => {
    if (!nuvem || !emNuvem()) return
    let ativo = true
    const atualizar = async () => {
      if (!ativo || document.visibilityState === 'hidden') return
      try {
        await recarregar(true)
      } catch {
        // A tela mantém os dados locais e mostra o erro; tenta novamente no ciclo seguinte.
      }
    }
    const relogio = window.setInterval(atualizar, 15000)
    const aoVoltar = () => void atualizar()
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('focus', aoVoltar)
    return () => {
      ativo = false
      window.clearInterval(relogio)
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
    }
  }, [recarregar, nuvem])

  // Eventos em tempo real entre aparelhos; se o Supabase não os disponibilizar,
  // a leitura periódica acima continua garantindo a atualização eventual.
  useEffect(() => {
    const sb = nuvem ? clienteNuvem() : null
    if (!sb) {
      setRealtimeAtivo(false)
      return
    }

    let ativo = true
    let agendado: number | undefined
    setRealtimeAtivo(false)
    const recarregarDebounced = () => {
      if (agendado) window.clearTimeout(agendado)
      agendado = window.setTimeout(() => {
        agendado = undefined
        if (ativo && document.visibilityState !== 'hidden') void recarregar(true).catch(() => {})
      }, 300)
    }
    const channel = sb.channel('altoprints-sincronizacao')
    const tabelas = ['pedidos', 'clientes', 'vendedores', 'arquivos', 'impressoes', 'usuarios', 'configuracoes'] as const
    for (const tabela of tabelas) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, recarregarDebounced)
    }
    channel.subscribe((status) => {
      if (!ativo) return
      const conectado = status === 'SUBSCRIBED'
      setRealtimeAtivo(conectado)
      if (conectado) recarregarDebounced()
    })

    return () => {
      ativo = false
      if (agendado) window.clearTimeout(agendado)
      void sb.removeChannel(channel)
    }
  }, [nuvem, recarregar])

  const fecharToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const conectarNuvem = useCallback(
    async (url: string, chave: string) => {
      conectarSupabase({ url, chave })
      setNuvem(true)
      lsRemover(CHAVE_EQUIPE_INICIAL)
      const dados = await recarregar()
      setDb(await criarEquipeInicial(dados))
      avisar('Banco na nuvem conectado! Os dados agora são iguais em todos os aparelhos.')
    },
    [avisar, criarEquipeInicial, recarregar],
  )

  const desconectarNuvem = useCallback(() => {
    desconectarSupabase()
    setNuvem(false)
    setUltimaSincronizacao(null)
    setErroSincronizacao(null)
    setRealtimeAtivo(false)
    avisar('Conexão removida no ambiente de desenvolvimento.', 'info')
  }, [avisar])

  const enviarDadosParaNuvem = useCallback(async () => {
    const sb = clienteNuvem()
    if (!sb) throw new Error('A nuvem não está conectada.')
    await substituirTudo(db)
    await recarregar()
    avisar('Os dados deste aparelho foram enviados para a nuvem.')
  }, [avisar, db, recarregar])

  // avisa quando o aparelho acabou de ser conectado por um link da equipe
  useEffect(() => {
    if (!conexaoRecebidaAgora()) return
    limparAvisoDeConexao()
    avisar('Este aparelho foi conectado ao banco da empresa!')
  }, [avisar])

  // primeira carga
  useEffect(() => {
    ;(async () => {
      try {
        const dados = await carregarTudo()
        // O sistema começa SEMPRE sem pedidos, clientes ou impressões: nenhum
        // dado de exemplo é semeado aqui. Quem quiser exemplos para treinar pede
        // em Configurações → Dados. Só os acessos da equipe são criados (acima).
        lsRemover(CHAVE_DEMO_ANTIGA)
        setDb(await criarEquipeInicial(dados))
        if (emNuvem()) {
          setUltimaSincronizacao(new Date().toISOString())
          setErroSincronizacao(null)
        }
        // Migração/limpeza do banco antigo só existe em desenvolvimento. No site
        // oficial, dados legados do navegador ficam intocados e nunca são usados.
        if (!nuvemObrigatoria) {
          try {
            const liberado = await liberarCopiaAntiga(JSON.stringify(dados))
            if (liberado > 0) console.info(`[altoprints] ${Math.round(liberado / 1024)} KB liberados no navegador.`)
          } catch {
            /* sem problema: o sistema segue funcionando com o que tem */
          }
        }
        setErro(null)
      } catch (e) {
        const mensagem = (e as Error).message
        setErro(mensagem)
        if (emNuvem()) setErroSincronizacao(mensagem)
      } finally {
        setCarregando(false)
      }
    })()
  }, [])

  /* ----------------------------- vendedores ----------------------------- */

  const salvarVendedor = useCallback(
    async (dados: { nome: string }, id?: ID) => {
      const nome = dados.nome.trim()
      if (!nome) throw new Error('Informe o nome do vendedor.')
      const existente = id ? db.vendedores.find((v) => v.id === id) : undefined
      const registro: Vendedor = {
        id: id ?? novoId(),
        nome,
        created_at: existente?.created_at ?? new Date().toISOString(),
      }
      await salvarRegistro('vendedores', registro)
      setDb((atual) => ({
        ...atual,
        vendedores: existente
          ? atual.vendedores.map((v) => (v.id === registro.id ? registro : v))
          : [...atual.vendedores, registro].sort((a, b) => a.nome.localeCompare(b.nome)),
      }))
      avisar(existente ? 'Vendedor atualizado com sucesso!' : 'Vendedor cadastrado com sucesso!')
    },
    [avisar, db.vendedores],
  )

  const excluirVendedor = useCallback(
    async (id: ID) => {
      await removerRegistro('vendedores', id)
      setDb((atual) => ({ ...atual, vendedores: atual.vendedores.filter((v) => v.id !== id) }))
      avisar('Vendedor excluído.', 'info')
    },
    [avisar],
  )

  /* ------------------------------ clientes ------------------------------ */

  const salvarCliente = useCallback(
    async (dados: Omit<Cliente, 'id' | 'created_at'>, id?: ID) => {
      if (!dados.nome.trim()) throw new Error('O nome do cliente é obrigatório.')
      if (!dados.vendedor_id) throw new Error('Escolha o vendedor responsável.')
      const existente = id ? db.clientes.find((c) => c.id === id) : undefined
      const registro: Cliente = {
        ...dados,
        nome: dados.nome.trim(),
        id: id ?? novoId(),
        created_at: existente?.created_at ?? new Date().toISOString(),
      }
      await salvarRegistro('clientes', registro)
      setDb((atual) => ({
        ...atual,
        clientes: existente
          ? atual.clientes.map((c) => (c.id === registro.id ? registro : c))
          : [...atual.clientes, registro].sort((a, b) => a.nome.localeCompare(b.nome)),
      }))
      avisar(existente ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!')
    },
    [avisar, db.clientes],
  )

  const excluirCliente = useCallback(
    async (id: ID) => {
      await removerRegistro('clientes', id)
      setDb((atual) => ({ ...atual, clientes: atual.clientes.filter((c) => c.id !== id) }))
      avisar('Cliente excluído.', 'info')
    },
    [avisar],
  )

  /* ------------------------------- pedidos ------------------------------ */

  const enviarArquivos = useCallback(
    async (pedidoId: ID, arquivos: File[]) => {
      if (!arquivos.length) return
      const registros: Arquivo[] = []
      for (const f of arquivos) registros.push(await enviarArquivo(pedidoId, f))
      await salvarVarios('arquivos', registros)
      setDb((atual) => ({ ...atual, arquivos: [...registros, ...atual.arquivos] }))
    },
    [],
  )

  const salvarPedido = useCallback(
    async (dados: Omit<Pedido, 'id'>, id: ID | undefined, arquivosNovos: File[]) => {
      if (!dados.cliente_nome.trim()) throw new Error('Informe o nome do cliente.')
      if (!dados.vendedor_id) throw new Error('Escolha o vendedor responsável.')

      const existente = id ? db.pedidos.find((p) => p.id === id) : undefined
      const agora = new Date().toISOString()
      const nomeCliente = dados.cliente_nome.trim()

      /*
       * O vendedor pode escolher um cliente que já existe ou escrever um nome
       * novo: nesse caso o cliente é cadastrado junto com a fila.
       */
      let clienteVinculado = db.clientes.find((c) => c.nome.toLowerCase() === nomeCliente.toLowerCase())
      if (!clienteVinculado) {
        clienteVinculado = {
          id: novoId(),
          nome: nomeCliente,
          telefone: '',
          email: '',
          observacoes: '',
          vendedor_id: dados.vendedor_id,
          valor_especial_metro: null,
          especial: false,
          created_at: agora,
        }
        await salvarRegistro('clientes', clienteVinculado)
      }
      const clienteCriado = !db.clientes.some((c) => c.id === clienteVinculado?.id)
      const valorEspecial = clienteVinculado?.valor_especial_metro ?? null

      const valor =
        dados.valor_modo === 'auto'
          ? calcularValor(dados.metragem, valorEspecial, db.configuracoes.faixas_preco)
          : Number(Number(dados.valor || 0).toFixed(2))

      const registro: Pedido = {
        ...dados,
        cliente_nome: dados.cliente_nome.trim(),
        cliente_id: clienteVinculado?.id ?? existente?.cliente_id ?? null,
        valor,
        id: id ?? novoId(),
        numero: existente?.numero ?? proximoNumero(db.pedidos.map((p) => p.numero)),
        created_at: existente?.created_at ?? agora,
        updated_at: agora,
      }

      await salvarRegistro('pedidos', registro)
      if (arquivosNovos.length) await enviarArquivos(registro.id, arquivosNovos)

      setDb((atual) => {
        const pedidos = existente
          ? atual.pedidos.map((p) => (p.id === registro.id ? registro : p))
          : [registro, ...atual.pedidos]
        const clientes = clienteCriado && clienteVinculado ? [...atual.clientes, clienteVinculado] : atual.clientes
        return { ...atual, pedidos, clientes }
      })

      avisar(
        clienteCriado
          ? `Fila #${registro.numero} registrada e cliente ${nomeCliente} cadastrado!`
          : existente
            ? `Fila #${registro.numero} atualizada com sucesso!`
            : `Fila #${registro.numero} registrada com sucesso!`,
      )
      return registro
    },
    [avisar, db.clientes, db.configuracoes.faixas_preco, db.pedidos, enviarArquivos],
  )

  const atualizarPedido = useCallback(
    async (id: ID, patch: Partial<Pedido>) => {
      const atual = db.pedidos.find((p) => p.id === id)
      if (!atual) return
      const registro: Pedido = { ...atual, ...patch, updated_at: new Date().toISOString() }
      await salvarRegistro('pedidos', registro)
      setDb((d) => ({ ...d, pedidos: d.pedidos.map((p) => (p.id === id ? registro : p)) }))
    },
    [db.pedidos],
  )

  const excluirPedido = useCallback(
    async (id: ID) => {
      const arquivos = db.arquivos.filter((a) => a.pedido_id === id)
      await apagarVariosArquivos(arquivos)
      await removerArquivosDoPedido(id)
      await removerRegistro('pedidos', id)
      setDb((atual) => ({
        ...atual,
        pedidos: atual.pedidos.filter((p) => p.id !== id),
        arquivos: atual.arquivos.filter((a) => a.pedido_id !== id),
        impressoes: atual.impressoes.filter((i) => i.pedido_id !== id),
      }))
      avisar('Pedido excluído.', 'info')
    },
    [avisar, db.arquivos, db.impressoes],
  )

  const excluirArquivoDoPedido = useCallback(
    async (arquivo: Arquivo) => {
      await apagarVariosArquivos([arquivo])
      await removerRegistro('arquivos', arquivo.id)
      setDb((atual) => ({ ...atual, arquivos: atual.arquivos.filter((a) => a.id !== arquivo.id) }))
      avisar('Arquivo excluído.', 'info')
    },
    [avisar],
  )

  /* ---------------------------- configurações --------------------------- */

  const salvarConfig = useCallback(
    async (parcial: Partial<Configuracoes>) => {
      await salvarConfiguracoes(parcial)
      setDb((atual) => ({ ...atual, configuracoes: { ...atual.configuracoes, ...parcial } }))
    },
    [],
  )

  const resetarDados = useCallback(
    async (manterContaId?: string) => {
      // guarda o acesso de quem está apagando: sem isso, o proprietário perderia
      // a própria conta e não conseguiria nem entrar no sistema de novo
      const contaMantida = manterContaId ? db.usuarios.find((u) => u.id === manterContaId) : undefined
      await limparTudo()
      if (contaMantida) await salvarRegistro('usuarios', contaMantida)
      const vazio = { ...dbVazio(), usuarios: contaMantida ? [contaMantida] : [] }
      lsRemover(CHAVE_DEMO_ANTIGA)
      lsRemover(CHAVE_EQUIPE_INICIAL)
      setDb(await criarEquipeInicial(vazio))
      avisar(
        contaMantida
          ? 'Todos os dados foram apagados (o seu acesso de proprietário e os nomes da equipe foram mantidos).'
          : 'Todos os dados foram apagados.',
        'info',
      )
    },
    [avisar, criarEquipeInicial, db.usuarios],
  )

  /** baixa um arquivo com todo o banco (o plano grátis do Supabase não tem backup) */
  const baixarBackup = useCallback(() => {
    const conteudo = JSON.stringify(db, null, 2)
    const arquivo = new Blob([conteudo], { type: 'application/json' })
    const endereco = URL.createObjectURL(arquivo)
    const link = document.createElement('a')
    link.href = endereco
    link.download = `altoprints-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(endereco)
    avisar('Backup baixado. Guarde o arquivo em um lugar seguro.')
  }, [avisar, db])

  /**
   * Restaura um backup (substitui tudo o que está no sistema).
   *
   * Aceita o arquivo que o próprio sistema baixa e também backups de versões
   * antigas, inclusive os que vêm embrulhados (`{ versao, dados }`, `{ db }`).
   * Contas de FUNCIONÁRIO de versões antigas deixam de ser logins — hoje só o
   * proprietário tem login —, mas seus nomes/vínculos são recuperados para a
   * lista de funcionários se faltarem no backup. Se o arquivo não trouxer uma
   * conta de dono, os acessos existentes neste aparelho continuam valendo.
   */
  const restaurarBackup = useCallback(
    async (arquivo: File) => {
      const texto = await arquivo.text()
      let bruto: unknown
      try {
        bruto = JSON.parse(texto)
      } catch {
        throw new Error('Este arquivo não é um backup do sistema (não é um JSON válido).')
      }
      // O importador também reconstrói os nomes de funcionários a partir de
      // contas antigas, e converte status de pedidos das versões anteriores.
      const restaurado = prepararBackup(bruto, db.usuarios)

      await substituirTudo(restaurado)
      setDb(restaurado)
      const resumo = `${restaurado.pedidos.length} pedidos · ${restaurado.clientes.length} clientes · ${restaurado.vendedores.length} funcionários`
      avisar(
        emNuvem()
          ? `Backup restaurado (${resumo}) e enviado para a nuvem: todos os aparelhos passam a ver estes dados.`
          : `Backup restaurado (${resumo}). Com a nuvem conectada, ele também chega aos outros aparelhos.`,
      )
    },
    [avisar, db.usuarios],
  )

  /** Mescla somente pedidos que ainda não existem; nunca apaga o banco atual. */
  const mesclarRelatorioCSV = useCallback(async (conteudo: string) => {
    const atual = await recarregar(true)
    const resultado = prepararMesclaRelatorioCSV(conteudo, atual)
    if (!resultado.pedidosNovos.length) return resultado

    // Grava apenas IDs novos, em vez de substituir tabelas: um pedido lançado
    // no celular enquanto o relatório era preparado não será removido.
    await salvarVarios('vendedores', resultado.vendedoresNovos)
    await salvarVarios('clientes', resultado.clientesNovos)
    await salvarVarios('pedidos', resultado.pedidosNovos)

    setDb((banco) => {
      const idsVendedores = new Set(banco.vendedores.map((v) => v.id))
      const idsClientes = new Set(banco.clientes.map((c) => c.id))
      const numerosPedidos = new Set(banco.pedidos.map((p) => p.numero))
      return {
        ...banco,
        vendedores: [...banco.vendedores, ...resultado.vendedoresNovos.filter((v) => !idsVendedores.has(v.id))],
        clientes: [...banco.clientes, ...resultado.clientesNovos.filter((c) => !idsClientes.has(c.id))],
        pedidos: [...banco.pedidos, ...resultado.pedidosNovos.filter((p) => !numerosPedidos.has(p.numero))].sort(
          (a, b) => b.numero - a.numero,
        ),
      }
    })
    return resultado
  }, [recarregar])

  /**
   * Carrega os dados de EXEMPLO (fictícios) para treinar a equipe.
   * Nunca toca nos acessos de proprietário nem nas configurações do dono: assim ninguém
   * é trancado para fora do sistema e o logo/comissões continuam os mesmos.
   */
  const carregarDemo = useCallback(async () => {
    const exemplo = gerarDadosDemo()
    const demo: DB = {
      ...exemplo,
      usuarios: db.usuarios,
      configuracoes: {
        ...db.configuracoes,
        // avisa na tela que os pedidos abaixo não são reais
        modo_exemplo: true,
        revisao_ultima_em: new Date().toISOString(),
      },
    }
    await substituirTudo(demo)
    setDb(demo)
    avisar('Dados de exemplo (fictícios) carregados. Os seus acessos e configurações foram mantidos.')
  }, [avisar, db.configuracoes, db.usuarios])

  /* ------------------------- espaço no aparelho ------------------------- */

  const medirEspaco = useCallback(async () => {
    // A versão oficial não consulta o banco legado do navegador.
    if (nuvemObrigatoria)
      return { localOk: false, idbOk: false, onde: 'nenhum' as const, bytesLocal: 0, ocupantes: [] }
    // no armazenamento novo o que interessa é o tamanho dos dados; no antigo, o
    // total do navegador (que inclui tudo o que este site guardou)
    return testarArmazenamento()
  }, [])

  const liberarEspaco = useCallback(async () => {
    if (nuvemObrigatoria)
      throw new Error('O site oficial usa o banco online e não migra nem apaga dados operacionais antigos deste aparelho.')
    const liberado = await liberarCopiaAntiga(JSON.stringify(db))
    avisar(
      liberado
        ? `Espaço liberado neste aparelho (${Math.round(liberado / 1024)} KB). Os dados continuam salvos.`
        : 'Os dados deste aparelho já estão no armazenamento novo: não há o que liberar.',
      'info',
    )
    return liberado
  }, [avisar, db])

  const comecarLimpoNesteAparelho = useCallback(async () => {
    if (nuvemObrigatoria)
      throw new Error('A versão online não apaga dados operacionais salvos em versões antigas deste aparelho.')
    // 1) backup primeiro (a pessoa pode restaurar depois em Configurações → Dados)
    baixarBackup()
    // 2) limpa só as chaves do sistema neste aparelho — apagar sempre funciona,
    //    mesmo quando o navegador está sem espaço para gravar
    const liberado = limparChavesDoSistema()
    // 3) recarrega: sem dados, o sistema volta ao começo (com os exemplos)
    setTimeout(() => window.location.reload(), 600)
    avisar(
      liberado
        ? `Começando limpo: ${Math.round(liberado / 1024)} KB liberados. O backup foi baixado.`
        : 'Começando limpo neste aparelho. O backup foi baixado.',
    )
  }, [avisar, baixarBackup])

  /* ------------------------------ utilidades ---------------------------- */

  const vendedorPorId = useCallback(
    (id: ID | '' | null | undefined) => db.vendedores.find((v) => v.id === id),
    [db.vendedores],
  )
  const nomeVendedor = useCallback(
    (id: ID | '' | null | undefined) => vendedorPorId(id)?.nome ?? 'Sem vendedor',
    [vendedorPorId],
  )
  const pedidoPorId = useCallback((id: ID | undefined) => db.pedidos.find((p) => p.id === id), [db.pedidos])

  const valor: Ctx = useMemo(
    () => ({
      db,
      carregando,
      erro,
      nuvem,
      ultimaSincronizacao,
      erroSincronizacao,
      realtimeAtivo,
      limparErro: () => setErro(null),
      recarregar,
      toasts,
      avisar,
      fecharToast,
      salvarVendedor,
      excluirVendedor,
      salvarCliente,
      excluirCliente,
      salvarPedido,
      atualizarPedido,
      excluirPedido,
      enviarArquivos,
      excluirArquivoDoPedido,
      salvarConfig,
      resetarDados,
      carregarDemo,
      conectarNuvem,
      desconectarNuvem,
      enviarDadosParaNuvem,
      baixarBackup,
      restaurarBackup,
      mesclarRelatorioCSV,
      vendedorPorId,
      nomeVendedor,
      proximoNumeroPedido: proximoNumero(db.pedidos.map((p) => p.numero)),
      pedidoPorId,
      medirEspaco,
      liberarEspaco,
      comecarLimpoNesteAparelho,
    }),
    [
      db,
      carregando,
      erro,
      nuvem,
      ultimaSincronizacao,
      erroSincronizacao,
      realtimeAtivo,
      recarregar,
      toasts,
      avisar,
      fecharToast,
      salvarVendedor,
      excluirVendedor,
      salvarCliente,
      excluirCliente,
      salvarPedido,
      atualizarPedido,
      excluirPedido,
      enviarArquivos,
      excluirArquivoDoPedido,
      salvarConfig,
      resetarDados,
      carregarDemo,
      conectarNuvem,
      desconectarNuvem,
      enviarDadosParaNuvem,
      baixarBackup,
      restaurarBackup,
      mesclarRelatorioCSV,
      vendedorPorId,
      nomeVendedor,
      pedidoPorId,
      medirEspaco,
      liberarEspaco,
      comecarLimpoNesteAparelho,
    ],
  )

  return <StoreContext.Provider value={valor}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return ctx
}
