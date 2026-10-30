// Porta administrativa do proprietário.
//
// O acesso do dono fica separado do login dos funcionários: ninguém vê no site
// nenhuma pista de que ele existe. Ele abre de três formas, todas fáceis:
//   • salvar o endereço  #/administracao  na tela de início do celular (1 toque)
//   • tocar/clicar 5 vezes seguidas no logo (funciona no celular e no PC)
//   • atalho de teclado  Ctrl + Alt + D
//
// Chegando lá, é preciso o acesso de administrador: funcionário que descobrir a
// porta vê apenas uma tela de login, sem lista e sem dados.
import { useCallback, useEffect, useRef } from 'react'

/** endereço da porta administrativa */
export const ROTA_ADMIN = '/administracao'

const SEGUNDOS = 3000

/**
 * Conta toques/cliques seguidos no logo: 5 dentro de 3 segundos.
 * Devolve `true` no toque que abriu a porta — aí quem clicou não deve também
 * navegar para a tela inicial.
 */
export function useCincoToquesNoLogo(acao: () => void) {
  const contador = useRef({ n: 0, inicio: 0 })
  return useCallback((): boolean => {
    const agora = Date.now()
    if (agora - contador.current.inicio > SEGUNDOS) contador.current = { n: 0, inicio: agora }
    contador.current.n += 1
    if (contador.current.n >= 5) {
      contador.current = { n: 0, inicio: 0 }
      acao()
      return true
    }
    return false
  }, [acao])
}

/** atalho de teclado Ctrl + Alt + D */
export function useAtalhoAdmin(acao: () => void) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        acao()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [acao])
}
