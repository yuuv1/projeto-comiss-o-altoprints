/**
 * Exportação de arquivos grandes.
 *
 * Regras desta camada:
 *  - nada é dividido em partes: o arquivo sai inteiro, do tamanho que for;
 *  - o download é feito em fluxo (stream) direto para o disco quando o
 *    navegador permite (Chrome/Edge), então um arquivo de 2 GB não precisa
 *    caber na memória;
 *  - quando o navegador não permite fluxo, baixamos o blob e, se nem isso
 *    couber, entregamos o link direto para o próprio navegador baixar;
 *  - o formato (PNG ou JPG) é escolhido na hora do download.
 */
import type { Arquivo } from './types'

/**
 * O acesso ao Storage entra por import dinâmico de propósito: assim este
 * módulo (e as funções puras abaixo) podem ser testados sem tocar no Supabase.
 */
const obterUrl = async (arquivo: Arquivo) => {
  const { urlDoArquivo } = await import('./files')
  return urlDoArquivo(arquivo)
}

export type FormatoSaida = 'original' | 'png' | 'jpg'

export interface ProgressoDownload {
  /** 0 a 100 (ou null quando o servidor não informa o tamanho) */
  porcentagem: number | null
  recebido: number
  total: number | null
}

export type AvisoDownload = (p: ProgressoDownload) => void

const tiposImagem = /^image\/(png|jpe?g|webp|bmp|gif|avif)$/i

export const arquivoEhImagemExportavel = (arquivo: Arquivo) =>
  tiposImagem.test(arquivo.tipo || '') || /\.(png|jpe?g|webp|bmp|gif|avif)$/i.test(arquivo.nome)

const semExtensao = (nome: string) => nome.replace(/\.[^.]+$/, '')

const extensao = (nome: string) => (/\.[^.]+$/.exec(nome)?.[0] ?? '').toLowerCase()

export const nomeComFormato = (arquivo: Arquivo, formato: FormatoSaida) => {
  if (formato === 'original' || !arquivoEhImagemExportavel(arquivo)) return arquivo.nome
  return `${semExtensao(arquivo.nome)}.${formato === 'png' ? 'png' : 'jpg'}`
}

/* ------------------------------------------------------------------ */
/* Conversão de formato (NUNCA reduz a imagem)                         */
/* ------------------------------------------------------------------ */

/**
 * Converte para PNG/JPG mantendo a resolução original. Se o navegador não
 * conseguir converter (imagem gigante demais para o canvas), devolve o
 * arquivo original — melhor entregar a arte inteira do que falhar.
 */
async function converterFormato(blob: Blob, arquivo: Arquivo, formato: FormatoSaida): Promise<Blob> {
  if (formato === 'original' || !arquivoEhImagemExportavel(arquivo)) return blob
  const tipoDestino = formato === 'png' ? 'image/png' : 'image/jpeg'
  if (blob.type === tipoDestino) return blob

  const bitmap = await carregarBitmap(blob)
  if (!bitmap) return blob

  const largura = 'width' in bitmap ? bitmap.width : 0
  const altura = 'height' in bitmap ? bitmap.height : 0
  try {
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(largura, altura)
        : (() => {
            const c = document.createElement('canvas')
            c.width = largura
            c.height = altura
            return c
          })()
    const ctx = (canvas as OffscreenCanvas).getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null
    if (!ctx) return blob
    if (formato === 'jpg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, largura, altura)
    }
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, largura, altura)

    if ('convertToBlob' in canvas) {
      const saida = await (canvas as OffscreenCanvas).convertToBlob({
        type: tipoDestino,
        quality: 0.95,
      })
      return saida
    }
    const saida = await new Promise<Blob | null>((resolve) =>
      (canvas as HTMLCanvasElement).toBlob(resolve, tipoDestino, 0.95),
    )
    return saida ?? blob
  } catch {
    return blob
  } finally {
    if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) bitmap.close()
  }
}

/* ------------------------------------------------------------------ */
/* Gravação no disco                                                   */
/* ------------------------------------------------------------------ */

type SeletorArquivo = (opcoes: {
  suggestedName?: string
  types?: { description: string; accept: Record<string, string[]> }[]
}) => Promise<{
  createWritable: () => Promise<{
    write: (dados: Blob | Uint8Array) => Promise<void>
    close: () => Promise<void>
    abort?: () => Promise<void>
  }>
}>

const seletorArquivo = (): SeletorArquivo | null => {
  const w = window as unknown as { showSaveFilePicker?: SeletorArquivo }
  return typeof w.showSaveFilePicker === 'function' ? w.showSaveFilePicker.bind(window) : null
}

/** Fluxo direto para o disco: nenhum limite de tamanho, sem carregar tudo na memória. */
async function salvarEmFluxo(
  resposta: Response,
  nome: string,
  avisar?: AvisoDownload,
): Promise<boolean> {
  const seletor = seletorArquivo()
  if (!seletor || !resposta.body) return false
  const total = Number(resposta.headers.get('content-length')) || null

  let alvo: Awaited<ReturnType<SeletorArquivo>>
  try {
    alvo = await seletor({
      suggestedName: nome,
      types: [
        {
          description: nome.split('.').pop()?.toUpperCase() ?? 'Arquivo',
          accept: { [resposta.headers.get('content-type') || 'application/octet-stream']: [`.${nome.split('.').pop() ?? 'bin'}`] },
        },
      ],
    })
  } catch (e) {
    // o usuário cancelou a janela de salvar
    if ((e as DOMException)?.name === 'AbortError') return true
    return false
  }

  const destino = await alvo.createWritable()
  const leitor = resposta.body.getReader()
  let recebido = 0
  try {
    for (;;) {
      const { done, value } = await leitor.read()
      if (done) break
      if (value) {
        await destino.write(value)
        recebido += value.byteLength
        avisar?.({
          porcentagem: total ? Math.min(100, Math.round((recebido / total) * 100)) : null,
          recebido,
          total,
        })
      }
    }
    await destino.close()
    return true
  } catch (e) {
    await destino.abort?.().catch(() => {})
    throw e
  } finally {
    leitor.releaseLock?.()
  }
}

const baixarPorLink = (url: string, nome: string) => {
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Baixa UM arquivo inteiro, do tamanho que for.
 * 1) fluxo para o disco (sem limite);
 * 2) blob em memória;
 * 3) link direto (o navegador baixa sozinho).
 */
export async function baixarArquivoGrande(
  arquivo: Arquivo,
  formato: FormatoSaida = 'original',
  avisar?: AvisoDownload,
): Promise<void> {
  const url = await obterUrl(arquivo)
  if (!url) throw new Error('Arquivo não encontrado')

  const nome = nomeComFormato(arquivo, formato)
  const precisaConverter = formato !== 'original' && arquivoEhImagemExportavel(arquivo)

  let resposta: Response | null = null
  try {
    resposta = await fetch(url, { mode: 'cors', cache: 'no-store' })
  } catch {
    resposta = null
  }

  if (resposta?.ok) {
    // 1) fluxo direto para o disco
    if (!precisaConverter) {
      try {
        if (await salvarEmFluxo(resposta.clone(), nome, avisar)) return
      } catch {
        /* segue para o plano B */
      }
    }
    // 2) blob em memória (+ conversão de formato se pedida)
    try {
      const blob = await resposta.blob()
      avisar?.({ porcentagem: 100, recebido: blob.size, total: blob.size })
      const final = await converterFormato(blob, arquivo, formato)
      const objectUrl = URL.createObjectURL(final)
      baixarPorLink(objectUrl, nome)
      // mantém o object URL vivo até o navegador começar o download
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      return
    } catch {
      /* segue para o plano C */
    }
  }

  // 3) o próprio navegador baixa (funciona para arquivos imensos)
  baixarPorLink(url, nome)
}

export interface ResumoDownloads {
  ok: number
  falhas: { nome: string; erro: string }[]
}

/**
 * Baixa VÁRIOS arquivos de uma vez, cada um inteiro (sem dividir por tamanho).
 * Vai um por um de propósito: assim o navegador não abre 20 downloads juntos
 * e não perde nenhum no meio do caminho.
 */
export async function baixarVariosGrandes(
  arquivos: Arquivo[],
  formato: FormatoSaida = 'original',
  aoAndar?: (indice: number, total: number, arquivo: Arquivo, progresso: ProgressoDownload) => void,
): Promise<ResumoDownloads> {
  const falhas: ResumoDownloads['falhas'] = []
  let ok = 0
  for (let i = 0; i < arquivos.length; i += 1) {
    const arquivo = arquivos[i]
    try {
      await baixarArquivoGrande(arquivo, formato, (p) => aoAndar?.(i, arquivos.length, arquivo, p))
      ok += 1
    } catch (e) {
      falhas.push({ nome: arquivo.nome, erro: (e as Error)?.message ?? 'falha no download' })
    }
    aoAndar?.(i, arquivos.length, arquivo, { porcentagem: 100, recebido: 0, total: null })
  }
  return { ok, falhas }
}

/* ------------------------------------------------------------------ */
/* Pré-visualização leve (performance)                                */
/* ------------------------------------------------------------------ */

/**
 * Carrega a imagem já reduzida (createImageBitmap com resizeWidth), então uma
 * arte de 300 MB não estoura a memória nem trava a tela. Cai para o <img>
 * comum apenas em navegadores antigos.
 */
export async function carregarBitmap(
  origem: Blob | string,
  larguraMaxima = 96,
): Promise<ImageBitmap | HTMLImageElement | null> {
  const blob = typeof origem === 'string' ? await (await fetch(origem, { cache: 'force-cache' })).blob() : origem
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, {
        resizeWidth: larguraMaxima,
        resizeQuality: 'low',
      })
    } catch {
      /* tenta sem redimensionar */
    }
  }
  return new Promise<HTMLImageElement | null>((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** Miniatura pronta para o <img src>: leve por padrão */
export async function miniaturaDoArquivo(arquivo: Arquivo, larguraMaxima = 96): Promise<string | null> {
  if (!arquivoEhImagemExportavel(arquivo)) return null
  const url = await obterUrl(arquivo)
  if (!url) return null
  const bitmap = await carregarBitmap(url, larguraMaxima)
  if (!bitmap) return null
  const largura = 'width' in bitmap ? bitmap.width : larguraMaxima
  const altura = 'height' in bitmap ? bitmap.height : larguraMaxima
  try {
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, largura, altura)
    return canvas.toDataURL('image/jpeg', 0.6)
  } catch {
    return null
  } finally {
    if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) bitmap.close()
  }
}
