import {
  BellRing,
  Calculator,
  Check,
  Cloud,
  Database,
  Image as ImageIcon,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  UserCog,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { calcularComissao, normalizarFaixas, rotuloFaixa, validarFaixas } from '../lib/comissao'
import { dataBR, moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import {
  DESCRICAO_PERMISSAO,
  FAIXAS_PADRAO,
  LABEL_PERMISSAO,
  type FaixaComissao,
  type PermissaoVendedor,
} from '../lib/types'
import { Botao, Campo, Cartao, Entrada, TituloPagina, cn, useConfirmacao } from '../components/ui'

type Aba = 'comissoes' | 'permissoes' | 'empresa' | 'ia' | 'dados'

export default function Configuracoes() {
  const { db, nuvem, salvarConfig, resetarDados, carregarDemo, avisar } = useStore()
  const { confirmar, dialog } = useConfirmacao()
  const [aba, setAba] = useState<Aba>('comissoes')
  const [salvando, setSalvando] = useState(false)

  /* ------------------------------ comissões ------------------------------ */
  const [faixas, setFaixas] = useState<FaixaComissao[]>(db.configuracoes.faixas_comissao ?? FAIXAS_PADRAO)
  const [semMetragem, setSemMetragem] = useState(String(db.configuracoes.comissao_sem_metragem ?? 3))
  const problemas = useMemo(() => validarFaixas(faixas), [faixas])

  const pagosDoMes = useMemo(() => {
    const prefixo = new Date().toISOString().slice(0, 7)
    return db.pedidos.filter((p) => {
      if (p.status_pagamento !== 'pago') return false
      return (p.data_pagamento || (p.data_pedido || '').slice(0, 10)).startsWith(prefixo)
    })
  }, [db.pedidos])

  const previa = useMemo(
    () => calcularComissao(pagosDoMes, normalizarFaixas(faixas), Number(String(semMetragem).replace(',', '.')) || 0),
    [faixas, pagosDoMes, semMetragem],
  )

  const atualizarFaixa = (id: string, patch: Partial<FaixaComissao>) =>
    setFaixas((f) => f.map((faixa) => (faixa.id === id ? { ...faixa, ...patch } : faixa)))

  const salvarComissoes = async () => {
    if (problemas.length) return avisar(problemas[0], 'erro')
    setSalvando(true)
    try {
      await salvarConfig({
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
    { id: 'permissoes', label: 'Permissões', icone: UserCog },
    { id: 'empresa', label: 'Empresa', icone: ImageIcon },
    { id: 'ia', label: 'Comprovantes (IA)', icone: Sparkles },
    { id: 'dados', label: 'Dados', icone: Database },
  ]

  return (
    <>
      <TituloPagina
        icone={Settings}
        titulo="Configurações"
        subtitulo="Regras de comissão, permissões da equipe, empresa e dados. Só o proprietário acessa."
        acoes={
          <>
            {aba === 'comissoes' ? (
              <Botao icone={Save} onClick={salvarComissoes} carregando={salvando} disabled={problemas.length > 0}>
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

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-2xl border border-slate-100 bg-white p-1 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {abas.map(({ id, label, icone: Icone }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
              aba === id
                ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <Icone className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ------------------------------ COMISSÕES ------------------------------ */}
      {aba === 'comissoes' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            <b>Como funciona:</b> a comissão de cada pedido é calculada pela <b>metragem do pedido</b> — o percentual
            da faixa em que ele cai é aplicado sobre o valor do pedido. Vale somente para pedidos com pagamento
            confirmado.
          </div>

          <Cartao hover={false}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Faixas de metragem</p>
              <Botao
                tamanho="sm"
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
                Adicionar faixa
              </Botao>
            </div>

            <div className="space-y-2">
              {[...faixas]
                .sort((a, b) => a.de - b.de)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <Campo label="De (m)" className="w-24">
                      <Entrada type="number" min={1} value={f.de} onChange={(e) => atualizarFaixa(f.id, { de: Number(e.target.value) })} />
                    </Campo>
                    <Campo label="Até (m)" className="w-24">
                      <Entrada
                        type="number"
                        min={1}
                        value={f.ate ?? ''}
                        placeholder="sem limite"
                        onChange={(e) => atualizarFaixa(f.id, { ate: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </Campo>
                    <Campo label="Comissão (%)" className="w-28">
                      <Entrada
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={f.percentual}
                        onChange={(e) => atualizarFaixa(f.id, { percentual: Number(e.target.value) })}
                      />
                    </Campo>
                    <div className="flex-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {rotuloFaixa(f.de, f.ate)} → {numeroBR(f.percentual, f.percentual % 1 === 0 ? 0 : 1)}%
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
                className="w-64"
                dica="Usado quando o pedido não tem metragem informada."
              >
                <Entrada
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={semMetragem}
                  onChange={(e) => setSemMetragem(e.target.value)}
                />
              </Campo>
              <Botao
                variante="secundario"
                icone={RefreshCw}
                onClick={() => {
                  setFaixas(FAIXAS_PADRAO)
                  setSemMetragem('3')
                }}
              >
                Restaurar padrão
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
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Faixas válidas
              </p>
            )}
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
                        <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">{numeroBR(l.percentual, 1)}%</td>
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

      {/* ----------------------------- PERMISSÕES ----------------------------- */}
      {aba === 'permissoes' ? (
        <Cartao hover={false}>
          <p className="mb-1 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
            <UserCog className="h-4 w-4 text-purple-600 dark:text-purple-400" /> O que o vendedor pode fazer com os
            pedidos dele
          </p>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Vale para todas as contas de vendedor. O proprietário sempre pode tudo.
          </p>

          <div className="space-y-2">
            {(Object.keys(LABEL_PERMISSAO) as PermissaoVendedor[]).map((chave) => {
              const ativa = db.configuracoes.permissao_vendedor === chave
              return (
                <button
                  key={chave}
                  onClick={async () => {
                    await salvarConfig({ permissao_vendedor: chave })
                    avisar(`Permissão atualizada: ${LABEL_PERMISSAO[chave].toLowerCase()}.`)
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition',
                    ativa
                      ? 'border-purple-300 bg-purple-50 shadow-soft dark:border-purple-700 dark:bg-purple-950/40'
                      : 'border-slate-100 bg-white hover:border-purple-200 dark:border-slate-800 dark:bg-slate-900',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                      ativa ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 dark:border-slate-600',
                    )}
                  >
                    {ativa ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                      {LABEL_PERMISSAO[chave]}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {DESCRICAO_PERMISSAO[chave]}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            Independente desta escolha, o vendedor <b>sempre</b> vê somente os próprios pedidos, não acessa relatórios
            financeiros e não mexe em configurações.
          </p>
        </Cartao>
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
              <p className="font-bold">{nuvem ? 'Banco na nuvem (Supabase) conectado' : 'Modo local (navegador)'}</p>
              <p className="text-xs">
                {nuvem
                  ? 'Os dados ficam no banco na nuvem e são iguais em todos os aparelhos.'
                  : 'Atenção: no modo local cada navegador tem os seus próprios dados e logins. Para a equipe toda usar junto, configure o Supabase (veja SUPABASE.md).'}
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
          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-sky-900 dark:text-sky-200">
              <BellRing className="h-4 w-4" /> Revisão de pedidos
            </p>
            <p className="mb-3 text-xs text-sky-800 dark:text-sky-300">
              O sistema abre uma janela de revisão a cada 3 dias com os pedidos que não estão "DTF pronto" e "Pago" ao
              mesmo tempo. Última revisão: {dataBR(db.configuracoes.revisao_ultima_em)}.
            </p>
            <Botao
              tamanho="sm"
              variante="secundario"
              icone={BellRing}
              onClick={async () => {
                await salvarConfig({ revisao_ultima_em: null })
                avisar('A revisão vai abrir na próxima tela.')
              }}
            >
              Revisar pedidos incompletos agora
            </Botao>
          </Cartao>

          <Cartao hover={false}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
              <Sparkles className="h-4 w-4" /> Dados de teste
            </p>
            <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
              Carregue pedidos de exemplo para treinar a equipe ou apague tudo para começar de verdade.
              {nuvem ? ' Atenção: no modo nuvem isto afeta os dados de todos!' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao
                tamanho="sm"
                variante="secundario"
                icone={RefreshCw}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: 'Substituir tudo pelos dados de demonstração?',
                    mensagem: 'Pedidos, clientes e vendedores atuais serão apagados e substituídos por exemplos.',
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
                      'Pedidos, clientes, vendedores, arquivos e contas de acesso serão apagados definitivamente.',
                    textoBotao: 'Apagar tudo',
                  })
                  if (ok) await resetarDados()
                }}
              >
                Apagar todos os dados
              </Botao>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              As senhas nunca são guardadas em texto puro: fica só uma “impressão digital” (hash) de cada uma.
            </p>
          </Cartao>
        </div>
      ) : null}
      {dialog}
    </>
  )
}
