/**
 * Acesso seguro ao `localStorage`.
 *
 * Os navegadores recusam gravar quando o espaço do site acabou (`quota`) ou
 * quando a janela é anônima/privada — e nesses casos o erro cru ("Failed to
 * execute 'setItem' ... exceeded the quota") aparecia na tela. Aqui toda
 * gravação é protegida: se não der para salvar, o sistema continua funcionando
 * e quem precisar saber (a tela de login, por exemplo) consulta as funções de
 * diagnóstico.
 */

export const CHAVES_ALTOPRINTS = [
  'altoprints:db:v1',
  'altoprints:sessao',
  'altoprints:tentativas',
  'altoprints:tema',
  'altoprints:densidade',
  'altoprints:nuvem',
  'altoprints:demo-inicial-carregada',
  'altoprints:entrada-automatica',
]

export const lsLer = (chave: string): string | null => {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

/** grava; devolve `false` quando o navegador não deixou (espaço cheio / anônima) */
export const lsGravar = (chave: string, valor: string): boolean => {
  try {
    localStorage.setItem(chave, valor)
    return true
  } catch {
    return false
  }
}

export const lsRemover = (chave: string): void => {
  try {
    localStorage.removeItem(chave)
  } catch {
    /* sem problema */
  }
}

export const lsChaves = (): string[] => {
  try {
    const lista: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i)
      if (chave) lista.push(chave)
    }
    return lista
  } catch {
    return []
  }
}

/** bytes aproximados (cada caractere ocupa 2) */
export const tamanhoDe = (texto: string | null) => (texto ? texto.length * 2 : 0)

/** espaço total usado pelo site no localStorage, em bytes */
export const espacoNoLocalStorage = (): number => {
  try {
    let bytes = 0
    for (const chave of lsChaves()) bytes += tamanhoDe(chave) + tamanhoDe(lsLer(chave))
    return bytes
  } catch {
    return 0
  }
}

/** maiores ocupantes do espaço (para a tela de Configurações → Dados) */
export const maioresOcupantes = (limite = 6): { chave: string; bytes: number }[] =>
  lsChaves()
    .map((chave) => ({ chave, bytes: tamanhoDe(chave) + tamanhoDe(lsLer(chave)) }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limite)

/**
 * O navegador consegue gravar? Grava uma chave minúscula de teste e apaga.
 * Quando isso devolve `false`, nenhum dado consegue ser salvo neste navegador
 * (caso típico: janela anônima/privada ou espaço totalmente cheio).
 */
export const consegueGravar = (): boolean => {
  const chave = 'altoprints:teste'
  if (!lsGravar(chave, 'ok')) return false
  lsRemover(chave)
  return true
}

/** Apaga só as chaves do sistema (usado no socorro "começar limpo"). Devolve os bytes liberados. */
export const limparChavesDoSistema = (): number => {
  let liberado = 0
  for (const chave of lsChaves()) {
    if (chave.startsWith('altoprints:')) liberado += tamanhoDe(chave) + tamanhoDe(lsLer(chave))
  }
  for (const chave of CHAVES_ALTOPRINTS) lsRemover(chave)
  for (const chave of lsChaves()) if (chave.startsWith('altoprints:')) lsRemover(chave)
  return liberado
}
