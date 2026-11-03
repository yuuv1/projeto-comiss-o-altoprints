import { useStore } from '../lib/store'
import { cn } from './ui'

export function MarcaLogo({ className, tamanho = 40 }: { className?: string; tamanho?: number }) {
  return (
    <img
      src="./icons/pwa-192x192.png"
      alt=""
      aria-hidden="true"
      width={tamanho}
      height={tamanho}
      className={cn('rounded-[14px] bg-black object-cover', className)}
    />
  )
}

export function Logo({ compacto = false, className }: { compacto?: boolean; className?: string }) {
  const { db } = useStore()
  const personalizada = db.configuracoes.logo_url

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {personalizada ? (
        <img
          src={personalizada}
          alt={db.configuracoes.empresa_nome}
          className="h-9 w-9 rounded-xl bg-white object-contain shadow-soft ring-1 ring-slate-100"
        />
      ) : (
        <MarcaLogo tamanho={34} className="shadow-soft ring-1 ring-black/10" />
      )}
      {!compacto ? (
        <div className="leading-none">
          <p
            className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 bg-clip-text text-xl font-black tracking-tight text-transparent dark:from-pink-400 dark:via-purple-400 dark:to-sky-400"
            style={{ WebkitTextFillColor: 'transparent' }}
          >
            {db.configuracoes.empresa_nome || 'Altoprints'}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Pedidos DTF</p>
        </div>
      ) : null}
    </div>
  )
}

/** Logo em preto e branco para os relatórios impressos em A4 */
export function LogoImpressao() {
  const { db } = useStore()
  if (db.configuracoes.logo_url) {
    return <img src={db.configuracoes.logo_url} alt="Logo" className="h-14 w-14 object-contain" />
  }
  return (
    <div className="flex items-center gap-2">
      <MarcaLogo tamanho={44} />
      <div className="leading-none">
        <p className="text-xl font-black uppercase tracking-tight text-black">
          {db.configuracoes.empresa_nome || 'Altoprints'}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black">Pedidos DTF</p>
      </div>
    </div>
  )
}
