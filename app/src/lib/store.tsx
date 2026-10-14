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
} from './supabase'
import { calcularValor, proximoNumero } from './pricing'
import { bloquearSeVisualizando, registrarAvisoDeBloqueio } from './visualizacao'
import { gerarDadosDemo } from './seed'
import {
  espacoNoLocalStorage,
  liberarCopiaAntiga,
  ondeEstaGuardado,
  testarArmazenamento,
  type DiagnosticoArmazenamento,
  type OndeEstaGuardado,
} from './armazenamento'
import { limparChavesDoSistema, lsGravar, lsLer, lsRemover } from './local'
import { CHAVE_EQUIPE_INICIAL, registrosEquipeInicial } from './equipe-inicial'
import {
  CONFIG_PADRAO,
  type Arquivo,
  type Cliente,
  type Configuracoes,
  type DB,
  type ID,
  type Impressao,
  type Pedido,
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
  limparErro: () => void
  recarregar: () => Promise<DB>
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
  /** sai da nuvem neste aparelho (volta ao modo local) */
  desconectarNuvem: () => void
  /** envia os dados deste aparelho para a nuvem (usado logo depois de conectar) */
  enviarDadosParaNuvem: () => Promise<void>
  /** baixa um arquivo .json com todo o banco */
  baixarBackup: () => void
  /** restaura um backup baixado antes (substitui tudo) */
  restaurarBackup: (arquivo: File) => Promise<void>
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
  useEffect(() => {
    registrarAvisoDeBloqueio((texto) => avisar(texto, 'erro'))
    return () => registrarAvisoDeBloqueio(null)
  }, [avisar])

  const fecharToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await carregarTudo()
      setDb(dados)
      setErro(null)
      return dados
    } catch (e) {
      setErro((e as Error).message)
      throw e
    } finally {
      setCarregando(false)
    }
  }, [])

  /**
   * Cria os acessos da EQUIPE INICIAL (JESSICA, RAISSA, ANDREIA — lista em
   * `lib/equipe-inicial.ts`) na primeira abertura. São acessos de funcionário
   * **sem senha**: cada um entra tocando no próprio nome na tela de entrada.
   *
   * O acesso do PROPRIETÁRIO nunca vem pronto — ele é criado na porta
   * administrativa (#/administracao) e exige senha.
   */
  const criarEquipeInicial = useCallback(
    async (dados: DB): Promise<DB> => {
      if (dados.configuracoes.modo_exemplo || lsLer(CHAVE_EQUIPE_INICIAL) === '1') return dados
      const { vendedores, usuarios } = registrosEquipeInicial(dados)
      if (!vendedores.length && !usuarios.length) {
        lsGravar(CHAVE_EQUIPE_INICIAL, '1')
        return dados
      }
      try {
        await salvarVarios('vendedores', vendedores)
        await salvarVarios('usuarios', usuarios)
        // só marca depois de gravado: se o banco ainda não tiver a coluna nova,
        // tenta de novo na próxima abertura em vez de desistir para sempre
        lsGravar(CHAVE_EQUIPE_INICIAL, '1')
        if (usuarios.length)
          avisar(
            `Acessos da equipe prontos: ${usuarios
              .map((u) => u.nome)
              .join(', ')} — cada um entra tocando no próprio nome (sem senha).`,
            'info',
          )
        const idsUsuarios = new Set(usuarios.map((u) => u.id))
        return {
          ...dados,
          vendedores: [...dados.vendedores, ...vendedores].sort((a, b) => a.nome.localeCompare(b.nome)),
          usuarios: [...dados.usuarios.filter((u) => !idsUsuarios.has(u.id)), ...usuarios],
        }
      } catch (e) {
        console.warn('[altoprints] não foi possível criar os acessos da equipe:', (e as Error).message)
        return dados
      }
    },
    [avisar],
  )

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
    avisar('Este aparelho voltou ao modo local (os dados da nuvem continuam salvos).', 'info')
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
        // bancos antigos ficavam no localStorage (espaço pequeno): passa para o
        // armazenamento novo e devolve o espaço. Falhar aqui não impede o uso.
        try {
          const liberado = await liberarCopiaAntiga(JSON.stringify(dados))
          if (liberado > 0) console.info(`[altoprints] ${Math.round(liberado / 1024)} KB liberados no navegador.`)
        } catch {
          /* sem problema: o sistema segue funcionando com o que tem */
        }
        setErro(null)
      } catch (e) {
        setErro((e as Error).message)
      } finally {
        setCarregando(false)
      }
    })()
  }, [])

  /* ----------------------------- vendedores ----------------------------- */

  const salvarVendedor = useCallback(
    async (dados: { nome: string }, id?: ID) => {
      bloquearSeVisualizando()
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
      bloquearSeVisualizando()
      await removerRegistro('vendedores', id)
      setDb((atual) => ({ ...atual, vendedores: atual.vendedores.filter((v) => v.id !== id) }))
      avisar('Vendedor excluído.', 'info')
    },
    [avisar],
  )

  /* ------------------------------ clientes ------------------------------ */

  const salvarCliente = useCallback(
    async (dados: Omit<Cliente, 'id' | 'created_at'>, id?: ID) => {
      bloquearSeVisualizando()
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
      bloquearSeVisualizando()
      await removerRegistro('clientes', id)
      setDb((atual) => ({ ...atual, clientes: atual.clientes.filter((c) => c.id !== id) }))
      avisar('Cliente excluído.', 'info')
    },
    [avisar],
  )

  /* ------------------------------- pedidos ------------------------------ */

  const enviarArquivos = useCallback(
    async (pedidoId: ID, arquivos: File[]) => {
      bloquearSeVisualizando()
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
      bloquearSeVisualizando()
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
      bloquearSeVisualizando()
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
      bloquearSeVisualizando()
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
      bloquearSeVisualizando()
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
      bloquearSeVisualizando()
      await salvarConfiguracoes(parcial)
      setDb((atual) => ({ ...atual, configuracoes: { ...atual.configuracoes, ...parcial } }))
    },
    [],
  )

  const resetarDados = useCallback(
    async (manterContaId?: string) => {
      bloquearSeVisualizando()
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

  /** restaura um backup baixado antes (substitui tudo o que está no sistema) */
  const restaurarBackup = useCallback(
    async (arquivo: File) => {
      bloquearSeVisualizando()
      const texto = await arquivo.text()
      const dados = JSON.parse(texto) as Partial<DB>
      if (!Array.isArray(dados.pedidos) || !Array.isArray(dados.clientes))
        throw new Error('Este arquivo não parece ser um backup do sistema.')
      const restaurado: DB = {
        vendedores: dados.vendedores ?? [],
        clientes: dados.clientes ?? [],
        pedidos: dados.pedidos ?? [],
        arquivos: dados.arquivos ?? [],
        impressoes: dados.impressoes ?? [],
        usuarios: dados.usuarios ?? [],
        configuracoes: { ...CONFIG_PADRAO, ...(dados.configuracoes ?? {}) },
      }
      await substituirTudo(restaurado)
      setDb(restaurado)
      avisar('Backup restaurado com sucesso!')
    },
    [avisar],
  )

  /**
   * Carrega os dados de EXEMPLO (fictícios) para treinar a equipe.
   * Nunca toca nas contas de acesso nem nas configurações do dono: assim ninguém
   * é trancado para fora do sistema e o logo/comissões continuam os mesmos.
   */
  const carregarDemo = useCallback(async () => {
    bloquearSeVisualizando()
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
    // no armazenamento novo o que interessa é o tamanho dos dados; no antigo, o
    // total do navegador (que inclui tudo o que este site guardou)
    return testarArmazenamento()
  }, [])

  const liberarEspaco = useCallback(async () => {
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
