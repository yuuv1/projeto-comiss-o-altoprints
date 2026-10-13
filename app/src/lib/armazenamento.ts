/**
 * Onde o banco do sistema fica guardado, no modo local.
 *
 * Antes tudo ia para o `localStorage`, que os navegadores limitam a cerca de
 * 5 MB por site — quando enchia, aparecia o erro "exceeded the quota" e nada
 * mais era salvo (inclusive a criação do acesso do proprietário).
 *
 * Agora o banco vai para o **IndexedDB** (o mesmo lugar onde as artes já ficam),
 * que tem espaço de centenas de MB. O `localStorage` continua sendo usado só
 * quando o IndexedDB não estiver disponível (navegadores antigos, alguns modos
 * de arquivo local), e nesse caso o erro de espaço é traduzido para uma
 * mensagem clara em português.
 *
 * Banco antigo (salvo no localStorage) é lido normalmente na primeira vez e
 * migrado para o IndexedDB — a cópia velha é removida, liberando o espaço.
 */

const LS_KEY = 'altoprints:db:v1'
const IDB_NOME = 'altoprints-banco'
const IDB_STORE = 'estado'
const IDB_CHAVE = 'db'

/** null = ainda não testado; false = o navegador não deixou usar */
let idbDisponivel: boolean | null = null

const temIndexedDB = () => typeof indexedDB !== 'undefined' && indexedDB !== null

const abrirIDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(IDB_NOME, 1)
    } catch (e) {
      reject(e)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('O navegador bloqueou o armazenamento.'))
  })

const idbLer = async (): Promise<string | null> => {
  const db = await abrirIDB()
  const texto = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(IDB_CHAVE)
    req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return texto
}

const idbGravar = async (texto: string) => {
  const db = await abrirIDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(texto, IDB_CHAVE)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  db.close()
}

const idbApagar = async () => {
  const db = await abrirIDB()
  await new Promise<void>((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(IDB_CHAVE)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}

/* ------------------------------------------------------------------ */
/* Erros de espaço                                                     */
/* ------------------------------------------------------------------ */

/** o navegador recusou a gravação por falta de espaço? */
export const ehErroDeEspaco = (erro: unknown) =>
  /quota|exceeded|storage full|armazenamento cheio/i.test(String((erro as Error)?.message ?? erro))

export const MENSAGEM_SEM_ESPACO =
  'O navegador está sem espaço para guardar os dados. Abra Configurações → Dados, clique em "Baixar backup" e depois ' +
  'em "Liberar espaço" — isso costuma resolver na hora. Nada que já estava salvo foi perdido.'

/* ------------------------------------------------------------------ */
/* Leitura e gravação                                                  */
/* ------------------------------------------------------------------ */

/** texto do banco guardado neste aparelho (IndexedDB ou o localStorage antigo) */
export async function lerBancoBruto(): Promise<string | null> {
  if (temIndexedDB() && idbDisponivel !== false) {
    try {
      const guardado = await idbLer()
      idbDisponivel = true
      if (guardado) return guardado
    } catch {
      idbDisponivel = false
    }
  }
  try {
    return localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}

/** grava o banco: IndexedDB quando disponível, senão localStorage */
export async function gravarBancoBruto(texto: string): Promise<void> {
  if (temIndexedDB() && idbDisponivel !== false) {
    try {
      await idbGravar(texto)
      idbDisponivel = true
      // já está guardado no IndexedDB: a cópia antiga só ocupava espaço
      try {
        localStorage.removeItem(LS_KEY)
      } catch {
        /* sem problema */
      }
      return
    } catch {
      idbDisponivel = false
    }
  }
  // ambiente sem armazenamento nenhum (testes, por exemplo): não há o que guardar
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, texto)
  } catch (e) {
    throw new Error(ehErroDeEspaco(e) ? MENSAGEM_SEM_ESPACO : String((e as Error)?.message ?? e))
  }
}

export async function apagarBancoBruto(): Promise<void> {
  if (temIndexedDB() && idbDisponivel !== false) {
    try {
      await idbApagar()
      idbDisponivel = true
    } catch {
      idbDisponivel = false
    }
  }
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* sem problema */
  }
}

/* ------------------------------------------------------------------ */
/* Espaço usado (mostrado em Configurações → Dados)                    */
/* ------------------------------------------------------------------ */

/** espaço aproximado, em bytes, que este site ocupa no localStorage */
export const espacoNoLocalStorage = () => {
  try {
    let bytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i)
      if (!chave) continue
      const valor = localStorage.getItem(chave) ?? ''
      bytes += (chave.length + valor.length) * 2 // cada caractere ocupa 2 bytes
    }
    return bytes
  } catch {
    return 0
  }
}

export type OndeEstaGuardado = 'IndexedDB' | 'localStorage' | 'nenhum'

/** onde o banco está guardado neste aparelho */
export async function ondeEstaGuardado(): Promise<OndeEstaGuardado> {
  if (temIndexedDB() && idbDisponivel !== false) {
    try {
      const guardado = await idbLer()
      idbDisponivel = true
      if (guardado) return 'IndexedDB'
    } catch {
      idbDisponivel = false
    }
  }
  try {
    return localStorage.getItem(LS_KEY) ? 'localStorage' : 'nenhum'
  } catch {
    return 'nenhum'
  }
}

/**
 * Tira do localStorage a cópia antiga do banco (que ocupava o espaço pequeno)
 * depois de garantir que os dados estão no IndexedDB. Devolve os bytes liberados.
 */
export async function liberarCopiaAntiga(textoAtual: string): Promise<number> {
  try {
    const antigo = localStorage.getItem(LS_KEY)
    if (!antigo) return 0
    // Sem IndexedDB, a cópia do localStorage É o banco: não pode ser removida.
    if (!temIndexedDB()) return 0
    await gravarBancoBruto(textoAtual)
    // só tira a cópia antiga depois de confirmar que os dados estão no IndexedDB
    if ((await ondeEstaGuardado()) !== 'IndexedDB') return 0
    const liberado = antigo.length * 2
    localStorage.removeItem(LS_KEY)
    return liberado
  } catch {
    return 0
  }
}
