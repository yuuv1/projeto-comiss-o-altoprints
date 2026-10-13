/**
 * Aparência — tema (claro / escuro) e densidade da tela (compacto / confortável).
 *
 * O estado fica aqui fora do React para que o cabeçalho e as Configurações
 * mostrem sempre a mesma escolha (mudar num lugar muda no outro na hora), e é
 * aplicado no `<html>`: a classe `dark` troca as cores e a ausência da classe
 * `confortavel` mantém a tela compacta (veja `--espaco` no index.css).
 */
import { useCallback, useSyncExternalStore } from 'react'
import { lsGravar, lsLer } from './local'

export type Tema = 'claro' | 'escuro'
export type Densidade = 'compacto' | 'confortavel'

const CHAVE_TEMA = 'altoprints:tema'
const CHAVE_DENSIDADE = 'altoprints:densidade'

export interface Aparicao {
  tema: Tema
  densidade: Densidade
}

const PADRAO: Aparicao = { tema: 'claro', densidade: 'compacto' }

const temDocumento = () => typeof document !== 'undefined'

const lerSalvo = <T extends string>(chave: string, validos: readonly T[], padrao: T): T => {
  const salvo = lsLer(chave)
  return salvo && (validos as readonly string[]).includes(salvo) ? (salvo as T) : padrao
}

let estado: Aparicao = { ...PADRAO }
let iniciado = false
const inscritos = new Set<() => void>()

/** aplica tema + densidade no <html> (a densidade é só o espaçamento) */
export function aplicarAparicao(escolha: Aparicao = estado) {
  if (!temDocumento()) return
  const raiz = document.documentElement
  raiz.classList.toggle('dark', escolha.tema === 'escuro')
  raiz.classList.toggle('confortavel', escolha.densidade === 'confortavel')
  raiz.style.colorScheme = escolha.tema === 'escuro' ? 'dark' : 'light'
}

function iniciar() {
  if (iniciado) return
  iniciado = true
  estado = {
    tema: lerSalvo(CHAVE_TEMA, ['claro', 'escuro'] as const, PADRAO.tema),
    densidade: lerSalvo(CHAVE_DENSIDADE, ['compacto', 'confortavel'] as const, PADRAO.densidade),
  }
  aplicarAparicao()
}

function definir(parcial: Partial<Aparicao>) {
  iniciar()
  estado = { ...estado, ...parcial }
  lsGravar(CHAVE_TEMA, estado.tema)
  lsGravar(CHAVE_DENSIDADE, estado.densidade)
  aplicarAparicao()
  inscritos.forEach((fn) => fn())
}

const inscrever = (fn: () => void) => {
  inscritos.add(fn)
  return () => {
    inscritos.delete(fn)
  }
}

const lerEstado = () => estado

export function useTema() {
  iniciar()
  const atual = useSyncExternalStore(inscrever, lerEstado, lerEstado)

  const alternar = useCallback(() => definir({ tema: estado.tema === 'claro' ? 'escuro' : 'claro' }), [])
  const alternarDensidade = useCallback(
    () => definir({ densidade: estado.densidade === 'compacto' ? 'confortavel' : 'compacto' }),
    [],
  )
  const setTema = useCallback((tema: Tema) => definir({ tema }), [])
  const definirDensidade = useCallback((densidade: Densidade) => definir({ densidade }), [])

  return {
    tema: atual.tema,
    densidade: atual.densidade,
    escuro: atual.tema === 'escuro',
    compacto: atual.densidade === 'compacto',
    setTema,
    definirDensidade,
    alternar,
    alternarDensidade,
  }
}

/** atalho usado na inicialização do sistema, antes de qualquer tela aparecer */
export const prepararAparicao = () => iniciar()

/** rótulos usados nas telas */
export const LABEL_DENSIDADE: Record<Densidade, string> = {
  compacto: 'Compacto',
  confortavel: 'Confortável',
}

export const DESCRICAO_DENSIDADE: Record<Densidade, string> = {
  compacto: 'Menos espaçamento: cabe bem mais coisa na tela.',
  confortavel: 'Espaçamento folgado, com mais respiro entre os blocos.',
}
