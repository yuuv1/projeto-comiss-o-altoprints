import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { cn } from './ui'

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type NavigatorComInstalacao = Navigator & { standalone?: boolean }
type Variante = 'cabecalho' | 'menu'

const estaInstalado = () => {
  const modoStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const modoIos = (navigator as NavigatorComInstalacao).standalone === true
  return modoStandalone || modoIos
}

const textoDeInstalacao = () => {
  const agente = navigator.userAgent
  const ios = /iPhone|iPad|iPod/i.test(agente) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /Android/i.test(agente)

  if (ios) {
    return {
      resumo: 'No iPhone ou iPad, adicione o Altoprints pela opção de compartilhamento do Safari:',
      passos: ['Abra este endereço no Safari.', 'Toque em Compartilhar.', 'Escolha “Adicionar à Tela de Início” e confirme em “Adicionar”.'],
    }
  }
  if (android) {
    return {
      resumo: 'No Android, instale o Altoprints pelo menu do navegador:',
      passos: ['Abra este endereço no Chrome.', 'Toque no menu ⋮.', 'Escolha “Instalar app” ou “Adicionar à tela inicial” e confirme.'],
    }
  }
  return {
    resumo: 'No computador, instale pelo navegador para abrir o Altoprints como um aplicativo:',
    passos: ['No Chrome ou Edge, procure o ícone de instalação na barra de endereço.', 'Se ele não aparecer, abra o menu do navegador e escolha “Instalar Altoprints”.'],
  }
}

/** Atalho de instalação PWA, com instruções para navegadores sem prompt nativo. */
export function InstalarApp({ variante = 'cabecalho' }: { variante?: Variante }) {
  const [evento, setEvento] = useState<EventoInstalacao | null>(null)
  const [instalado, setInstalado] = useState(false)
  const [ajudaAberta, setAjudaAberta] = useState(false)

  useEffect(() => {
    const conferirInstalacao = () => setInstalado(estaInstalado())
    const aoPoderInstalar = (event: Event) => {
      event.preventDefault()
      setEvento(event as EventoInstalacao)
    }
    const aoInstalar = () => {
      setInstalado(true)
      setEvento(null)
      setAjudaAberta(false)
    }

    conferirInstalacao()
    window.addEventListener('beforeinstallprompt', aoPoderInstalar)
    window.addEventListener('appinstalled', aoInstalar)
    const modo = window.matchMedia?.('(display-mode: standalone)')
    modo?.addEventListener?.('change', conferirInstalacao)

    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar)
      window.removeEventListener('appinstalled', aoInstalar)
      modo?.removeEventListener?.('change', conferirInstalacao)
    }
  }, [])

  useEffect(() => {
    if (!ajudaAberta) return
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAjudaAberta(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [ajudaAberta])

  const instalar = async () => {
    if (!evento) {
      setAjudaAberta(true)
      return
    }

    const atual = evento
    setEvento(null)
    try {
      await atual.prompt()
      const escolha = await atual.userChoice
      if (escolha.outcome === 'accepted') setInstalado(true)
      else setAjudaAberta(true)
    } catch {
      setAjudaAberta(true)
    }
  }

  if (instalado) return null

  const instrucoes = textoDeInstalacao()
  const noMenu = variante === 'menu'

  return (
    <>
      <button
        type="button"
        onClick={instalar}
        aria-label="Instalar Altoprints como aplicativo"
        title="Instalar Altoprints no aparelho"
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60',
          noMenu
            ? 'mt-1.5 w-full rounded-xl px-3 py-2.5 text-[13px]'
            : 'h-9 w-9 px-0 text-xs xl:h-auto xl:w-auto xl:px-3 xl:py-2',
        )}
      >
        <Download className="h-4 w-4" />
        <span className={noMenu ? '' : 'sr-only xl:not-sr-only'}>Instalar app</span>
      </button>

      {ajudaAberta ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAjudaAberta(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-instalar-app"
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Acesso rápido</p>
                <h2 id="titulo-instalar-app" className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                  Adicionar Altoprints à tela inicial
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAjudaAberta(false)}
                aria-label="Fechar instruções de instalação"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{instrucoes.resumo}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-medium text-slate-700 dark:text-slate-200">
              {instrucoes.passos.map((passo) => <li key={passo}>{passo}</li>)}
            </ol>
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
              Depois de instalado, toque no ícone do Altoprints para abrir o sistema sem precisar digitar o endereço.
            </p>
          </section>
        </div>
      ) : null}
    </>
  )
}
