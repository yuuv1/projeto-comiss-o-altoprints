// Guarda os arquivos de arte: na nuvem (Supabase Storage) ou localmente (IndexedDB)
import type { Arquivo, ID } from './types'
import { clienteNuvem } from './supabase'

const BUCKET = 'artes'

/* ------------------------------------------------------------------ */
/* IndexedDB (modo local)                                              */
/* ------------------------------------------------------------------ */

const IDB_NOME = 'altoprints-arquivos'
const IDB_STORE = 'blobs'

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
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('O navegador bloqueou o armazenamento local.'))
  })

/**
 * Aviso usado quando o navegador não deixa guardar anexos: acontece quando o
 * sistema é aberto como arquivo (Altoprints.html, endereço começando com
 * "file://"), porque o navegador trata esse modo como mais restrito.
 */
const erroDeArmazenamento = () =>
  new Error(
    'Este navegador não guarda arquivos de arte quando o sistema é aberto direto do computador (arquivo Altoprints.html). ' +
      'Use o sistema pelo link publicado ou conecte a nuvem para anexar artes — os pedidos, clientes e impressões continuam funcionando normalmente.',
  )

const idbPut = async (id: ID, blob: Blob) => {
  const db = await abrirIDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put({ id, blob })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

const idbGet = async (id: ID): Promise<Blob | null> => {
  try {
    const db = await abrirIDB()
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(id)
      req.onsuccess = () => resolve((req.result as { blob?: Blob } | undefined)?.blob ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return blob
  } catch {
    return null
  }
}

const idbDel = async (id: ID) => {
  const db = await abrirIDB()
  await new Promise<void>((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

export const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`

/**
 * Salva o arquivo e devolve o registro pronto para ir para a tabela `arquivos`.
 * Na nuvem sobe para o bucket e guarda a URL pública.
 */
export async function enviarArquivo(pedidoId: ID, file: File): Promise<Arquivo> {
  const id = novoId()
  const base: Arquivo = {
    id,
    pedido_id: pedidoId,
    nome: file.name,
    tipo: file.type || 'application/octet-stream',
    tamanho: file.size,
    url: '',
    created_at: new Date().toISOString(),
  }

  const sb = clienteNuvem()
  if (sb) {
    const caminho = `${pedidoId}/${id}--${file.name.replace(/[^\w.\-]+/g, '_')}`
    const { error } = await sb.storage.from(BUCKET).upload(caminho, file, {
      upsert: true,
      contentType: file.type || undefined,
    })
    if (error) throw new Error(`Falha ao enviar o arquivo: ${error.message}`)
    const { data } = sb.storage.from(BUCKET).getPublicUrl(caminho)
    base.url = data?.publicUrl ?? caminho
    return base
  }

  try {
    await idbPut(id, file)
  } catch {
    throw erroDeArmazenamento()
  }
  base.url = ''
  return base
}

/** URL para visualizar/baixar o arquivo (local: cria um object URL) */
export async function urlDoArquivo(arquivo: Arquivo): Promise<string | null> {
  const sb = clienteNuvem()
  if (arquivo.url) {
    if (!sb || /^https?:\/\//.test(arquivo.url)) return arquivo.url
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(arquivo.url, 3600)
    if (data?.signedUrl) return data.signedUrl
    return null
  }
  const blob = await idbGet(arquivo.id)
  return blob ? URL.createObjectURL(blob) : null
}

export async function apagarArquivo(arquivo: Arquivo) {
  const sb = clienteNuvem()
  if (sb) {
    const caminho = arquivo.url ? extrairCaminho(arquivo.url) : null
    if (caminho) await sb.storage.from(BUCKET).remove([caminho])
    return
  }
  await idbDel(arquivo.id)
}

export async function apagarVariosArquivos(arquivos: Arquivo[]) {
  for (const a of arquivos) {
    try {
      await apagarArquivo(a)
    } catch {
      /* ignora falhas individuais */
    }
  }
}

const extrairCaminho = (url: string) => {
  const marca = `/object/public/${BUCKET}/`
  const i = url.indexOf(marca)
  if (i >= 0) return decodeURIComponent(url.slice(i + marca.length))
  const j = url.indexOf(`/${BUCKET}/`)
  return j >= 0 ? decodeURIComponent(url.slice(j + BUCKET.length + 2)) : null
}

export const baixarArquivo = async (arquivo: Arquivo) => {
  const url = await urlDoArquivo(arquivo)
  if (!url) throw new Error('Arquivo não encontrado')
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo.nome
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export const arquivoEhImagem = (a: Arquivo) =>
  (a.tipo || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(a.nome)

export const tamanhoLegivel = (bytes: number) => {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
