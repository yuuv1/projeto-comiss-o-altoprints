import { useStore } from '../lib/store'
import { cn } from './ui'

export function MarcaLogo({ className, tamanho = 40 }: { className?: string; tamanho?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={tamanho} height={tamanho} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="altoprints-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="35%" stopColor="#a855f7" />
          <stop offset="70%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="altoprints-shine" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="48" rx="14" fill="url(#altoprints-grad)" />
      <rect x="0" y="0" width="48" height="48" rx="14" fill="url(#altoprints-shine)" />
      <path
        d="M13 35.5 22.4 13.2c.6-1.4 2.6-1.4 3.2 0L35 35.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path d="M18.6 28.5h10.8" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="35.6" cy="12.4" r="3.1" fill="#ffffff" opacity=".92" />
    </svg>
  )
}

export function Logo({ compacto = false, className }: { compacto?: boolean; className?: string }) {
  const { db } = useStore()
  const personalizada = db.configuracoes.logo_url

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {personalizada ? (
        <img
          src={personalizada}
          alt={db.configuracoes.empresa_nome}
          className="h-10 w-10 rounded-xl bg-white object-contain shadow-soft ring-1 ring-slate-100"
        />
      ) : (
        <div className="relative">
          <MarcaLogo tamanho={40} className="drop-shadow-[0_4px_10px_rgba(168,85,247,0.45)]" />
          <span className="pointer-events-none absolute inset-0 rounded-[14px] bg-gradient-to-tr from-transparent via-white/40 to-transparent" />
        </div>
      )}
      {!compacto ? (
        <div className="leading-none">
          <p
            className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 bg-clip-text text-xl font-black tracking-tight text-transparent"
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
