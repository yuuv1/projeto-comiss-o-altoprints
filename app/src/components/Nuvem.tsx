import {
  ArrowRight,
  Check,
  Cloud,
  Copy,
  Database,
  KeyRound,
  Link2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Unlink,
} from 'lucide-react'
import { useState } from 'react'
import sqlSchema from '../../supabase/schema.sql?raw'
import { useAuth } from '../lib/auth'
import {
  codigoConexao,
  emNuvem,
  linkDeConexao,
  nuvemTravadaPeloEnv,
  validarConexao,
} from '../lib/supabase'
import { useStore } from '../lib/store'
import { Botao, Campo, Cartao, Entrada, Etiqueta, Modal, cn, useConfirmacao } from './ui'

/** copia um texto para a área de transferência (com reserva para navegadores antigos) */
async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = texto
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

/* ------------------------------------------------------------------ */
/* janela "conectar à nuvem" (usada na tela de login)                  */
/* ------------------------------------------------------------------ */

export function JanelaConexao({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { conectarNuvem } = useStore()
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const conectarPeloCodigo = async () => {
    setErro('')
    setSalvando(true)
    try {
      const { lerCodigoConexao } = await import('../lib/supabase')
      const config = lerCodigoConexao(codigo)
      await conectarNuvem(config.url, config.chave)
      setCodigo('')
      onFechar()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      icone={Cloud}
      largura="max-w-lg"
      titulo="Conectar este aparelho ao banco da empresa"
      subtitulo="Cole aqui o código (ou o link) que o proprietário mandou no grupo."
      rodape={
        <>
          <Botao variante="secundario" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao icone={Link2} onClick={conectarPeloCodigo} carregando={salvando} disabled={!codigo.trim()}>
            Conectar
          </Botao>
        </>
      }
    >
      <div className="space-y-3">
        <Campo
          label="Código ou link de conexão"
          obrigatorio
          dica="Ele começa com “ALT1.” ou é um link que termina com “?nuvem=ALT1.…”."
        >
          <Entrada
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="ALT1.eyJ1IjoiaHR0cHM6Ly8..."
            autoFocus
          />
        </Campo>
        {erro ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {erro}
          </p>
        ) : null}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sem o código, o sistema continua funcionando com os dados salvos <b>neste aparelho</b> (modo local).
        </p>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* aba "Nuvem" das configurações (só o proprietário)                   */
/* ------------------------------------------------------------------ */

export function AbaNuvem() {
  const { db, nuvem, conectarNuvem, desconectarNuvem, enviarDadosParaNuvem, avisar } = useStore()
  const { usuario } = useAuth()
  const { confirmar, dialog } = useConfirmacao()

  const [url, setUrl] = useState('')
  const [chave, setChave] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const travada = nuvemTravadaPeloEnv()

  const conectar = async () => {
    setErro('')
    const problema = validarConexao(url, chave)
    if (problema) {
      setErro(problema)
      return
    }
    setSalvando(true)
    try {
      await conectarNuvem(url, chave)
      setUrl('')
      setChave('')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const conectarPeloCodigo = async () => {
    setErro('')
    setSalvando(true)
    try {
      const { lerCodigoConexao } = await import('../lib/supabase')
      const config = lerCodigoConexao(codigo)
      await conectarNuvem(config.url, config.chave)
      setCodigo('')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const areaDeTransferencia = async (texto: string, oQue: string) => {
    const ok = await copiar(texto)
    avisar(ok ? `${oQue} copiado! Cole no WhatsApp para a equipe.` : `Não foi possível copiar automaticamente — copie do campo abaixo.`, ok ? 'sucesso' : 'erro')
  }

  /* --------------------------- conectado --------------------------- */
  if (nuvem) {
    const link = linkDeConexao()
    const codigoAtual = codigoConexao()
    return (
      <div className="space-y-4">
        <Cartao hover={false}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
              <Cloud className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                Banco na nuvem conectado
                <Etiqueta
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                  icone={ShieldCheck}
                >
                  Tudo igual em todos os aparelhos
                </Etiqueta>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {travada
                  ? 'Configurado pelo arquivo .env deste site.'
                  : 'Este aparelho está ligado ao banco da empresa.'}{' '}
                {db.pedidos.length} pedido(s) carregado(s).
              </p>
            </div>
            <Botao
              variante="secundario"
              icone={RefreshCw}
              carregando={testando}
              onClick={async () => {
                setTestando(true)
                try {
                  await (await import('../lib/backend')).carregarTudo()
                  avisar('Conexão testada: o banco respondeu certinho!')
                } catch (e) {
                  avisar((e as Error).message, 'erro')
                } finally {
                  setTestando(false)
                }
              }}
            >
              Testar conexão
            </Botao>
          </div>
        </Cartao>

        <Cartao hover={false}>
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Link2 className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Conectar os aparelhos da equipe
          </p>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Mande este link no grupo. Quem abrir <b>uma vez</b> fica conectado ao banco da empresa naquele aparelho —
            não precisa digitar nada. O código é a alternativa para quem não consegue abrir o link.
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Entrada value={link} readOnly className="min-w-[220px] flex-1 bg-slate-50 text-xs dark:bg-slate-800" />
              <Botao icone={Copy} onClick={() => areaDeTransferencia(link, 'Link')}>
                Copiar link
              </Botao>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Entrada value={codigoAtual} readOnly className="min-w-[220px] flex-1 bg-slate-50 text-xs dark:bg-slate-800" />
              <Botao variante="secundario" icone={Copy} onClick={() => areaDeTransferencia(codigoAtual, 'Código')}>
                Copiar código
              </Botao>
            </div>
          </div>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Este link carrega a chave <b>pública</b> do projeto — a mesma que qualquer site publicado usa. Ele não dá
            acesso aos dados sem o login de cada pessoa (e nunca use a chave secreta aqui).
          </p>
        </Cartao>

        <Cartao hover={false}>
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Send className="h-4 w-4 text-violet-600 dark:text-violet-400" /> Cuidados e manutenção
          </p>
          <ul className="mb-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <li>
              • <b>Enviar os dados deste aparelho para a nuvem:</b> use se você cadastrou pedidos no modo local e quer
              levá-los para o banco da empresa.
            </li>
            <li>
              • <b>Baixar backup:</b> na aba <b>Dados</b>. O plano grátis do Supabase não faz backup automático — baixe
              um por semana.
            </li>
            <li>
              • <b>Pausa do plano grátis:</b> depois de 1 semana sem uso o banco dorme. Basta entrar em
              supabase.com/dashboard → projeto → <b>Restore project</b>. Nada é perdido.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Botao
              variante="secundario"
              icone={Send}
              onClick={async () => {
                const ok = await confirmar({
                  titulo: 'Enviar os dados deste aparelho para a nuvem?',
                  mensagem:
                    'Tudo o que está aqui (pedidos, clientes, vendedores, contas e configurações) será enviado para o banco da nuvem. Os dados que já estão na nuvem serão substituídos por estes.',
                  textoBotao: 'Enviar para a nuvem',
                })
                if (!ok) return
                try {
                  await enviarDadosParaNuvem()
                } catch (e) {
                  avisar((e as Error).message, 'erro')
                }
              }}
            >
              Enviar dados deste aparelho para a nuvem
            </Botao>
            {!travada ? (
              <Botao
                variante="ghost"
                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                icone={Unlink}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: 'Desconectar este aparelho da nuvem?',
                    mensagem:
                      'Este aparelho volta a guardar os dados só nele. Os dados da nuvem continuam salvos, e você pode reconectar quando quiser.',
                    textoBotao: 'Desconectar',
                  })
                  if (ok) desconectarNuvem()
                }}
              >
                Desconectar este aparelho
              </Botao>
            ) : null}
          </div>
        </Cartao>
        {dialog}
      </div>
    )
  }

  /* ------------------------- ainda não conectado ------------------------ */
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
        <p className="font-bold">Para que serve conectar a nuvem?</p>
        <p className="mt-0.5 text-xs">
          Hoje os dados ficam salvos <b>neste navegador</b>: cada celular/PC teria a sua própria lista. Com o banco na
          nuvem, todos veem os mesmos pedidos de qualquer aparelho. São <b>3 passos</b> e é de graça.
        </p>
      </div>

      <Cartao hover={false}>
        <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-xs font-black text-white">
            1
          </span>
          Crie o projeto no Supabase
        </p>
        <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
          Abra <b>supabase.com</b> → <b>Start your project</b> (grátis, não pede cartão) → <b>New project</b>. Nome:{' '}
          <b>altoprints</b> · Região: <b>South America (São Paulo)</b> · Senha do banco: clique em <b>Generate a</b>
          password e guarde. Espere ~2 minutos.
        </p>
        <Botao variante="secundario" icone={ArrowRight} onClick={() => window.open('https://supabase.com', '_blank')}>
          Abrir o supabase.com
        </Botao>
      </Cartao>

      <Cartao hover={false}>
        <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-xs font-black text-white">
            2
          </span>
          Cole este SQL no projeto (cria tudo, inclusive o espaço das artes)
        </p>
        <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
          No painel do Supabase, abra <b>SQL Editor → New query</b>, cole o conteúdo abaixo e clique em <b>Run</b>. Tem
          que aparecer <b>“Success. No rows returned”</b>. (Pode rodar quantas vezes quiser, não apaga nada.)
        </p>
        <div className="flex flex-wrap gap-2">
          <Botao
            icone={Copy}
            onClick={() => areaDeTransferencia(sqlSchema, 'SQL')}
          >
            Copiar o SQL
          </Botao>
          <Botao
            variante="secundario"
            icone={Sparkles}
            onClick={() => {
              const janela = window.open('', '_blank')
              if (janela) {
                janela.document.write(`<pre>${sqlSchema.replace(/</g, '&lt;')}</pre>`)
                janela.document.close()
              }
            }}
          >
            Ver o SQL
          </Botao>
        </div>
      </Cartao>

      <Cartao hover={false}>
        <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-xs font-black text-white">
            3
          </span>
          Cole aqui a URL e a chave do projeto
        </p>
        <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
          No painel do Supabase, clique em <b>Connect</b> (topo do projeto) ou em <b>Settings → API Keys</b>. Copie a{' '}
          <b>Project URL</b> e a chave <b>publishable</b> (em projetos antigos ela se chama <b>anon</b>).{' '}
          <b>Nunca use a chave secret/service_role</b>.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Project URL" obrigatorio>
            <Entrada
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seuprojeto.supabase.co"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Campo>
          <Campo label="Chave publishable (ou anon)" obrigatorio>
            <Entrada
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="sb_publishable_..."
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Campo>
        </div>
        {erro ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {erro}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Botao icone={Cloud} onClick={conectar} carregando={salvando} disabled={!url.trim() || !chave.trim()}>
            Conectar à nuvem
          </Botao>
          {usuario ? (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              conectado como {usuario.nome} — os dados deste aparelho não são enviados automaticamente
            </span>
          ) : null}
        </div>
      </Cartao>

      <Cartao hover={false}>
        <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <Link2 className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Já tenho um código de conexão
        </p>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Se outra pessoa já configurou a nuvem e te passou o código (começa com “ALT1.”) ou o link, cole aqui.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Campo label="Código ou link" className="min-w-[240px] flex-1">
            <Entrada value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ALT1.eyJ1Ijoi..." />
          </Campo>
          <Botao variante="secundario" icone={Link2} onClick={conectarPeloCodigo} carregando={salvando} disabled={!codigo.trim()}>
            Conectar
          </Botao>
        </div>
      </Cartao>

      <p className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <span>
          Se você não quiser usar a nuvem agora, nada quebra: o sistema continua funcionando com os dados salvos neste
          aparelho. Só lembre que, assim, <b>cada celular tem a sua própria lista</b> — e o backup (aba Dados) vira
          ainda mais importante.
        </span>
      </p>
      {dialog}
    </div>
  )
}
