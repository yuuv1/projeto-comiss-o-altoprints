/**
 * Arquivos de arte do pedido.
 *
 * - a lista mostra MINIATURAS LEVES (reduzidas no navegador), então pedidos com
 *   várias artes grandes abrem na hora, sem travar a tela;
 * - dentro da prévia dá para ligar “ver qualidade real” e inspecionar a arte
 *   original, no tamanho de verdade;
 * - o download sai sempre INTEIRO (nunca dividido por tamanho) e o formato
 *   (PNG ou JPG) é escolhido na hora.
 */
import { Download, Eye, FileText, ImageOff, Minimize2, Trash2, X, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Botao, cn } from '../components/ui'
import { dataBR } from '../lib/format'
import { urlDoArquivo } from '../lib/files'
import {
  arquivoEhImagemExportavel,
  baixarArquivoGrande,
  baixarVariosGrandes,
  miniaturaDoArquivo,
  nomeComFormato,
  type FormatoSaida,
} from '../lib/exportar'
import type { Arquivo } from '../lib/types'

export const tamanhoArquivo = (bytes: number) => {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ------------------------------ miniaturas ------------------------------ */

/** cache em memória para não reduzir a mesma arte duas vezes */
const cacheMiniaturas = new Map<string, string>()

function Miniatura({
  arquivo,
  qualidadeReal,
  className,
}: {
  arquivo: Arquivo
  qualidadeReal: boolean
  className?: string
}) {
  const [leve, setLeve] = useState<string | null>(() => cacheMiniaturas.get(arquivo.id) ?? null)
  const [real, setReal] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    let vivo = true
    if (!arquivoEhImagemExportavel(arquivo)) return
    if (leve) return
    miniaturaDoArquivo(arquivo, 128).then((u) => {
      if (!vivo) return
      if (u) {
        cacheMiniaturas.set(arquivo.id, u)
        setLeve(u)
      } else setFalhou(true)
    })
    return () => {
      vivo = false
    }
  }, [arquivo, leve])

  useEffect(() => {
    if (!qualidadeReal || real || !arquivoEhImagemExportavel(arquivo)) return
    let vivo = true
    urlDoArquivo(arquivo).then((u) => {
      if (vivo && u) setReal(u)
    })
    return () => {
      vivo = false
    }
  }, [arquivo, qualidadeReal, real])

  if (!arquivoEhImagemExportavel(arquivo)) {
    return <FileText className={cn('h-5 w-5 text-purple-500', className)} />
  }
  if (falhou) return <ImageOff className={cn('h-5 w-5 text-slate-400', className)} />
  const src = qualidadeReal ? real ?? leve : leve
  if (!src) {
    return <span className="block h-full w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
  }
  return (
    <img
      src={src}
      alt={arquivo.nome}
      loading="lazy"
      decoding="async"
      className={cn('h-full w-full object-cover', className)}
    />
  )
}

/* -------------------------------- prévia -------------------------------- */

function PreviaArquivo({
  arquivo,
  onFechar,
  onBaixar,
}: {
  arquivo: Arquivo
  onFechar: () => void
  onBaixar: (formato: FormatoSaida) => void
}) {
  const [real, setReal] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!real) return
    let vivo = true
    setCarregando(true)
    urlDoArquivo(arquivo).then((u) => {
      if (!vivo) return
      setUrl(u)
      setCarregando(false)
    })
    return () => {
      vivo = false
    }
  }, [arquivo, real])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 p-3 backdrop-blur-sm print:hidden">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-white/95 px-3 py-2 dark:bg-slate-900/95">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{arquivo.nome}</p>
        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {tamanhoArquivo(arquivo.tamanho)}
        </span>
        <button
          type="button"
          onClick={() => setReal((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black transition',
            real
              ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
          )}
          title="Liga a imagem original, sem redução"
        >
          {real ? <Zap className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          {real ? 'Qualidade real' : 'Ver qualidade real'}
        </button>
        <Botao tamanho="sm" variante="secundario" icone={Download} onClick={() => onBaixar('png')}>
          PNG
        </Botao>
        <Botao tamanho="sm" variante="secundario" icone={Download} onClick={() => onBaixar('jpg')}>
          JPG
        </Botao>
        <Botao tamanho="sm" variante="ghost" icone={X} onClick={onFechar}>
          Fechar
        </Botao>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:20px_20px]">
        {carregando ? (
          <p className="animate-pulse text-sm font-bold text-white">Carregando a arte original...</p>
        ) : (
          <Miniatura
            arquivo={arquivo}
            qualidadeReal={real}
            className="!h-auto !w-auto max-h-full max-w-full object-contain"
          />
        )}
      </div>
      <p className="mt-2 text-center text-[11px] font-semibold text-slate-300">
        {real ? 'Imagem original (pode demorar em arquivos grandes)' : 'Prévia leve — troque para “Qualidade real” para ver a arte nativa.'}
      </p>
    </div>
  )
}

/* -------------------------------- seção -------------------------------- */

export function ArtesDoPedido({
  arquivos,
  onExcluir,
  avisar,
}: {
  arquivos: Arquivo[]
  onExcluir: (a: Arquivo) => void
  avisar: (texto: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}) {
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [formato, setFormato] = useState<FormatoSaida>('original')
  const [previa, setPrevia] = useState<Arquivo | null>(null)
  const [baixando, setBaixando] = useState<{ atual: number; total: number; nome: string } | null>(null)
  const montado = useRef(true)
  useEffect(() => () => void (montado.current = false), [])

  const todosSelecionados = useMemo(
    () => arquivos.length > 0 && arquivos.every((a) => selecionados.includes(a.id)),
    [arquivos, selecionados],
  )

  const alternar = (id: string) =>
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const baixarUm = useCallback(
    async (arquivo: Arquivo) => {
      try {
        avisar(`Baixando ${nomeComFormato(arquivo, formato)}...`, 'info')
        await baixarArquivoGrande(arquivo, formato)
      } catch (e) {
        avisar((e as Error)?.message ?? 'Não foi possível baixar o arquivo.', 'erro')
      }
    },
    [avisar, formato],
  )

  const baixarSelecionados = async () => {
    const lista = arquivos.filter((a) => selecionados.includes(a.id))
    const alvo = lista.length ? lista : arquivos
    if (!alvo.length) return
    setBaixando({ atual: 0, total: alvo.length, nome: alvo[0].nome })
    try {
      const resumo = await baixarVariosGrandes(alvo, formato, (i, total, arquivo) => {
        if (montado.current) setBaixando({ atual: i + 1, total, nome: arquivo.nome })
      })
      if (resumo.falhas.length) {
        avisar(
          `${resumo.ok} arquivo(s) baixado(s); ${resumo.falhas.length} falhou(aram): ${resumo.falhas[0].nome}`,
          'erro',
        )
      } else {
        avisar(`${resumo.ok} arquivo(s) baixado(s), inteiros e sem divisão.`)
      }
    } finally {
      if (montado.current) setBaixando(null)
    }
  }

  if (!arquivos.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
        Nenhum arquivo enviado. Aceita imagens e PDF.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/60">
        <button
          type="button"
          onClick={() => setSelecionados(todosSelecionados ? [] : arquivos.map((a) => a.id))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {selecionados.length ? `${selecionados.length} selecionado(s)` : `${arquivos.length} arquivo(s)`}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            {(
              [
                { id: 'original' as FormatoSaida, label: 'Original' },
                { id: 'png' as FormatoSaida, label: 'PNG' },
                { id: 'jpg' as FormatoSaida, label: 'JPG' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormato(f.id)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-black uppercase transition',
                  formato === f.id
                    ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white'
                    : 'bg-white text-slate-500 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300',
                )}
                title={
                  f.id === 'original'
                    ? 'Baixar do jeito que foi enviado'
                    : `Baixar como ${f.label} (mesma resolução)`
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <Botao
            tamanho="sm"
            icone={Download}
            carregando={Boolean(baixando)}
            onClick={() => void baixarSelecionados()}
          >
            {baixando ? `${baixando.atual}/${baixando.total}...` : 'Baixar arquivos'}
          </Botao>
        </div>
      </div>

      {baixando ? (
        <div className="rounded-xl border border-purple-100 bg-purple-50/70 px-3 py-2 dark:border-purple-900 dark:bg-purple-950/30">
          <p className="truncate text-[11px] font-bold text-purple-800 dark:text-purple-200">
            Baixando {baixando.atual} de {baixando.total}: {baixando.nome}
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-purple-200 dark:bg-purple-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-indigo-600 transition-all"
              style={{ width: `${Math.round((baixando.atual / Math.max(1, baixando.total)) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {arquivos.map((a) => {
          const marcado = selecionados.includes(a.id)
          return (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border p-2.5 transition',
                marcado
                  ? 'border-purple-300 bg-purple-50/70 dark:border-purple-800 dark:bg-purple-950/30'
                  : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60',
              )}
            >
              <input
                type="checkbox"
                checked={marcado}
                onChange={() => alternar(a.id)}
                className="h-4 w-4 shrink-0 accent-purple-600"
                title="Selecionar para baixar"
              />
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <Miniatura arquivo={a} qualidadeReal={false} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{a.nome}</p>
                <p className="text-[11px] text-slate-400">
                  {tamanhoArquivo(a.tamanho)} • {dataBR(a.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPrevia(a)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-purple-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Ver a arte (prévia leve, com opção de qualidade real)"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void baixarUm(a)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-purple-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title={`Baixar inteiro (${nomeComFormato(a, formato)})`}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onExcluir(a)}
                  className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Excluir arquivo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {previa ? (
        <PreviaArquivo
          arquivo={previa}
          onFechar={() => setPrevia(null)}
          onBaixar={(f) => {
            setFormato(f)
            void baixarArquivoGrande(previa, f).catch(() => {})
          }}
        />
      ) : null}
    </div>
  )
}
