// Tema (claro / escuro) — aplicado no <html> e guardado no navegador de cada usuário
import { useCallback, useEffect, useState } from 'react'

export type Tema = 'claro' | 'escuro'

const CHAVE = 'altoprints:tema'

export function lerTemaSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'escuro' || salvo === 'claro') return salvo
  } catch {
    /* ignora */
  }
  return 'claro'
}

export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  raiz.classList.toggle('dark', tema === 'escuro')
  raiz.style.colorScheme = tema === 'escuro' ? 'dark' : 'light'
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(() => lerTemaSalvo())

  useEffect(() => {
    aplicarTema(tema)
    try {
      localStorage.setItem(CHAVE, tema)
    } catch {
      /* ignora */
    }
  }, [tema])

  const alternar = useCallback(() => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')), [])

  return { tema, setTema, alternar, escuro: tema === 'escuro' }
}
