import {
  BellRing,
  Calculator,
  Check,
  Cloud,
  Database,
  Download,
  Image as ImageIcon,
  KeyRound,
  Moon,
  Palette,
  Percent,
  Plus,
  RefreshCw,
  Rows3,
  Rows4,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Tags,
  TriangleAlert,
  Upload,
  UserCog,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  calcularComissao,
  normalizarFaixas,
  normalizarFaixasValor,
  regrasDaConfig,
  rotuloFaixa,
  rotuloFaixaValor,
  validarFaixas,
  validarFaixasValor,
} from '../lib/comissao'
import { useAuth } from '../lib/auth'
import { prepararBackup } from '../lib/backup'
import { prepararMesclaRelatorioCSV } from '../lib/relatorio-backup'
import type { DiagnosticoArmazenamento } from '../lib/armazenamento'
import { tamanhoLegivel } from '../lib/files'
import { dataBR, moeda, numeroBR, percentualBR } from '../lib/format'
import { useStore } from '../lib/store'
import { DESCRICAO_DENSIDADE, LABEL_DENSIDADE, useTema } from '../lib/tema'
import { VERSAO } from '../lib/versao'
import { nuvemObrigatoria } from '../lib/supabase'
import {
  FAIXAS_PADRAO,
  FAIXAS_PRECO_PADRAO,
  FAIXAS_VALOR_PADRAO,
  type FaixaComissao,
  type FaixaComissaoValor,
  type FaixaPreco,
} from '../lib/types'
import { faixaDePreco } from '../lib/pricing'
import { AbaNuvem } from '../components/Nuvem'
import Equipe from './Equipe'
import { Abas, Botao, Campo, Cartao, Entrada, Etiqueta, cn, useConfirmacao } from '../components/ui'

type Aba =
  | 'comissoes'
  | 'precos'
  | 'equipe'
  | 'empresa'
  | 'ia'
  | 'dados'
  | 'acesso'
  | 'nuvem'
  | 'aparencia'

/** Lista fechada de abas — também serve para validar o que vem na barra de endereço */
const ABAS_CONFIG: Aba[] = [
  'comissoes',
  'precos',
  'equipe',
  'empresa',
  'ia',
  'dados',
  'nuvem',
  'acesso',
  'aparencia',
]

/** Explicação curta de cada aba ("para que serve") */
const AJUDA_ABA: Record<Aba, string> = {
  comissoes: 'As faixas do valor do metro que definem o percentual de comissão de cada pedido concluído (a tabela por metragem fica só para o histórico).',
  precos: 'O preço do metro por faixa de metragem — é o que calcula o valor dos pedidos novos.',
  equipe: 'Os funcionários que aparecem nos pedidos e os acessos de proprietário (login com senha).',
  empresa: 'Nome e logo da empresa, que aparecem no sistema e nas folhas impressas.',
  ia: 'A chave da IA que lê a foto do comprovante e preenche o pedido automaticamente.',
  dados: 'Backup JSON completo, restauração e mesclagem do relatório CSV; dados operacionais ficam no banco central.',
  nuvem: 'A conexão com o Supabase, para a equipe toda ver os mesmos pedidos em qualquer aparelho.',
  acesso: 'O seu usuário e a sua senha, e como criar um segundo acesso de proprietário.',
  aparencia: 'Tema claro/escuro e o tamanho dos blocos (só para este aparelho).',
}

export default function Configuracoes() {
  const {
    db,
    nuvem,
    salvarConfig,
    resetarDados,
    carregarDemo,
    baixarBackup,
    restaurarBackup,
    mesclarRelatorioCSV,
    recarregar,
    avisar,
    medirEspaco,
    liberarEspaco,
  } = useStore()
  const { usuario, trocarMinhaSenha, trocarMeuUsuario, atualizarMeuPerfil } = useAuth()
  const { tema, densidade, setTema, definirDensidade } = useTema()
  const { confirmar, dialog } = useConfirmacao()
  // dá para chegar direto numa aba: /configuracoes?aba=equipe (usado pelo Painel)
  const [parametros] = useSearchParams()
  const abaDaUrl = parametros.get('aba')
  const [aba, setAba] = useState<Aba>(() =>
    ABAS_CONFIG.includes(abaDaUrl as Aba) ? (abaDaUrl as Aba) : 'comissoes',
  )
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (ABAS_CONFIG.includes(abaDaUrl as Aba)) setAba(abaDaUrl as Aba)
  }, [abaDaUrl])

  const importarRelatorioCSV = async (arquivo?: File | null) => {
    if (!arquivo) return
    try {
      const conteudo = await arquivo.text()
      const bancoAtual = await recarregar(true)
      const previaRelatorio = prepararMesclaRelatorioCSV(conteudo, bancoAtual)
      if (!previaRelatorio.pedidosNovos.length) {
        avisar(
          `Nenhum pedido novo para acrescentar. ${previaRelatorio.duplicados} pedido(s) do relatório já existem e foram mantidos.`,
          'info',
        )
        return
      }

      const avisoDatas = previaRelatorio.datasSemOrigem
        ? `\n\nEm ${previaRelatorio.datasSemOrigem} pedido(s), o arquivo não tem data do pedido nem de pagamento; será usada a data da importação.`
        : ''
      const avisoConflitos = previaRelatorio.conflitos
        ? `\n\n${previaRelatorio.conflitos} número(s) já existe(m) com dados diferentes; o pedido atual será mantido.`
        : ''
      const avisoModoLocal = !nuvem
        ? '\n\nEste ambiente de desenvolvimento está sem conexão online; o site oficial bloqueia o uso sem o Supabase central.'
        : ''
      const ok = await confirmar({
        titulo: 'Mesclar relatório geral?',
        mensagem:
          `O CSV tem ${previaRelatorio.pedidosNoArquivo} pedido(s): serão acrescentados ${previaRelatorio.pedidosNovos.length} pedido(s) ausente(s), ` +
          `${previaRelatorio.clientesNovos.length} cliente(s) e ${previaRelatorio.vendedoresNovos.length} funcionário(s) que não existiam. ` +
          `${previaRelatorio.duplicados} pedido(s) com número já cadastrado serão ignorados. Nada será apagado nem sobrescrito. ` +
          'O CSV só recupera as colunas exportadas (pedidos concluídos, nomes, metragem, valor, datas, descrição, pagamento e entrega); contatos, endereços, pedidos em andamento, acessos, configurações e artes exigem o backup JSON completo.' +
          avisoDatas + avisoConflitos + avisoModoLocal,
        textoBotao: 'Mesclar sem apagar',
      })
      if (!ok) return

      const resultado = await mesclarRelatorioCSV(conteudo)
      avisar(
        `Relatório mesclado: ${resultado.pedidosNovos.length} pedido(s) novo(s), ${resultado.duplicados} já existente(s) mantido(s).`,
      )
    } catch (erro) {
      avisar((erro as Error).message || 'Não foi possível ler esse relatório.', 'erro')
    }
  }

  /* --------------------------- espaço no aparelho --------------------------- */
  const vazio: DiagnosticoArmazenamento = { localOk: true, idbOk: true, onde: 'nenhum', bytesLocal: 0, ocupantes: [] }
  const [espaco, setEspaco] = useState<DiagnosticoArmazenamento>(vazio)
  const medir = async () => setEspaco(await medirEspaco())
  useEffect(() => {
    if (aba === 'dados' && !nuvemObrigatoria) void medir()
  }, [aba])

  /* ------------------------------ meu acesso ----------------------------- */
  const [meuUsuario, setMeuUsuario] = useState(usuario?.usuario ?? '')
  const [meuNome, setMeuNome] = useState(usuario?.nome ?? '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaRepetida, setSenhaRepetida] = useState('')

  /* ------------------------------ comissões ------------------------------ */
  /** tabela EM VIGOR: percentual pela faixa do valor do metro */
  const [faixasValor, setFaixasValor] = useState<FaixaComissaoValor[]>(
    db.configuracoes.faixas_comissao_valor?.length
      ? db.configuracoes.faixas_comissao_valor
      : FAIXAS_VALOR_PADRAO,
  )
  const [rascunhoPercentualValor, setRascunhoPercentualValor] = useState<Record<string, string>>({})
  /** percentual de fallback (pedido sem metragem/valor) — padrão: o da menor faixa */
  const [semValorMetro, setSemValorMetro] = useState<string>(
    db.configuracoes.comissao_sem_valor_metro === null ||
      db.configuracoes.comissao_sem_valor_metro === undefined
      ? ''
      : String(db.configuracoes.comissao_sem_valor_metro).replace('.', ','),
  )
  const [desde, setDesde] = useState<string>(db.configuracoes.comissao_por_valor_desde ?? '2026-11-01')
  const problemasValor = useMemo(() => validarFaixasValor(faixasValor), [faixasValor])

  /** tabela ANTIGA (por metragem) — vale só para os pedidos anteriores à vigência */
  const [faixas, setFaixas] = useState<FaixaComissao[]>(db.configuracoes.faixas_comissao ?? FAIXAS_PADRAO)
  const [rascunhoPercentual, setRascunhoPercentual] = useState<Record<string, string>>({})
  const [semMetragem, setSemMetragem] = useState(
    String(db.configuracoes.comissao_sem_metragem ?? 0).replace('.', ','),
  )
  const [mostrarAntiga, setMostrarAntiga] = useState(false)
  const problemas = useMemo(() => validarFaixas(faixas), [faixas])
  const problemasComissoes = [...problemasValor, ...problemas]

  const pagosDoMes = useMemo(() => {
    const prefixo = new Date().toISOString().slice(0, 7)
    return db.pedidos.filter((p) => {
      if (!p.pago) return false
      return (p.data_pagamento || (p.data_pedido || '').slice(0, 10)).startsWith(prefixo)
    })
  }, [db.pedidos])

  /** prévia com a tabela que está na tela (ainda não salva) */
  const previa = useMemo(
    () =>
      calcularComissao(
        pagosDoMes,
        regrasDaConfig({
          faixas_comissao: normalizarFaixas(faixas),
          comissao_sem_metragem: Number(String(semMetragem).replace(',', '.')) || 0,
          faixas_comissao_valor: normalizarFaixasValor(faixasValor),
          comissao_por_valor_desde: desde || null,
          comissao_sem_valor_metro: semValorMetro.trim()
            ? Number(String(semValorMetro).replace(',', '.')) || 0
            : null,
        }),
      ),
    [desde, faixas, faixasValor, pagosDoMes, semMetragem, semValorMetro],
  )

  const atualizarFaixa = (id: string, patch: Partial<FaixaComissao>) =>
    setFaixas((f) => f.map((faixa) => (faixa.id === id ? { ...faixa, ...patch } : faixa)))

  const atualizarFaixaValor = (id: string, patch: Partial<FaixaComissaoValor>) =>
    setFaixasValor((f) => f.map((faixa) => (faixa.id === id ? { ...faixa, ...patch } : faixa)))

  /* ------------------------------- preços -------------------------------- */
  const [precos, setPrecos] = useState<FaixaPreco[]>(
    db.configuracoes.faixas_preco?.length ? db.configuracoes.faixas_preco : FAIXAS_PRECO_PADRAO,
  )

  const atualizarPreco = (id: string, patch: Partial<FaixaPreco>) =>
    setPrecos((lista) => lista.map((faixa) => (faixa.id === id ? { ...faixa, ...patch } : faixa)))

  const problemasPreco = useMemo(() => {
    const ordenadas = [...precos].sort((a, b) => a.de - b.de)
    const erros: string[] = []
    if (!ordenadas.length) erros.push('Deixe pelo menos uma faixa de preço.')
    ordenadas.forEach((f) => {
      if (f.de < 0) erros.push('A metragem inicial não pode ser negativa.')
      if (f.valor <= 0) erros.push(`Informe o valor do metro da faixa ${f.rotulo || f.de}.`)
      if (f.ate !== null && f.ate <= f.de) erros.push('O fim da faixa precisa ser maior que o início.')
    })
    ordenadas.forEach((f, i) => {
      const anterior = ordenadas[i - 1]
      if (anterior && anterior.ate !== null && f.de < anterior.ate) erros.push('As faixas de preço não podem se sobrepor.')
    })
    return [...new Set(erros)]
  }, [precos])

  const salvarPrecos = async () => {
    if (problemasPreco.length) return avisar(problemasPreco[0], 'erro')
    setSalvando(true)
    try {
      await salvarConfig({
        faixas_preco: [...precos]
          .sort((a, b) => a.de - b.de)
          .map((f) => ({ ...f, rotulo: rotuloFaixa(f.de, f.ate) })),
      })
      avisar('Tabela de preços salva!')
    } finally {
      setSalvando(false)
    }
  }

  const salvarComissoes = async () => {
    if (problemasComissoes.length) return avisar(problemasComissoes[0], 'erro')
    setSalvando(true)
    try {
      await salvarConfig({
        faixas_comissao_valor: normalizarFaixasValor(faixasValor),
        comissao_por_valor_desde: desde || null,
        comissao_sem_valor_metro: semValorMetro.trim()
          ? Number(String(semValorMetro).replace(',', '.')) || 0
          : null,
        faixas_comissao: normalizarFaixas(faixas),
        comissao_sem_metragem: Number(String(semMetragem).replace(',', '.')) || 0,
      })
      avisar('Regras de comissão salvas!')
    } finally {
      setSalvando(false)
    }
  }

  /* -------------------------------- empresa ------------------------------ */
  const [nomeEmpresa, setNomeEmpresa] = useState(db.configuracoes.empresa_nome)
  const [chaveIA, setChaveIA] = useState(db.configuracoes.openai_key)
  const inputLogo = useRef<HTMLInputElement>(null)

  const escolherLogo = (file?: File | null) => {
    if (!file) return
    if (file.size > 400 * 1024) return avisar('Escolha uma imagem menor que 400 KB para o logo.', 'erro')
    const leitor = new FileReader()
    leitor.onload = async () => {
      await salvarConfig({ logo_url: String(leitor.result) })
      avisar('Logo atualizado!')
    }
    leitor.readAsDataURL(file)
  }

  const salvarEmpresa = async () => {
    setSalvando(true)
    try {
      await salvarConfig({ empresa_nome: nomeEmpresa.trim() || 'Altoprints', openai_key: chaveIA.trim() })
      avisar('Dados salvos!')
    } finally {
      setSalvando(false)
    }
  }

  const abas: { id: Aba; label: string; icone: typeof Percent }[] = [
    { id: 'comissoes', label: 'Comissões', icone: Percent },
    { id: 'precos', label: 'Preços', icone: Tags },
    { id: 'equipe', label: 'Funcionários e acessos', icone: UsersRound },
    { id: 'empresa', label: 'Empresa', icone: ImageIcon },
    { id: 'ia', label: 'Comprovantes (IA)', icone: Sparkles },
    { id: 'dados', label: 'Dados', icone: Database },
    { id: 'nuvem', label: 'Nuvem', icone: Cloud },
    { id: 'acesso', label: 'Meu acesso', icone: KeyRound },
    { id: 'aparencia', label: 'Aparência', icone: Palette },
  ]

  return (
    <>
      <Abas<Aba>
        ativa={aba}
        onChange={setAba}
        abas={abas.map(({ id, label, icone }) => ({ id, label, icone }))}
        acoes={
          <>
            {aba === 'comissoes' ? (
              <Botao
                icone={Save}
                onClick={salvarComissoes}
                carregando={salvando}
                disabled={problemasComissoes.length > 0}
              >
                Salvar comissões
              </Botao>
            ) : null}
            {aba === 'empresa' || aba === 'ia' ? (
              <Botao icone={Save} onClick={salvarEmpresa} carregando={salvando}>
                Salvar
              </Botao>
            ) : null}
          </>
        }
      />

      <p className="-mt-1.5 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{AJUDA_ABA[aba]}</p>

      {/* ------------------------------ COMISSÕES ------------------------------ */}
      {aba === 'comissoes' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            <b>Como funciona agora:</b> entram no relatório <b>todas as filas concluídas</b> do período. A comissão é
            definida pelo <b>valor do metro</b> do pedido (valor ÷ metragem): o percentual da faixa em que esse valor
            cai é aplicado sobre o valor da fila. Pedido com valor especial do cliente também entra pela faixa certa.
            A tabela por metragem deixou de valer em <b>{dataBR(desde || '2026-11-01')}</b> e só continua sendo usada
            nos pedidos anteriores a essa data.
          </div>

          <Cartao hover={false}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                Faixas pelo valor do metro (em vigor)
              </p>
              <div className="flex flex-wrap gap-2">
                <Botao
                  tamanho="sm"
                  variante="secundario"
                  icone={RefreshCw}
                  onClick={async () => {
                    const ok = await confirmar({
                      titulo: 'Usar a tabela oficial de comissão?',
                      mensagem:
                        'As faixas atuais serão substituídas por: R$ 59,90 ou mais 3% · R$ 54,90 a 59,89 2,75% · R$ 49,90 a 54,89 2,5% · R$ 44,90 a 49,89 2,25% · R$ 39,90 a 44,89 2% · abaixo de R$ 39,90 1,5%.',
                      textoBotao: 'Usar tabela oficial',
                    })
                    if (ok) {
                      setFaixasValor(FAIXAS_VALOR_PADRAO.map((f) => ({ ...f })))
                      setRascunhoPercentualValor({})
                    }
                  }}
                >
                  Usar tabela oficial
                </Botao>
                <Botao
                  tamanho="sm"
                  variante="secundario"
                  icone={Plus}
                  onClick={() => {
                    const ordenadas = [...faixasValor].sort((a, b) => a.de - b.de)
                    const ultima = ordenadas[ordenadas.length - 1]
                    const de = ultima ? Number(((ultima.ate ?? ultima.de) + 0.1).toFixed(2)) : 39.9
                    const ate = Number((de + 5).toFixed(2))
                    setFaixasValor((f) => [
                      ...f,
                      { id: `valor-${Date.now()}`, de, ate, percentual: 2, rotulo: rotuloFaixaValor(de, ate) },
                    ])
                  }}
                >
                  Adicionar faixa
                </Botao>
              </div>
            </div>

            <div className="space-y-2">
              {[...faixasValor]
                .sort((a, b) => a.de - b.de)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <Campo label="Metro de (R$)" className="w-32">
                      <Entrada
                        type="number"
                        min={0}
                        step="0.01"
                        value={f.de}
                        onChange={(e) => atualizarFaixaValor(f.id, { de: Number(e.target.value) })}
                      />
                    </Campo>
                    <Campo label="Metro até (R$)" className="w-32">
                      <Entrada
                        type="number"
                        min={0}
                        step="0.01"
                        value={f.ate ?? ''}
                        placeholder="sem limite"
                        onChange={(e) =>
                          atualizarFaixaValor(f.id, { ate: e.target.value === '' ? null : Number(e.target.value) })
                        }
                      />
                    </Campo>
                    <Campo label="Comissão (%)" className="w-32">
                      <Entrada
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex.: 2,75"
                        value={rascunhoPercentualValor[f.id] ?? String(f.percentual).replace('.', ',')}
                        onChange={(e) => {
                          const texto = e.target.value.replace(/[^0-9.,]/g, '')
                          setRascunhoPercentualValor((atual) => ({ ...atual, [f.id]: texto }))
                          const numero = Number(texto.replace(',', '.'))
                          if (!Number.isNaN(numero)) atualizarFaixaValor(f.id, { percentual: numero })
                        }}
                        onBlur={() =>
                          setRascunhoPercentualValor((atual) => {
                            const copia = { ...atual }
                            delete copia[f.id]
                            return copia
                          })
                        }
                      />
                    </Campo>
                    <div className="min-w-[150px] flex-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {rotuloFaixaValor(f.de, f.ate)} →{' '}
                      <b className="text-purple-600 dark:text-purple-400">{percentualBR(f.percentual)}</b>
                      <span className="ml-2 text-slate-400 dark:text-slate-500">
                        ex.: 10 m = {moeda(f.de * 10)} → {moeda(f.de * 10 * (f.percentual / 100))}
                      </span>
                    </div>
                    <Botao
                      tamanho="sm"
                      variante="ghost"
                      className="text-rose-500 hover:bg-rose-50"
                      icone={Trash2}
                      onClick={() => setFaixasValor((lista) => lista.filter((x) => x.id !== f.id))}
                    >
                      Remover
                    </Botao>
                  </div>
                ))}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Campo
                label="Vale a partir de"
                className="w-full sm:w-52"
                dica="Pedidos com data anterior a esta continuam na tabela por metragem, para o histórico não mudar."
              >
                <Entrada type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </Campo>
              <Campo
                label="Sem valor do metro (%)"
                className="w-full sm:w-56"
                dica="Pedido sem metragem (ou sem valor) não tem como entrar numa faixa. Em branco = usa o percentual da menor faixa."
              >
                <Entrada
                  type="text"
                  inputMode="decimal"
                  placeholder="menor faixa"
                  value={semValorMetro}
                  onChange={(e) => setSemValorMetro(e.target.value.replace(/[^0-9.,]/g, ''))}
                />
              </Campo>
              <Botao
                variante="secundario"
                icone={RefreshCw}
                onClick={() => {
                  setFaixasValor(FAIXAS_VALOR_PADRAO.map((f) => ({ ...f })))
                  setRascunhoPercentualValor({})
                  setSemValorMetro('')
                  setDesde('2026-11-01')
                }}
              >
                Restaurar padrão
              </Botao>
            </div>

            {problemasValor.length ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {problemasValor.map((p) => (
                  <p key={p} className="flex items-start gap-1.5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Faixas válidas
              </p>
            )}

            <div className="mt-3 flex justify-end">
              <Botao
                icone={Save}
                onClick={salvarComissoes}
                carregando={salvando}
                disabled={problemasComissoes.length > 0}
              >
                Salvar comissões
              </Botao>
            </div>
          </Cartao>

          <Cartao hover={false}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  Tabela antiga — por metragem (histórico)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Só vale para pedidos anteriores a {dataBR(desde || '2026-11-01')}.
                </p>
              </div>
              <Botao tamanho="sm" variante="secundario" onClick={() => setMostrarAntiga((v) => !v)}>
                {mostrarAntiga ? 'Ocultar' : 'Mostrar tabela antiga'}
              </Botao>
            </div>

            {mostrarAntiga ? (
              <>
                <div className="space-y-2">
                  {[...faixas]
                    .sort((a, b) => a.de - b.de)
                    .map((f) => (
                      <div
                        key={f.id}
                        className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <Campo label="De (m)" className="w-24">
                          <Entrada
                            type="number"
                            min={1}
                            value={f.de}
                            onChange={(e) => atualizarFaixa(f.id, { de: Number(e.target.value) })}
                          />
                        </Campo>
                        <Campo label="Até (m)" className="w-24">
                          <Entrada
                            type="number"
                            min={1}
                            value={f.ate ?? ''}
                            placeholder="sem limite"
                            onChange={(e) =>
                              atualizarFaixa(f.id, { ate: e.target.value === '' ? null : Number(e.target.value) })
                            }
                          />
                        </Campo>
                        <Campo label="Comissão (%)" className="w-32">
                          <Entrada
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex.: 2,75"
                            value={rascunhoPercentual[f.id] ?? String(f.percentual).replace('.', ',')}
                            onChange={(e) => {
                              const texto = e.target.value.replace(/[^0-9.,]/g, '')
                              setRascunhoPercentual((atual) => ({ ...atual, [f.id]: texto }))
                              const numero = Number(texto.replace(',', '.'))
                              if (!Number.isNaN(numero)) atualizarFaixa(f.id, { percentual: numero })
                            }}
                            onBlur={() =>
                              setRascunhoPercentual((atual) => {
                                const copia = { ...atual }
                                delete copia[f.id]
                                return copia
                              })
                            }
                          />
                        </Campo>
                        <div className="min-w-[120px] flex-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {rotuloFaixa(f.de, f.ate)} →{' '}
                          <b className="text-purple-600 dark:text-purple-400">{percentualBR(f.percentual)}</b>
                        </div>
                        <Botao
                          tamanho="sm"
                          variante="ghost"
                          className="text-rose-500 hover:bg-rose-50"
                          icone={Trash2}
                          onClick={() => setFaixas((lista) => lista.filter((x) => x.id !== f.id))}
                        >
                          Remover
                        </Botao>
                      </div>
                    ))}
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <Campo
                    label="Comissão de pedidos sem metragem (%)"
                    className="w-full sm:w-64"
                    dica="Usado na tabela antiga quando o pedido não tem metragem informada."
                  >
                    <Entrada
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex.: 0 ou 2,75"
                      value={semMetragem}
                      onChange={(e) => setSemMetragem(e.target.value.replace(/[^0-9.,]/g, ''))}
                    />
                  </Campo>
                  <Botao
                    variante="secundario"
                    icone={Plus}
                    onClick={() => {
                      const ordenadas = [...faixas].sort((a, b) => a.de - b.de)
                      const ultima = ordenadas[ordenadas.length - 1]
                      const de = ultima ? (ultima.ate ?? ultima.de) + 1 : 1
                      setFaixas((f) => [
                        ...f,
                        { id: `faixa-${Date.now()}`, de, ate: de + 9, percentual: 2, rotulo: rotuloFaixa(de, de + 9) },
                      ])
                    }}
                  >
                    Adicionar faixa antiga
                  </Botao>
                  <Botao
                    variante="secundario"
                    icone={RefreshCw}
                    onClick={() => {
                      setFaixas(FAIXAS_PADRAO.map((f) => ({ ...f })))
                      setRascunhoPercentual({})
                      setSemMetragem('0')
                    }}
                  >
                    Restaurar tabela antiga
                  </Botao>
                </div>

                {problemas.length ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                    {problemas.map((p) => (
                      <p key={p} className="flex items-start gap-1.5">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p}
                      </p>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </Cartao>

          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-700 dark:text-slate-200">
              <Calculator className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Prévia com os pedidos pagos deste
              mês
            </p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              {pagosDoMes.length} pedido(s) pagos • faturamento {moeda(previa.base)} • comissão total{' '}
              <b className="text-emerald-600 dark:text-emerald-400">{moeda(previa.total)}</b> (média{' '}
              {numeroBR(previa.percentualMedio, 2)}%)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-1.5">Faixa</th>
                    <th className="py-1.5 text-right">%</th>
                    <th className="py-1.5 text-right">Pedidos</th>
                    <th className="py-1.5 text-right">Metragem</th>
                    <th className="py-1.5 text-right">Faturamento</th>
                    <th className="py-1.5 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...previa.porFaixa, previa.semMetragem]
                    .filter((l) => l.pedidos > 0)
                    .map((l) => (
                      <tr key={l.id}>
                        <td className="py-1.5 font-semibold text-slate-700 dark:text-slate-200">{l.rotulo}</td>
                        <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">{percentualBR(l.percentual)}</td>
                        <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">{l.pedidos}</td>
                        <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">{numeroBR(l.metragem)} m</td>
                        <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">{moeda(l.faturamento)}</td>
                        <td className="py-1.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {moeda(l.comissao)}
                        </td>
                      </tr>
                    ))}
                  {!previa.porFaixa.some((l) => l.pedidos > 0) && previa.semMetragem.pedidos === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400 dark:text-slate-500">
                        Nenhum pedido pago neste mês ainda.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Cartao>
        </div>
      ) : null}

      {/* ------------------------------- PREÇOS ------------------------------- */}
      {aba === 'precos' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            <b>Como funciona:</b> quando o vendedor digita a metragem da fila, o sistema pega o <b>valor do metro</b> da
            faixa em que ela cai e calcula o valor automaticamente. Cliente com <b>valor especial</b> continua usando o
            valor dele.
          </div>

          <Cartao hover={false}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Tabela de preço por metro</p>
              <div className="flex flex-wrap gap-2">
                <Botao
                  tamanho="sm"
                  variante="secundario"
                  icone={Plus}
                  onClick={() =>
                    setPrecos((lista) => {
                      const ordenadas = [...lista].sort((a, b) => a.de - b.de)
                      const ultima = ordenadas[ordenadas.length - 1]
                      const de = ultima ? (ultima.ate ?? ultima.de) + 1 : 1
                      return [...lista, { id: `preco-${Date.now()}`, de, ate: de + 9, valor: 49.9, rotulo: rotuloFaixa(de, de + 9) }]
                    })
                  }
                >
                  Adicionar faixa
                </Botao>
                <Botao tamanho="sm" variante="secundario" icone={RefreshCw} onClick={() => setPrecos(FAIXAS_PRECO_PADRAO.map((f) => ({ ...f })))}>
                  Restaurar padrão
                </Botao>
              </div>
            </div>

            <div className="space-y-2">
              {[...precos]
                .sort((a, b) => a.de - b.de)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <Campo label="De (m)" className="w-24">
                      <Entrada
                        type="number"
                        min={0}
                        value={f.de}
                        onChange={(e) => atualizarPreco(f.id, { de: Number(e.target.value) })}
                      />
                    </Campo>
                    <Campo label="Até (m)" className="w-24">
                      <Entrada
                        type="number"
                        min={1}
                        value={f.ate ?? ''}
                        placeholder="sem limite"
                        onChange={(e) => atualizarPreco(f.id, { ate: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </Campo>
                    <Campo label="Valor do metro (R$)" className="w-36">
                      <Entrada
                        type="number"
                        min={0}
                        step="0.01"
                        value={f.valor}
                        onChange={(e) => atualizarPreco(f.id, { valor: Number(e.target.value) })}
                      />
                    </Campo>
                    <div className="flex-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {rotuloFaixa(f.de, f.ate)} → {moeda(f.valor)} por metro
                      <span className="ml-2 text-slate-400 dark:text-slate-500">
                        ex.: 3 m = {moeda(f.valor * 3)}
                      </span>
                    </div>
                    <Botao
                      tamanho="sm"
                      variante="ghost"
                      className="text-rose-500 hover:bg-rose-50"
                      icone={Trash2}
                      onClick={() => setPrecos((lista) => lista.filter((x) => x.id !== f.id))}
                    >
                      Remover
                    </Botao>
                  </div>
                ))}
            </div>

            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <b>Conferência:</b> 3 m caem na faixa de {faixaDePreco(3, precos)?.rotulo || '—'} (
              {moeda(faixaDePreco(3, precos)?.valor ?? 0)}/m) • 12 m em {faixaDePreco(12, precos)?.rotulo || '—'} (
              {moeda(faixaDePreco(12, precos)?.valor ?? 0)}/m)
            </div>

            {problemasPreco.length ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {problemasPreco.map((p) => (
                  <p key={p} className="flex items-start gap-1.5">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Tabela válida
              </p>
            )}

            <div className="mt-3 flex justify-end">
              <Botao icone={Save} onClick={salvarPrecos} carregando={salvando}>
                Salvar tabela de preços
              </Botao>
            </div>
          </Cartao>
        </div>
      ) : null}

      {/* ------------------------------ EMPRESA ------------------------------ */}
      {aba === 'empresa' ? (
        <Cartao hover={false} className="space-y-4">
          <div
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3 text-sm',
              nuvem
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
            )}
          >
            {nuvem ? <Cloud className="mt-0.5 h-5 w-5" /> : <Database className="mt-0.5 h-5 w-5" />}
            <div>
              <p className="font-bold">{nuvem ? 'Banco central na nuvem (Supabase) conectado' : 'Conexão online não configurada'}</p>
              <p className="text-xs">
                {nuvem
                  ? 'Este ambiente usa o banco central online, igual para todos os aparelhos.'
                  : 'Use esta conexão somente em desenvolvimento/testes; o site oficial bloqueia o uso sem o Supabase central.'}
              </p>
            </div>
          </div>

          <Campo label="Nome da empresa">
            <Entrada value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} />
          </Campo>

          <Campo label="Logo da empresa" dica="PNG ou JPG pequeno (até 400 KB). Usada no cabeçalho e nos relatórios.">
            <div className="flex flex-wrap items-center gap-3">
              {db.configuracoes.logo_url ? (
                <img
                  src={db.configuracoes.logo_url}
                  alt="Logo atual"
                  className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-1 dark:border-slate-700"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 dark:border-slate-600">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <input
                ref={inputLogo}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => escolherLogo(e.target.files?.[0])}
              />
              <Botao variante="secundario" icone={Upload} onClick={() => inputLogo.current?.click()}>
                Enviar logo
              </Botao>
              {db.configuracoes.logo_url ? (
                <Botao
                  variante="ghost"
                  onClick={async () => {
                    await salvarConfig({ logo_url: '' })
                    avisar('Logo removido.', 'info')
                  }}
                >
                  Remover
                </Botao>
              ) : null}
            </div>
          </Campo>
        </Cartao>
      ) : null}

      {/* -------------------------------- IA -------------------------------- */}
      {aba === 'ia' ? (
        <Cartao hover={false} className="space-y-4">
          <Campo
            label="Chave da IA para ler comprovantes (opcional)"
            dica="Usada no botão 'Importar comprovante' dentro do pedido. Se ficar vazia, o recurso fica desativado."
          >
            <Entrada
              value={chaveIA}
              onChange={(e) => setChaveIA(e.target.value)}
              placeholder="sk-..."
              type="password"
              autoComplete="off"
            />
          </Campo>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A chave fica salva no banco do sistema e é usada para enviar a foto do comprovante à OpenAI, que devolve
            cliente, valor e data já preenchidos.
          </p>
        </Cartao>
      ) : null}

      {/* ------------------------------ DADOS ------------------------------- */}
      {aba === 'dados' ? (
        <div className="space-y-4">
          {nuvemObrigatoria ? (
            <Cartao hover={false}>
              <p className="mb-1 flex items-center gap-2 text-sm font-bold text-sky-900 dark:text-sky-200">
                <Database className="h-4 w-4" /> Dados operacionais no banco central
              </p>
              <p className="mb-3 text-xs text-sky-800 dark:text-sky-300">
                Pedidos, clientes, equipe, arquivos, acessos e configurações ficam no Supabase compartilhado. A conexão
                está {nuvem ? 'configurada' : 'indisponível'}; sem internet ou banco, o site não salva esses dados neste
                aparelho.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dados antigos que eventualmente estejam no armazenamento do navegador não são lidos, migrados nem
                apagados automaticamente. Preferências de aparência e sessão podem continuar salvas localmente.
              </p>
            </Cartao>
          ) : (
            <Cartao hover={false}>
              <p className="mb-1 flex items-center gap-2 text-sm font-bold text-sky-900 dark:text-sky-200">
                <Database className="h-4 w-4" /> Onde os dados ficam neste aparelho
              </p>
              <p className="mb-3 text-xs text-sky-800 dark:text-sky-300">
                {espaco.onde === 'IndexedDB'
                  ? 'Estão no armazenamento novo (IndexedDB), que tem espaço de sobra — o problema de “sem espaço” não volta.'
                  : espaco.onde === 'localStorage'
                    ? 'Ainda estão no armazenamento antigo, que é pequeno (cerca de 5 MB) e pode encher.'
                    : 'Nenhum dado guardado neste aparelho ainda.'}
              </p>

              {!espaco.localOk && !espaco.idbOk ? (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                  <b>Este navegador não está deixando salvar nada.</b> Isso acontece em janela anônima/privada ou com o
                  armazenamento bloqueado. Abra o sistema numa janela normal para os dados serem salvos.
                </div>
              ) : null}

              <div className="mb-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  Armazenamento antigo (localStorage): <b>{espaco.localOk ? 'funcionando' : 'bloqueado'}</b> ·{' '}
                  {tamanhoLegivel(espaco.bytesLocal)}
                </p>
                <p>
                  Armazenamento novo (IndexedDB): <b>{espaco.idbOk ? 'funcionando' : 'indisponível'}</b>
                </p>
                {espaco.ocupantes.length ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Maiores ocupantes: {espaco.ocupantes.map((o) => `${o.chave} (${tamanhoLegivel(o.bytes)})`).join(' · ')}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Botao
                  tamanho="sm"
                  variante="secundario"
                  icone={RefreshCw}
                  onClick={async () => {
                    await medir()
                  }}
                >
                  Testar de novo
                </Botao>
                {espaco.onde === 'localStorage' ? (
                  <Botao
                    tamanho="sm"
                    variante="secundario"
                    icone={RefreshCw}
                    onClick={async () => {
                      await liberarEspaco()
                      await medir()
                    }}
                  >
                    Liberar espaço
                  </Botao>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                “Liberar espaço” passa os dados para o armazenamento novo e tira a cópia antiga — nenhum pedido é
                apagado.
              </p>
            </Cartao>
          )}

          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
              <Sparkles className="h-4 w-4" /> Dados de teste
            </p>
            <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
              O sistema <b>começa vazio</b> — nada de exemplo é carregado sozinho. Se quiser treinar a equipe, carregue
              os exemplos abaixo: são <b>fictícios</b> (nomes “CLIENTE EXEMPLO”, telefones “(00) 90000-…”), não criam
              nenhuma conta de acesso e deixam um aviso amarelo no topo da tela enquanto estiverem lá. Antes de usar de
              verdade, use <b>Apagar todos os dados</b>.
              {nuvem ? ' Atenção: no modo nuvem isto afeta os dados de todos!' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao
                tamanho="sm"
                variante="secundario"
                icone={RefreshCw}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: 'Substituir tudo pelos dados de exemplo?',
                    mensagem:
                      'Pedidos, clientes, funcionários e impressões atuais serão apagados e substituídos por exemplos FICTÍCIOS. Os seus acessos de proprietário e as configurações são mantidos.',
                    textoBotao: 'Substituir',
                  })
                  if (ok) await carregarDemo()
                }}
              >
                Carregar demonstração
              </Botao>
              <Botao
                tamanho="sm"
                variante="perigo"
                icone={Trash2}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: 'Apagar todos os dados?',
                    mensagem:
                      'Pedidos, clientes, funcionários, arquivos e os outros acessos de proprietário serão apagados definitivamente. O seu acesso é mantido para você não perder a entrada no sistema.',
                    textoBotao: 'Apagar tudo',
                  })
                  if (ok) await resetarDados(usuario?.id)
                }}
              >
                Apagar todos os dados
              </Botao>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              As senhas nunca são guardadas em texto puro: fica só uma “impressão digital” (hash) de cada uma. Ao
              apagar os dados, <b>o seu acesso de proprietário é mantido</b> — assim você não fica trancado fora.
            </p>
          </Cartao>


          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
              <Upload className="h-4 w-4" /> Backup (cópia de segurança)
            </p>
            <p className="mb-3 text-xs text-emerald-800 dark:text-emerald-300">
              O plano grátis do Supabase <b>não faz backup automático</b>. O JSON salva o sistema completo; o CSV do
              relatório pode ser mesclado sem apagar pedidos que já estão no sistema.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Botao tamanho="sm" icone={Download} onClick={baixarBackup}>
                Baixar backup
              </Botao>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Upload className="h-4 w-4" />
                Restaurar backup
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const arquivo = e.target.files?.[0]
                    e.target.value = ''
                    if (!arquivo) return
                    try {
                      let conteudo: unknown
                      try {
                        conteudo = JSON.parse(await arquivo.text())
                      } catch {
                        throw new Error('Este arquivo não é um backup do sistema (não é um JSON válido).')
                      }
                      const previa = prepararBackup(conteudo, db.usuarios)
                      const semPessoas = previa.clientes.length === 0 && previa.vendedores.length === 0
                      const avisoSemPessoas = semPessoas
                        ? '\n\nATENÇÃO: este arquivo não contém clientes nem funcionários. Se você esperava recuperar pessoas antigas, cancele e confira se escolheu o backup certo.'
                        : ''
                      const ok = await confirmar({
                        titulo: 'Restaurar este backup?',
                        mensagem: `O arquivo contém ${previa.pedidos.length} pedidos, ${previa.clientes.length} clientes e ${previa.vendedores.length} funcionários. Os dados atuais serão substituídos por esses. Com a nuvem conectada, a troca vale para todos os aparelhos.${avisoSemPessoas}`,
                        textoBotao: 'Restaurar',
                      })
                      if (ok) await restaurarBackup(arquivo)
                    } catch (erro) {
                      avisar((erro as Error).message, 'erro')
                    }
                  }}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Upload className="h-4 w-4" />
                Mesclar relatório CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0]
                    e.target.value = ''
                    void importarRelatorioCSV(arquivo)
                  }}
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              O backup JSON inclui pedidos, clientes, funcionários, arquivos (links), configurações e acessos de proprietário.
              <b> Restaurar backup</b> substitui os dados atuais. Já <b>Mesclar relatório CSV</b> só acrescenta pedidos
              concluídos que ainda não existem; pedidos atuais, inclusive os registrados depois do relatório, ficam intactos. O relatório
              não traz contatos, artes, logins nem configurações — use o JSON para uma cópia completa. Fotos e artes enviadas
              continuam no Supabase Storage.
            </p>
          </Cartao>
        </div>
      ) : null}
      {/* -------------------------------- NUVEM ------------------------------- */}
      {aba === 'nuvem' ? <AbaNuvem /> : null}

      {/* ----------------------- FUNCIONÁRIOS E ACESSOS ------------------------ */}
      {aba === 'equipe' ? <Equipe embutido /> : null}

      {/* ------------------------------ APARÊNCIA ------------------------------ */}
      {aba === 'aparencia' ? (
        <div className="space-y-3">
          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Tema do sistema
            </p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Claro para o dia a dia, escuro para trabalhar com a luz baixa.
            </p>
            <div className="flex flex-wrap gap-2">
              {(['claro', 'escuro'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTema(t)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
                    tema === t
                      ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {t === 'claro' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {t === 'claro' ? 'Claro' : 'Escuro'}
                </button>
              ))}
            </div>
          </Cartao>

          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Rows4 className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Tamanho dos blocos
            </p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              <b>Compacto</b> deixa tudo mais junto (cabe bem mais coisa na tela de uma vez). <b>Confortável</b> dá mais
              respiro entre os blocos.
            </p>
            <div className="flex flex-wrap gap-2">
              {(['compacto', 'confortavel'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => definirDensidade(d)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
                    densidade === d
                      ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {d === 'compacto' ? <Rows4 className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
                  {LABEL_DENSIDADE[d]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{DESCRICAO_DENSIDADE[densidade]}</p>
          </Cartao>

          <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            A escolha vale só para este aparelho/navegador. O botão do topo da tela também troca o tamanho dos blocos —
            assim você compara na hora o que fica melhor no seu monitor.
          </p>
        </div>
      ) : null}

      {aba === 'acesso' ? (
        <div className="space-y-4">
          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <UserCog className="h-4 w-4 text-violet-600 dark:text-violet-400" /> Meus dados
            </p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Estes são os dados com que você entra no sistema. Use <b>Meu perfil</b> (no topo do canto direito) para
              trocar o seu nome de exibição.
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Etiqueta
                className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"
                icone={ShieldCheck}
              >
                Proprietário
              </Etiqueta>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                quem tem este acesso vê tudo e é o único que muda as comissões
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Campo label="Meu usuário" dica="Pode ser o e-mail que você já usa para entrar; não há um campo de e-mail separado. A alteração é salva no banco conectado.">
                <Entrada value={meuUsuario} onChange={(e) => setMeuUsuario(e.target.value)} autoCapitalize="none" autoCorrect="off" placeholder="Digite seu usuário" />
              </Campo>
              <Botao
                variante="secundario"
                icone={Save}
                carregando={salvando}
                disabled={!meuUsuario.trim() || meuUsuario === usuario?.usuario}
                onClick={async () => {
                  setSalvando(true)
                  try {
                    await trocarMeuUsuario(meuUsuario)
                  } catch (e) {
                    avisar((e as Error).message, 'erro')
                  } finally {
                    setSalvando(false)
                  }
                }}
              >
                Salvar usuário
              </Botao>
            </div>
          </Cartao>

          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <UsersRound className="h-4 w-4 text-violet-600 dark:text-violet-400" /> Outro acesso de proprietário
            </p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Quer um <b>segundo login de dono</b> (sócio, gerente, escritório, ou um acesso só para o celular)?
              Use <b>Funcionários e acessos → Novo acesso de proprietário</b>. Dá para ter quantos quiser; o sistema
              só não fica sem nenhum proprietário ativo.
            </p>
            <Botao variante="secundario" icone={UsersRound} onClick={() => setAba('equipe')}>
              Abrir Funcionários e acessos
            </Botao>
          </Cartao>

          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Trocar a minha senha
            </p>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              A senha fica guardada apenas como hash. Para redefinir a senha de outro proprietário, use{' '}
              <b>Funcionários e acessos</b>.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo label="Senha atual">
                <Entrada type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••" />
              </Campo>
              <Campo label="Nova senha">
                <Entrada type="password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} placeholder="••••••" />
              </Campo>
              <Campo label="Repita a nova">
                <Entrada type="password" value={senhaRepetida} onChange={(e) => setSenhaRepetida(e.target.value)} placeholder="••••••" />
              </Campo>
            </div>
            <Botao
              className="mt-3"
              icone={KeyRound}
              carregando={salvando}
              disabled={!senhaAtual || senhaNova.length < 4}
              onClick={async () => {
                if (senhaNova !== senhaRepetida) return avisar('As duas senhas novas precisam ser iguais.', 'erro')
                setSalvando(true)
                try {
                  await trocarMinhaSenha(senhaAtual, senhaNova)
                  setSenhaAtual('')
                  setSenhaNova('')
                  setSenhaRepetida('')
                } catch (e) {
                  avisar((e as Error).message, 'erro')
                } finally {
                  setSalvando(false)
                }
              }}
            >
              Trocar minha senha
            </Botao>
          </Cartao>

          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <UserCog className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Meu nome de exibição
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Campo label="Como o meu nome aparece no sistema">
                <Entrada value={meuNome} onChange={(e) => setMeuNome(e.target.value)} />
              </Campo>
              <Botao
                variante="secundario"
                icone={Save}
                carregando={salvando}
                disabled={!meuNome.trim() || meuNome === usuario?.nome}
                onClick={async () => {
                  setSalvando(true)
                  try {
                    await atualizarMeuPerfil({ nome: meuNome })
                  } finally {
                    setSalvando(false)
                  }
                }}
              >
                Salvar nome
              </Botao>
            </div>
          </Cartao>

          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-300 dark:text-slate-600">
            Sistema Altoprints · versão {VERSAO}
          </p>

          <p className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            <b>Quem pode mudar o quê:</b> as comissões e as permissões da equipe só aparecem aqui, para o proprietário.
            Esta tela e as Configurações são só do proprietário. A equipe usa o sistema sem login — nem pelo menu, nem
            digitando o endereço, ela chega aqui.
          </p>
        </div>
      ) : null}
      {dialog}
    </>
  )
}
