import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Download,
  FileText,
  Image as ImageIcon,
  Package,
  PackageCheck,
  Paperclip,
  Pencil,
  Plus,
  Save,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Truck,
  Wallet,
  Wand2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AreaTexto,
  Botao,
  Campo,
  Cartao,
  Entrada,
  Etiqueta,
  Selecao,
  TituloPagina,
  cn,
  useConfirmacao,
} from '../components/ui'
import { arquivoEhImagem, baixarArquivo, tamanhoLegivel, urlDoArquivo } from '../lib/files'
import { calcularComissao } from '../lib/comissao'
import { dataBR, hojeISO, moeda, metros, numeroBR, paraInputDate, paraInputDateTime } from '../lib/format'
import { calcularValor, faixaRotulo, precoMetro } from '../lib/pricing'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import {
  ESTADOS,
  ESTAGIOS_FILA,
  FORMAS_PAGAMENTO,
  LABEL_ENTREGA,
  LABEL_ESTAGIO,
  pedidoVazio,
  telasDoUsuario,
  type Arquivo,
  type Pedido,
} from '../lib/types'
import { EtiquetaEntrega, EtiquetaEstagio, EtiquetaPago } from '../components/StatusBadges'

/* ------------------------------ arquivos ------------------------------ */

function LinhaArquivo({
  arquivo,
  onExcluir,
}: {
  arquivo: Arquivo
  onExcluir: (a: Arquivo) => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    let criado: string | null = null
    urlDoArquivo(arquivo).then((u) => {
      if (!vivo) return
      if (u?.startsWith('blob:')) criado = u
      setUrl(u)
    })
    return () => {
      vivo = false
      if (criado) URL.revokeObjectURL(criado)
    }
  }, [arquivo])

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
        {arquivoEhImagem(arquivo) && url ? (
          <img src={url} alt={arquivo.nome} className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-5 w-5 text-purple-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-700">{arquivo.nome}</p>
        <p className="text-[11px] text-slate-400">
          {tamanhoLegivel(arquivo.tamanho)} • {dataBR(arquivo.created_at)}
        </p>
      </div>
      <Botao tamanho="sm" variante="secundario" icone={Download} onClick={() => baixarArquivo(arquivo)}>
        Baixar
      </Botao>
      <Botao
        tamanho="sm"
        variante="ghost"
        className="text-rose-500 hover:bg-rose-50"
        icone={Trash2}
        onClick={() => onExcluir(arquivo)}
      >
        Excluir
      </Botao>
    </div>
  )
}

/* -------------------------------- página ------------------------------- */

export default function PedidoForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const { db, salvarPedido, excluirPedido, excluirArquivoDoPedido, avisar, nomeVendedor } = useStore()
  const { usuario, ehProprietario, vendedorNome } = useAuth()
  const { confirmar, dialog } = useConfirmacao()
  const novo = !id
  const existente = useMemo(() => db.pedidos.find((p) => p.id === id), [db.pedidos, id])

  const permissao = db.configuracoes.permissao_vendedor
  /** o vendedor só mexe no que é dele, e conforme a permissão definida pelo dono */
  const pedidoDeOutro = Boolean(existente) && !ehProprietario && existente?.vendedor_id !== usuario?.vendedor_id
  const somenteLeitura =
    pedidoDeOutro || (!ehProprietario && Boolean(existente) && permissao === 'somente_criar')
  const podeExcluir = ehProprietario || (!pedidoDeOutro && permissao === 'total')

  const [form, setForm] = useState<Omit<Pedido, 'id'>>(() => ({ ...pedidoVazio() }))
  const [metragemTxt, setMetragemTxt] = useState('')
  const [valorTxt, setValorTxt] = useState('')
  const [arquivosNovos, setArquivosNovos] = useState<File[]>([])
  const [salvando, setSalvando] = useState(false)
  const [lendoComprovante, setLendoComprovante] = useState(false)
  /**
   * O formulário mostra só o essencial. Datas, observações, entrega e
   * comprovante ficam em "Mais opções" — e abrem sozinhos quando o pedido já
   * tem algum desses dados preenchidos.
   */
  const [extrasAberto, setExtrasAberto] = useState(false)
  const inputArquivos = useRef<HTMLInputElement>(null)
  const inputComprovante = useRef<HTMLInputElement>(null)

  // carrega os dados quando abre um pedido existente (uma vez por pedido)
  const carregado = useRef<string | null>(null)
  useEffect(() => {
    const chave = existente?.id ?? 'novo'
    if (carregado.current === chave) return
    carregado.current = chave
    if (existente) {
      const { id: _id, ...resto } = existente
      setForm(resto)
      setMetragemTxt(existente.metragem ? String(existente.metragem) : '')
      setValorTxt(String(existente.valor ?? ''))
    } else if (novo) {
      setForm({
        ...pedidoVazio(),
        vendedor_id: params.get('vendedor') ?? usuario?.vendedor_id ?? '',
      })
      setMetragemTxt('')
      setValorTxt('')
    }
  }, [existente, novo, params])

  const set = (patch: Partial<Omit<Pedido, 'id'>>) => setForm((f) => ({ ...f, ...patch }))

  const clienteVinculado = useMemo(
    () => db.clientes.find((c) => c.nome.trim().toLowerCase() === form.cliente_nome.trim().toLowerCase()),
    [db.clientes, form.cliente_nome],
  )
  const valorEspecial = clienteVinculado?.valor_especial_metro ?? null
  const metrosNum = Number(String(metragemTxt).replace(',', '.')) || 0
  /** tabela de preços do proprietário (Configurações → Preços) */
  const faixasPreco = db.configuracoes.faixas_preco
  const valorAuto = calcularValor(metrosNum, valorEspecial, faixasPreco)
  const valorFinal = form.valor_modo === 'auto' ? valorAuto : Number(String(valorTxt).replace(',', '.')) || 0
  const precoAtual = valorEspecial && valorEspecial > 0 ? valorEspecial : precoMetro(metrosNum, faixasPreco)
  const faixasComissao = db.configuracoes.faixas_comissao ?? []
  const percentualComissao = useMemo(() => {
    const exemplo = calcularComissao(
      [{ metragem: metrosNum, valor: valorFinal } as Pedido],
      faixasComissao,
      db.configuracoes.comissao_sem_metragem ?? 0,
    )
    return exemplo.percentualMedio
  }, [db.configuracoes.comissao_sem_metragem, faixasComissao, metrosNum, valorFinal])

  const arquivosDoPedido = useMemo(
    () => db.arquivos.filter((a) => a.pedido_id === existente?.id),
    [db.arquivos, existente?.id],
  )

  /** o pedido já tem dados de entrega/observação? então as opções abrem abertas */
  const temDadosExtras = Boolean(
    existente &&
      (existente.endereco ||
        existente.codigo_rastreio ||
        existente.retirado_por ||
        existente.observacoes ||
        existente.data_envio ||
        existente.data_entrega),
  )
  const mostrarExtras = extrasAberto || temDadosExtras

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await salvarPedido(
        { ...form, metragem: metrosNum || null, valor: valorFinal },
        existente?.id,
        arquivosNovos,
      )
      setArquivosNovos([])
      navegar('/pedidos')
    } catch (err) {
      avisar((err as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!existente) return
    const ok = await confirmar({
      titulo: `Excluir o pedido #${existente.numero}?`,
      mensagem: 'O pedido e os arquivos de arte serão apagados definitivamente.',
    })
    if (ok) {
      await excluirPedido(existente.id)
      navegar('/pedidos')
    }
  }

  /* --------------------- leitura de comprovante com IA -------------------- */

  const lerComprovante = async (file: File) => {
    const chave = db.configuracoes.openai_key?.trim()
    if (!chave) {
      avisar('Configure a chave da IA em Configurações para usar o leitor de comprovantes.', 'erro')
      return
    }
    setLendoComprovante(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader()
        leitor.onload = () => resolve(String(leitor.result))
        leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
        leitor.readAsDataURL(file)
      })

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Você lê comprovantes de pagamento brasileiros (Pix, cartão, transferência). Responda SOMENTE com JSON no formato {"cliente": string, "valor": number, "data": "YYYY-MM-DD", "forma_pagamento": string}. Se não encontrar um campo, use string vazia ou 0.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extraia o nome do pagador, o valor, a data e a forma de pagamento.' },
                { type: 'image_url', image_url: { url: base64 } },
              ],
            },
          ],
        }),
      })

      if (!resp.ok) throw new Error(`A IA respondeu com erro (${resp.status}). Confira a chave configurada.`)
      const dados = await resp.json()
      const texto = dados?.choices?.[0]?.message?.content ?? '{}'
      const info = JSON.parse(texto) as { cliente?: string; valor?: number; data?: string; forma_pagamento?: string }

      set({
        cliente_nome: info.cliente?.trim() || form.cliente_nome,
        pago: true,
        data_pagamento: info.data || hojeISO(),
        forma_pagamento: info.forma_pagamento || form.forma_pagamento,
      })
      if (info.valor) {
        setValorTxt(String(info.valor))
        set({ valor_modo: 'manual' })
      }
      avisar('Comprovante lido! Confira os dados antes de salvar.')
    } catch (err) {
      avisar(`Não foi possível ler o comprovante: ${(err as Error).message}`, 'erro')
    } finally {
      setLendoComprovante(false)
    }
  }

  const bloquear = (conteudo: React.ReactNode) => (somenteLeitura ? <fieldset disabled>{conteudo}</fieldset> : conteudo)

  return (
    <form onSubmit={enviar}>
      <TituloPagina
        icone={Package}
        titulo={existente ? `Pedido #${existente.numero}` : 'Novo pedido'}
        subtitulo={
          existente
            ? `Criado em ${dataBR(existente.created_at)} • ${nomeVendedor(existente.vendedor_id)}`
            : 'O número do pedido é gerado automaticamente.'
        }
        acoes={
          <>
            <Botao variante="secundario" icone={ArrowLeft} onClick={() => navegar(-1)} type="button">
              Voltar
            </Botao>
            {existente && podeExcluir ? (
              <Botao variante="perigo" icone={Trash2} onClick={excluir} type="button">
                Excluir
              </Botao>
            ) : null}
            {!somenteLeitura ? (
              <Botao icone={Save} type="submit" carregando={salvando}>
                {existente ? 'Salvar alterações' : 'Criar pedido'}
              </Botao>
            ) : null}
          </>
        }
      />

      {somenteLeitura ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {pedidoDeOutro
              ? 'Este pedido é de outro vendedor — você pode visualizar, mas não alterar.'
              : 'O proprietário definiu que os vendedores podem apenas criar pedidos. Peça o ajuste ao proprietário.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ------------------------- coluna principal ------------------------ */}
        <div className="space-y-4 lg:col-span-2">
          <Cartao>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
                <Pencil className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Dados do pedido
              </h3>
              <button
                type="button"
                onClick={() => setExtrasAberto((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 transition hover:border-purple-200 hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-300"
                title="Datas, observações, entrega e comprovante"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {mostrarExtras ? 'Menos opções' : 'Mais opções'}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                label="Cliente"
                obrigatorio
                dica={
                  clienteVinculado
                    ? `Cliente cadastrado${valorEspecial ? ` • valor especial de ${moeda(valorEspecial)}/m` : ''}`
                    : form.cliente_nome.trim()
                      ? 'Nome novo: o cliente será cadastrado junto com a fila.'
                      : 'Escolha um cliente da lista ou escreva um nome novo.'
                }
                className="sm:col-span-2"
              >
                <Entrada
                  value={form.cliente_nome}
                  onChange={(e) => set({ cliente_nome: e.target.value })}
                  placeholder="Nome do cliente"
                  list="lista-clientes"
                  required
                />
                <datalist id="lista-clientes">
                  {db.clientes.map((c) => (
                    <option key={c.id} value={c.nome} />
                  ))}
                </datalist>
              </Campo>

              <Campo
                label="Vendedor responsável"
                obrigatorio
                dica={ehProprietario ? undefined : 'Você só pode lançar pedidos no seu próprio nome.'}
              >
                {ehProprietario ? (
                  <Selecao
                    value={form.vendedor_id}
                    onChange={(e) => set({ vendedor_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione o vendedor</option>
                    {db.vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </Selecao>
                ) : (
                  <Entrada value={vendedorNome} readOnly className="bg-slate-50 dark:bg-slate-800" />
                )}
              </Campo>

              <Campo label="Data da fila" dica="Já vem com o dia de hoje.">
                <Entrada
                  type="date"
                  value={paraInputDate(form.data_pedido)}
                  onChange={(e) =>
                    set({ data_pedido: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : form.data_pedido })
                  }
                />
              </Campo>

              <Campo label="Descrição" className="sm:col-span-2">
                <AreaTexto
                  value={form.descricao}
                  onChange={(e) => set({ descricao: e.target.value })}
                  placeholder="Ex.: 755+220, arte frente e costas..."
                />
              </Campo>

              <Campo
                label="Metragem (metros)"
                dica={
                  metrosNum > 0
                    ? `Faixa: ${
                        precoAtual === valorEspecial
                          ? 'valor especial do cliente'
                          : faixaRotulo(metrosNum, faixasPreco)
                      } (${moeda(precoAtual)}/m)`
                    : `Tabela do proprietário: ${(faixasPreco ?? []).map((f) => `${f.rotulo} ${moeda(f.valor)}`).join(' • ')}`
                }
              >
                <Entrada
                  value={metragemTxt}
                  onChange={(e) => setMetragemTxt(e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </Campo>

              <Campo label="Valor do pedido">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      R$
                    </span>
                    <Entrada
                      className="pl-10"
                      value={form.valor_modo === 'auto' ? valorAuto.toFixed(2).replace('.', ',') : valorTxt}
                      onChange={(e) => {
                        setValorTxt(e.target.value.replace(/[^\d.,]/g, ''))
                        set({ valor_modo: 'manual' })
                      }}
                      readOnly={form.valor_modo === 'auto'}
                      inputMode="decimal"
                    />
                  </div>
                  <Botao
                    type="button"
                    variante={form.valor_modo === 'auto' ? 'primario' : 'secundario'}
                    icone={Calculator}
                    onClick={() => set({ valor_modo: form.valor_modo === 'auto' ? 'manual' : 'auto' })}
                    title="Alternar entre valor automático e manual"
                  >
                    {form.valor_modo === 'auto' ? 'Auto' : 'Manual'}
                  </Botao>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {form.valor_modo === 'auto'
                    ? `${metrosNum || 0} m × ${moeda(precoAtual)} = ${moeda(valorAuto)}`
                    : 'Valor digitado manualmente pelo vendedor.'}
                </p>
              </Campo>

              <Campo
                label="Estágio da fila"
                dica="Em andamento enquanto está na máquina; concluído quando já saiu."
              >
                <div className="flex gap-2">
                  {ESTAGIOS_FILA.map((e) => (
                    <button
                      type="button"
                      key={e}
                      onClick={() => set({ estagio: e })}
                      className={cn(
                        'h-10 flex-1 rounded-xl border text-sm font-bold transition',
                        form.estagio === e
                          ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      )}
                    >
                      {LABEL_ESTAGIO[e]}
                    </button>
                  ))}
                </div>
              </Campo>

              <Campo label="Entregue ao cliente?" dica="Opcional — não entra no relatório.">
                <button
                  type="button"
                  onClick={() => set({ entregue: !form.entregue })}
                  className={cn(
                    'h-10 w-full rounded-xl border text-sm font-bold transition',
                    form.entregue
                      ? 'border-transparent bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-soft'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {form.entregue ? 'Entregue' : 'Ainda não entregue'}
                </button>
              </Campo>

              {mostrarExtras ? (
                <>
                  <Campo label="Pagamento" dica="Opcional — não é etapa da fila.">
                    <button
                      type="button"
                      onClick={() => set({ pago: !form.pago, data_pagamento: !form.pago ? hojeISO() : null })}
                      className={cn(
                        'h-10 w-full rounded-xl border text-sm font-bold transition',
                        form.pago
                          ? 'border-transparent bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-soft'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      )}
                    >
                      {form.pago ? 'Já foi pago' : 'Ainda não pago'}
                    </button>
                  </Campo>

                  <Campo label="Forma de pagamento">
                    <Selecao value={form.forma_pagamento} onChange={(e) => set({ forma_pagamento: e.target.value })}>
                      <option value="">Não informada</option>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </Selecao>
                  </Campo>

                  <Campo
                    label="Data do pagamento"
                    dica={form.pago ? 'Preenchida com hoje ao marcar como pago.' : undefined}
                  >
                    <Entrada
                      type="date"
                      value={paraInputDate(form.data_pagamento)}
                      onChange={(e) => set({ data_pagamento: e.target.value || null })}
                    />
                  </Campo>

                  <Campo label="Observações" className="sm:col-span-2">
                    <AreaTexto
                      value={form.observacoes}
                      onChange={(e) => set({ observacoes: e.target.value })}
                      placeholder="Alguma observação importante sobre este pedido..."
                    />
                  </Campo>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400 sm:col-span-2 dark:border-slate-700">
                  Forma de pagamento, datas, observações, entrega e comprovante ficam em “Mais opções”, no topo
                  deste cartão.
                </p>
              )}
            </div>
          </Cartao>

          {/* ------------------------------ artes ----------------------------- */}
          <Cartao>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-800">
                <Paperclip className="h-4 w-4 text-purple-600" /> Arquivos de arte
              </h3>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={inputArquivos}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const lista = Array.from(e.target.files ?? [])
                    setArquivosNovos((a) => [...a, ...lista])
                    e.target.value = ''
                  }}
                />
                <Botao
                  type="button"
                  variante="secundario"
                  icone={Plus}
                  onClick={() => inputArquivos.current?.click()}
                >
                  Adicionar arquivos
                </Botao>
              </div>
            </div>

            {arquivosNovos.length ? (
              <div className="mb-3 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                  Arquivos novos (serão salvos ao gravar o pedido)
                </p>
                {arquivosNovos.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-2.5"
                  >
                    <ImageIcon className="h-5 w-5 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{f.name}</p>
                      <p className="text-[11px] text-slate-400">{tamanhoLegivel(f.size)}</p>
                    </div>
                    <Botao
                      type="button"
                      tamanho="sm"
                      variante="ghost"
                      icone={X}
                      onClick={() => setArquivosNovos((a) => a.filter((_, j) => j !== i))}
                    >
                      Remover
                    </Botao>
                  </div>
                ))}
              </div>
            ) : null}

            {existente && arquivosDoPedido.length ? (
              <div className="space-y-2">
                {arquivosDoPedido.map((a) => (
                  <LinhaArquivo
                    key={a.id}
                    arquivo={a}
                    onExcluir={async (arq) => {
                      const ok = await confirmar({
                        titulo: 'Excluir este arquivo?',
                        mensagem: arq.nome,
                        textoBotao: 'Excluir arquivo',
                      })
                      if (ok) await excluirArquivoDoPedido(arq)
                    }}
                  />
                ))}
              </div>
            ) : !arquivosNovos.length ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
                Nenhum arquivo enviado. Aceita imagens e PDF.
              </p>
            ) : null}
          </Cartao>

        </div>

        {/* --------------------------- coluna lateral ------------------------- */}
        <div className="space-y-4">
          <Cartao>
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-800">
              <Calculator className="h-4 w-4 text-purple-600" /> Resumo
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cliente</span>
                <span className="font-semibold text-slate-800">{form.cliente_nome || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vendedor</span>
                <span className="font-semibold text-slate-800">{nomeVendedor(form.vendedor_id)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Metragem</span>
                <span className="font-semibold text-slate-800">{metros(metrosNum)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Valor do metro</span>
                <span className="font-semibold text-slate-800">{moeda(precoAtual)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                <span className="font-bold text-slate-600 dark:text-slate-300">Total</span>
                <span className="text-xl font-black text-emerald-600">{moeda(valorFinal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Comissão ({numeroBR(percentualComissao, 1)}%)</span>
                <span className="font-semibold text-amber-600">
                  {moeda(valorFinal * (percentualComissao / 100))}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <EtiquetaEstagio status={form.estagio} />
                <EtiquetaEntrega entregue={form.entregue} />
                <EtiquetaPago pago={form.pago} />
              </div>
            </div>
          </Cartao>

          {/* etapas da fila */}
          <Cartao>
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
              <Wand2 className="h-4 w-4 text-purple-600" /> Etapas da fila
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {ESTAGIOS_FILA.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => set({ estagio: e })}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide transition',
                    form.estagio === e
                      ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-purple-200 hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {LABEL_ESTAGIO[e]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set({ entregue: !form.entregue })}
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide transition',
                form.entregue
                  ? 'border-transparent bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-soft'
                  : 'border-slate-200 bg-white text-slate-400 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800',
              )}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              {form.entregue ? 'Entregue' : 'Marcar entregue'}
            </button>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              A fila nasce <b>em andamento</b> e sai da fila de impressão quando você marcar <b>concluído</b>.
              “Entregue” é só um aviso de que o cliente já recebeu.
            </p>
          </Cartao>

          {mostrarExtras ? (
            <>
          {/* importar comprovante */}
          <Cartao>
            <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-800">
              <Sparkles className="h-4 w-4 text-purple-600" /> Importar comprovante
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              Envie a foto do comprovante e a IA preenche cliente, valor e data para você conferir.
            </p>
            <input
              ref={inputComprovante}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void lerComprovante(f)
                e.target.value = ''
              }}
            />
            <Botao
              type="button"
              variante="secundario"
              icone={ScanLine}
              carregando={lendoComprovante}
              onClick={() => inputComprovante.current?.click()}
            >
              Enviar comprovante
            </Botao>
            {!db.configuracoes.openai_key ? (
              <p className="mt-2 text-[11px] text-slate-400">
                Precisa da chave da IA configurada em ⚙️ Configurações.
              </p>
            ) : null}
          </Cartao>

          {/* entrega */}
          <Cartao>
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-800">
              <Truck className="h-4 w-4 text-purple-600" /> Entrega
            </h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(['retirada', 'correios'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => set({ tipo_entrega: t })}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm font-bold transition',
                    form.tipo_entrega === t
                      ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200',
                  )}
                >
                  {LABEL_ENTREGA[t]}
                </button>
              ))}
            </div>

            {form.tipo_entrega === 'correios' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo label="Endereço" className="sm:col-span-2">
                  <Entrada value={form.endereco} onChange={(e) => set({ endereco: e.target.value })} />
                </Campo>
                <Campo label="Cidade">
                  <Entrada value={form.cidade} onChange={(e) => set({ cidade: e.target.value })} />
                </Campo>
                <Campo label="Estado">
                  <Selecao value={form.estado} onChange={(e) => set({ estado: e.target.value })}>
                    <option value="">UF</option>
                    {ESTADOS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </Selecao>
                </Campo>
                <Campo label="CEP">
                  <Entrada value={form.cep} onChange={(e) => set({ cep: e.target.value })} />
                </Campo>
                <Campo label="Código de rastreio">
                  <Entrada
                    value={form.codigo_rastreio}
                    onChange={(e) => set({ codigo_rastreio: e.target.value })}
                    placeholder="AA123456789BR"
                  />
                </Campo>
                <Campo label="Data de envio">
                  <Entrada
                    type="date"
                    value={paraInputDate(form.data_envio)}
                    onChange={(e) => set({ data_envio: e.target.value || null })}
                  />
                </Campo>
                <Campo label="Data de entrega">
                  <Entrada
                    type="date"
                    value={paraInputDate(form.data_entrega)}
                    onChange={(e) => set({ data_entrega: e.target.value || null })}
                  />
                </Campo>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo label="Retirado por">
                  <Entrada
                    value={form.retirado_por}
                    onChange={(e) => set({ retirado_por: e.target.value })}
                    placeholder="Nome de quem retirou"
                  />
                </Campo>
                <Campo label="Data da retirada">
                  <Entrada
                    type="date"
                    value={paraInputDate(form.data_retirada)}
                    onChange={(e) => set({ data_retirada: e.target.value || null })}
                  />
                </Campo>
              </div>
            )}
          </Cartao>
            </>
          ) : null}

          <Cartao>
            <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-800">
              <Wallet className="h-4 w-4 text-purple-600" /> Pagamento
            </h3>
            <div className="space-y-1.5 text-xs text-slate-500">
              <p>Ao marcar como <b>Pago</b>, a data é preenchida com hoje automaticamente.</p>
              <p>É só uma marcação de controle — não muda o estágio da fila.</p>
              <div className="pt-1">
                <Etiqueta className="border-slate-200 bg-slate-50 text-slate-600">
                  {form.forma_pagamento || 'forma não informada'}
                </Etiqueta>
              </div>
            </div>
          </Cartao>
        </div>
      </div>

      <div className="sticky bottom-3 z-30 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-hover backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="text-sm">
          <span className="text-slate-500 dark:text-slate-400">Total do pedido: </span>
          <span className="text-xl font-black text-emerald-600">{moeda(valorFinal)}</span>
        </div>
        <div className="flex gap-2">
          <Botao variante="secundario" type="button" onClick={() => navegar('/pedidos')}>
            {somenteLeitura ? 'Voltar' : 'Cancelar'}
          </Botao>
          {!somenteLeitura ? (
            <Botao icone={Save} type="submit" carregando={salvando}>
              {existente ? 'Salvar alterações' : 'Criar pedido'}
            </Botao>
          ) : null}
        </div>
      </div>

      {dialog}
    </form>
  )
}
