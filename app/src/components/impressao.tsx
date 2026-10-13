import { Check, PrinterCheck, RotateCcw, Ruler, TriangleAlert, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import { type Impressao, MOTIVOS_REIMPRESSAO, type Pedido, type TipoImpressao } from '../lib/types'
import { AreaTexto, Botao, Campo, Entrada, Modal, Selecao, cn } from './ui'

/**
 * Janela de registrar impressão: ao marcar "impresso" a pessoa confirma os
 * metros que saíram, quem imprimiu, a arte usada e — quando for o caso —
 * registra a reimpressão com o motivo.
 */
export function useRegistrarImpressao() {
  const { db, avisar, nomeVendedor, registrarImpressao } = useStore()
  const { usuario } = useAuth()

  const [alvo, setAlvo] = useState<Pedido | null>(null)
  const [tipo, setTipo] = useState<TipoImpressao>('impressao')
  const [metros, setMetros] = useState('')
  const [quem, setQuem] = useState('')
  const [arquivoId, setArquivoId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const arquivos = useMemo(
    () => (alvo ? db.arquivos.filter((a) => a.pedido_id === alvo.id) : []),
    [alvo, db.arquivos],
  )

  /** sugestões de quem imprimiu: o próprio acesso, os vendedores e os usuários */
  const sugestoes = useMemo(
    () =>
      [
        ...new Set(
          [usuario?.nome, ...db.usuarios.map((u) => u.nome), ...db.vendedores.map((v) => v.nome)]
            .map((n) => (n ?? '').trim())
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [db.usuarios, db.vendedores, usuario?.nome],
  )

  const abrir = (pedido: Pedido, tipoInicial: TipoImpressao = 'impressao') => {
    setAlvo(pedido)
    setTipo(tipoInicial)
    setMetros(pedido.metragem ? numeroBR(pedido.metragem) : '')
    setQuem((usuario?.nome ?? '').trim())
    setArquivoId('')
    setMotivo('')
    setObservacao('')
    setErro('')
  }

  const fechar = () => setAlvo(null)

  const salvar = async () => {
    if (!alvo) return
    const m = Number(String(metros).replace(',', '.'))
    if (!m || m <= 0) {
      setErro('Informe os metros impressos (ex.: 2,50).')
      return
    }
    if (!quem.trim()) {
      setErro('Informe quem imprimiu.')
      return
    }
    if (tipo === 'reimpressao' && !motivo.trim()) {
      setErro('Escolha o motivo da reimpressão.')
      return
    }
    setErro('')
    setSalvando(true)
    try {
      await registrarImpressao(alvo, {
        metros: m,
        quem,
        usuario_id: usuario?.id ?? '',
        arquivo_id: arquivoId,
        arquivo_nome: arquivos.find((a) => a.id === arquivoId)?.nome ?? '',
        tipo,
        motivo,
        observacao,
      })
      const vendedor = nomeVendedor(alvo.vendedor_id)
      avisar(
        tipo === 'reimpressao'
          ? `Reimpressão do pedido #${alvo.numero} registrada (${numeroBR(m)} m). ${vendedor} será avisado!`
          : `Pedido #${alvo.numero} marcado como impresso (${numeroBR(m)} m). ${vendedor} será avisado!`,
      )
      setAlvo(null)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const janela = (
    <Modal
      aberto={Boolean(alvo)}
      onFechar={fechar}
      titulo={alvo ? `Registrar impressão — pedido #${alvo.numero}` : 'Registrar impressão'}
      subtitulo={alvo ? `${alvo.cliente_nome} · pedido com ${numeroBR(alvo.metragem)} m` : undefined}
      icone={PrinterCheck}
      largura="max-w-xl"
      rodape={
        <>
          <Botao variante="secundario" onClick={fechar}>
            Cancelar
          </Botao>
          <Botao icone={Check} onClick={salvar} carregando={salvando}>
            {tipo === 'reimpressao' ? 'Registrar reimpressão' : 'Registrar impressão'}
          </Botao>
        </>
      }
    >
      {alvo ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3 text-xs text-fuchsia-900 dark:border-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-200">
            Os metros que você informar aqui viram o <b>histórico da produção</b> (quanto saiu da máquina e quanto se
            perdeu em reimpressão). O valor do pedido não muda.
          </div>

          {/* tipo de impressão */}
          <div className="grid grid-cols-2 gap-2">
            {(['impressao', 'reimpressao'] as TipoImpressao[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition',
                  tipo === t
                    ? t === 'impressao'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                {t === 'impressao' ? <PrinterCheck className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                {t === 'impressao' ? 'Impressão normal' : 'Reimpressão'}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Metros impressos" obrigatorio dica="Já vem com a metragem do pedido — corrija se saiu diferente.">
              <Entrada
                inputMode="decimal"
                value={metros}
                onChange={(e) => setMetros(e.target.value)}
                placeholder="Ex.: 2,50"
              />
            </Campo>
            <Campo label="Quem imprimiu" obrigatorio dica="Já vem com o seu nome — troque se foi outra pessoa.">
              <Entrada list="sugestoes-quem-imprimiu" value={quem} onChange={(e) => setQuem(e.target.value)} />
              <datalist id="sugestoes-quem-imprimiu">
                {sugestoes.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Campo>
          </div>

          {arquivos.length ? (
            <Campo label="Arte usada" dica="Opcional — ajuda a saber qual arquivo foi para a máquina.">
              <Selecao value={arquivoId} onChange={(e) => setArquivoId(e.target.value)}>
                <option value="">Não informar a arte</option>
                {arquivos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          ) : null}

          {tipo === 'reimpressao' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                <TriangleAlert className="h-4 w-4" /> Por que precisou reimprimir?
              </p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MOTIVOS_REIMPRESSAO.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition',
                      motivo === m
                        ? 'border-amber-400 bg-amber-400 text-amber-950'
                        : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <Entrada
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ou escreva o motivo com suas palavras"
              />
            </div>
          ) : null}

          <Campo label="Observação" dica="Opcional — ex.: “filme acabou no meio”, “cliente pediu pressa”.">
            <AreaTexto
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Alguma anotação sobre esta impressão?"
            />
          </Campo>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Vendedor: {nomeVendedor(alvo.vendedor_id)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" /> Pedido: {numeroBR(alvo.metragem)} m
            </span>
          </div>

          {erro ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {erro}
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )

  return {
    /** abre a janela para uma impressão normal */
    imprimir: (pedido: Pedido) => abrir(pedido, 'impressao'),
    /** abre a janela já marcada como reimpressão */
    reimprimir: (pedido: Pedido) => abrir(pedido, 'reimpressao'),
    aberto: Boolean(alvo),
    janela,
  }
}

/** Última impressão de um pedido (usado nas listas para mostrar quem imprimiu) */
export const ultimaImpressao = (impressoes: Impressao[], pedidoId: string) =>
  impressoes
    .filter((i) => i.pedido_id === pedidoId)
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)))[0]
