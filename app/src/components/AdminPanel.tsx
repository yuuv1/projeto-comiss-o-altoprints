import {
  BellRing,
  Calculator,
  Check,
  Cloud,
  Database,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Lock,
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
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { calcularComissao, normalizarFaixas, rotuloFaixa, validarFaixas } from '../lib/comissao'
import { dataBR, moeda, numeroBR } from '../lib/format'
import { gerarHashSenha, senhaConfere, TEM_SENHA } from '../lib/senha'
import { useStore } from '../lib/store'
import { FAIXAS_PADRAO, type FaixaComissao } from '../lib/types'
import { Botao, Campo, Entrada, Modal, Selecao, cn, useConfirmacao } from './ui'

/** fica desbloqueado enquanto a página estiver aberta (volta a pedir senha ao recarregar) */
let desbloqueadoNaSessao = false

type Aba = 'comissoes' | 'empresa' | 'ia' | 'dados' | 'seguranca'

export function AdminPanel({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { db, nuvem, salvarConfig, resetarDados, carregarDemo, avisar, nomeVendedor } = useStore()
  const { confirmar, dialog } = useConfirmacao()

  const [liberado, setLiberado] = useState(desbloqueadoNaSessao)
  const [aba, setAba] = useState<Aba>('comissoes')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const temSenha = TEM_SENHA(db.configuracoes.senha_admin_hash)

  const destravar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroSenha('')
    if (!temSenha) {
      // primeiro uso: cria a senha do painel
      if (senha.length < 4) return setErroSenha('Use uma senha com pelo menos 4 caracteres.')
      if (senha !== confirmarSenha) return setErroSenha('As duas senhas precisam ser iguais.')
      setSalvando(true)
      try {
        await salvarConfig({ senha_admin_hash: await gerarHashSenha(senha) })
        desbloqueadoNaSessao = true
        setLiberado(true)
        setSenha('')
        setConfirmarSenha('')
        avisar('Senha do painel criada! Guarde ela com você.')
      } finally {
        setSalvando(false)
      }
      return
    }
    setSalvando(true)
    try {
      if (await senhaConfere(senha, db.configuracoes.senha_admin_hash)) {
        desbloqueadoNaSessao = true
        setLiberado(true)
        setSenha('')
        avisar('Painel liberado.')
      } else {
        setErroSenha('Senha incorreta.')
      }
    } finally {
      setSalvando(false)
    }
  }

  const fechar = () => {
    setSenha('')
    setConfirmarSenha('')
    setErroSenha('')
    onFechar()
  }

  /* ----------------------------- comissões ----------------------------- */

  const [faixas, setFaixas] = useState<FaixaComissao[]>(db.configuracoes.faixas_comissao ?? FAIXAS_PADRAO)
  const [semMetragem, setSemMetragem] = useState(String(db.configuracoes.comissao_sem_metragem ?? 3))
  const problemas = useMemo(() => validarFaixas(faixas), [faixas])

  const pagosDoMes = useMemo(() => {
    const agora = new Date()
    const prefixo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
    return db.pedidos.filter((p) => {
      if (p.status_pagamento !== 'pago') return false
      const d = p.data_pagamento || (p.data_pedido || '').slice(0, 10)
      return d.startsWith(prefixo)
    })
  }, [db.pedidos])

  const previa = useMemo(
    () => calcularComissao(pagosDoMes, normalizarFaixas(faixas), Number(String(semMetragem).replace(',', '.')) || 0),
    [faixas, pagosDoMes, semMetragem],
  )

  const atualizarFaixa = (id: string, patch: Partial<FaixaComissao>) =>
    setFaixas((f) => f.map((faixa) => (faixa.id === id ? { ...faixa, ...patch } : faixa)))

  const salvarComissoes = async () => {
    if (problemas.length) {
      avisar(problemas[0], 'erro')
      return
    }
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

  /* ------------------------------ empresa ------------------------------ */

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
      avisar('Dados da empresa salvos!')
    } finally {
      setSalvando(false)
    }
  }

  /* ----------------------------- segurança ----------------------------- */

  const [novaSenha, setNovaSenha] = useState('')
  const [repetir, setRepetir] = useState('')

  const trocarSenha = async () => {
    if (novaSenha.length < 4) return avisar('A senha precisa ter pelo menos 4 caracteres.', 'erro')
    if (novaSenha !== repetir) return avisar('As duas senhas precisam ser iguais.', 'erro')
    await salvarConfig({ senha_admin_hash: await gerarHashSenha(novaSenha) })
    setNovaSenha('')
    setRepetir('')
    avisar('Senha do painel atualizada!')
  }

  const abas: { id: Aba; label: string; icone: typeof Percent }[] = [
    { id: 'comissoes', label: 'Comissões', icone: Percent },
    { id: 'empresa', label: 'Empresa', icone: ImageIcon },
    { id: 'ia', label: 'Comprovantes (IA)', icone: Sparkles },
    { id: 'dados', label: 'Dados', icone: Database },
    { id: 'seguranca', label: 'Senha', icone: ShieldCheck },
  ]

  return (
    <>
      <Modal
        aberto={aberto}
        onFechar={fechar}
        icone={liberado ? Settings : Lock}
        largura="max-w-3xl"
        titulo={liberado ? 'Painel do administrador' : temSenha ? 'Painel protegido por senha' : 'Criar a senha do painel'}
        subtitulo={
          liberado
            ? 'Regras de comissão, empresa, comprovantes e dados.'
            : temSenha
              ? 'Apenas o responsável tem acesso a estas configurações.'
              : 'Defina agora a senha que protege as configurações e as regras de comissão. Os vendedores usam o sistema normalmente, sem precisar dela.'
        }
        rodape={
          liberado ? (
            <>
              <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Lock className="h-3.5 w-3.5" /> O painel volta a pedir senha ao recarregar a página
              </span>
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
              {aba === 'seguranca' ? (
                <Botao icone={KeyRound} onClick={trocarSenha}>
                  Trocar senha
                </Botao>
              ) : null}
              <Botao variante="secundario" onClick={fechar}>
                Fechar
              </Botao>
            </>
          ) : null
        }
      >
        {!liberado ? (
          <form onSubmit={destravar} className="mx-auto max-w-sm py-2">
            <div className="mb-4 flex flex-col items-center gap-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft">
                <Lock className="h-7 w-7" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {temSenha
                  ? 'Digite a senha para acessar as configurações.'
                  : 'Esta senha é do chefe/administrador — ela bloqueia o acesso às regras de comissão.'}
              </p>
            </div>

            <Campo label={temSenha ? 'Senha' : 'Nova senha'}>
              <div className="relative">
                <Entrada
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoFocus
                  className="pr-11"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Campo>

            {!temSenha ? (
              <Campo label="Repita a senha" className="mt-3">
                <Entrada
                  type={mostrarSenha ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="••••••"
                />
              </Campo>
            ) : null}

            {erroSenha ? (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                {erroSenha}
              </p>
            ) : null}

            <Botao type="submit" className="mt-4 w-full" icone={Lock} carregando={salvando}>
              {temSenha ? 'Entrar no painel' : 'Criar senha e entrar'}
            </Botao>

            <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
              Esqueceu a senha? Veja no DEPLOY.md como zerar pelo Supabase.
            </p>
          </form>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-1 rounded-2xl border border-slate-100 bg-white p-1 shadow-soft dark:border-slate-800 dark:bg-slate-900">
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

            {/* ------------------------- COMISSÕES ------------------------- */}
            {aba === 'comissoes' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                  <b>Como funciona:</b> a comissão de cada pedido é calculada pela <b>metragem do pedido</b> — o
                  percentual da faixa em que ele cai é aplicado sobre o valor do pedido. Vale somente para pedidos com
                  pagamento confirmado.
                </div>

                <div>
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
                </div>

                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
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
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                    {problemas.map((p) => (
                      <p key={p} className="flex items-start gap-1.5">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Faixas válidas
                  </p>
                )}

                {/* prévia ao vivo */}
                <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    <Calculator className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Prévia com os pedidos pagos
                    deste mês
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
                              <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                                {numeroBR(l.percentual, 1)}%
                              </td>
                              <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">{l.pedidos}</td>
                              <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                                {numeroBR(l.metragem)} m
                              </td>
                              <td className="py-1.5 text-right text-slate-600 dark:text-slate-300">
                                {moeda(l.faturamento)}
                              </td>
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
                  <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                    Exemplo: {nomeVendedor(db.vendedores[0]?.id ?? '')} vendeu{' '}
                    {moeda(previa.base)} neste mês — a prévia acima já mostra quanto sai de comissão com as faixas
                    digitadas (mesmo antes de salvar).
                  </p>
                </div>
              </div>
            ) : null}

            {/* -------------------------- EMPRESA -------------------------- */}
            {aba === 'empresa' ? (
              <div className="space-y-4">
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
                        ? 'Os dados ficam no banco na nuvem e são iguais em todos os computadores.'
                        : 'Os dados estão salvos neste navegador. Para compartilhar entre computadores, configure o Supabase (veja DEPLOY.md).'}
                    </p>
                  </div>
                </div>

                <Campo label="Nome da empresa">
                  <Entrada value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} />
                </Campo>

                <Campo
                  label="Logo da empresa"
                  dica="PNG ou JPG pequeno (até 400 KB). Usada no cabeçalho e nos relatórios impressos."
                >
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
              </div>
            ) : null}

            {/* ----------------------------- IA ---------------------------- */}
            {aba === 'ia' ? (
              <div className="space-y-4">
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
                  A chave fica salva somente no banco do sistema (Supabase ou navegador do administrador) e é usada
                  para enviar a foto do comprovante à OpenAI, que devolve cliente, valor e data preenchidos no pedido.
                </p>
              </div>
            ) : null}

            {/* ---------------------------- DADOS -------------------------- */}
            {aba === 'dados' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
                  <p className="mb-1 flex items-center gap-2 text-sm font-bold text-sky-900 dark:text-sky-200">
                    <BellRing className="h-4 w-4" /> Revisão de pedidos
                  </p>
                  <p className="mb-3 text-xs text-sky-800 dark:text-sky-300">
                    O sistema abre uma janela de revisão a cada 3 dias com os pedidos que não estão "DTF pronto" e
                    "Pago" ao mesmo tempo. Você pode abrir essa revisão agora:
                  </p>
                  <Botao
                    tamanho="sm"
                    variante="secundario"
                    icone={BellRing}
                    onClick={async () => {
                      await salvarConfig({ revisao_ultima_em: null })
                      avisar('Abrindo a revisão de pedidos pendentes...')
                      fechar()
                    }}
                  >
                    Revisar pedidos incompletos agora
                  </Botao>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                    <Sparkles className="h-4 w-4" /> Dados de teste
                  </p>
                  <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
                    Carregue pedidos de exemplo para treinar a equipe, ou apague tudo para começar a usar de verdade.
                    {nuvem ? ' Atenção: no modo nuvem isto afeta os dados de todos os usuários!' : ''}
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
                          mensagem: 'Pedidos, clientes, vendedores e arquivos serão apagados definitivamente.',
                          textoBotao: 'Apagar tudo',
                        })
                        if (ok) await resetarDados()
                      }}
                    >
                      Apagar todos os dados
                    </Botao>
                  </div>
                </div>
              </div>
            ) : null}

            {/* -------------------------- SEGURANÇA ------------------------ */}
            {aba === 'seguranca' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="mb-1 flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Senha do painel ativa
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Última alteração no sistema: {dataBR(db.configuracoes.revisao_ultima_em)} · os vendedores continuam
                    usando o sistema sem senha; ela só protege este painel.
                  </p>
                </div>

                <Campo label="Nova senha">
                  <Entrada
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="••••••"
                  />
                </Campo>
                <Campo label="Repita a nova senha">
                  <Entrada
                    type="password"
                    value={repetir}
                    onChange={(e) => setRepetir(e.target.value)}
                    placeholder="••••••"
                  />
                </Campo>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <b>Importante:</b> o painel é um cadeado de uso diário — ele evita que os vendedores mexam nas regras
                  de comissão por engano. Como o sistema não tem login, quem entende de computador e tem o link pode
                  contornar. Se quiser proteção forte, o próximo passo é criar contas de usuário no Supabase (dá para
                  fazermos depois).
                </div>
              </div>
            ) : null}
          </>
        )}
      </Modal>
      {dialog}
    </>
  )
}

/** Botão de tema claro/escuro usado no cabeçalho */
export { Selecao }
