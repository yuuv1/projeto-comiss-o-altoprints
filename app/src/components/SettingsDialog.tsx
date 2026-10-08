import { BellRing, Cloud, Database, Image as ImageIcon, RefreshCw, Settings, Sparkles, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { Botao, Campo, Entrada, Modal, cn, useConfirmacao } from './ui'

export function SettingsDialog({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { db, nuvem, salvarConfig, resetarDados, carregarDemo, avisar } = useStore()
  const { confirmar, dialog } = useConfirmacao()
  const inputLogo = useRef<HTMLInputElement>(null)
  const [nome, setNome] = useState(db.configuracoes.empresa_nome)
  const [chave, setChave] = useState(db.configuracoes.openai_key)
  const [salvando, setSalvando] = useState(false)

  const escolherLogo = (file?: File | null) => {
    if (!file) return
    if (file.size > 400 * 1024) {
      avisar('Escolha uma imagem menor que 400 KB para o logo.', 'erro')
      return
    }
    const leitor = new FileReader()
    leitor.onload = async () => {
      await salvarConfig({ logo_url: String(leitor.result) })
      avisar('Logo atualizado!')
    }
    leitor.readAsDataURL(file)
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      await salvarConfig({ empresa_nome: nome.trim() || 'Altoprints', openai_key: chave.trim() })
      avisar('Configurações salvas!')
      onFechar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Modal
        aberto={aberto}
        onFechar={onFechar}
        icone={Settings}
        largura="max-w-xl"
        titulo="Configurações"
        subtitulo="Logo da empresa, dados de teste e integrações."
        rodape={
          <>
            <Botao variante="secundario" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao onClick={salvar} carregando={salvando}>
              Salvar
            </Botao>
          </>
        }
      >
        <div
          className={cn(
            'mb-5 flex items-start gap-3 rounded-xl border p-3 text-sm',
            nuvem ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50 text-sky-800',
          )}
        >
          {nuvem ? <Cloud className="mt-0.5 h-5 w-5" /> : <Database className="mt-0.5 h-5 w-5" />}
          <div>
            <p className="font-bold">{nuvem ? 'Banco na nuvem (Supabase) conectado' : 'Modo local (navegador)'}</p>
            <p className="text-xs">
              {nuvem
                ? 'Os dados são gravados no banco na nuvem e ficam iguais para todos os computadores.'
                : 'Os dados ficam salvos neste navegador. Para compartilhar entre computadores, configure o Supabase (veja DEPLOY.md).'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Campo label="Nome da empresa">
            <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Altoprints" />
          </Campo>

          <Campo label="Logo da empresa" dica="PNG ou JPG pequeno (até 400 KB). Usada no cabeçalho e nos relatórios impressos.">
            <div className="flex items-center gap-3">
              {db.configuracoes.logo_url ? (
                <img
                  src={db.configuracoes.logo_url}
                  alt="Logo atual"
                  className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-1"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <input
                ref={inputLogo}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => escolherLogo(e.target.files?.[0])}
              />
              <Botao variante="secundario" icone={Upload} onClick={() => inputLogo.current?.click()}>
                Enviar logo
              </Botao>
              {db.configuracoes.logo_url ? (
                <Botao
                  variante="ghost"
                  onClick={async () => {
                    await salvarConfig({ logo_url: '' })
                    avisar('Logo removido.', 'info')
                  }}
                >
                  Remover
                </Botao>
              ) : null}
            </div>
          </Campo>

          <Campo
            label="Chave da IA para ler comprovantes (opcional)"
            dica="Usada no botão 'Importar comprovante' do pedido. Se ficar vazio, o recurso fica desativado."
          >
            <Entrada
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="sk-..."
              type="password"
              autoComplete="off"
            />
          </Campo>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-sky-900">
              <BellRing className="h-4 w-4" /> Revisão de pedidos
            </p>
            <p className="mb-3 text-xs text-sky-800">
              O sistema abre uma janela de revisão a cada 3 dias com os pedidos que não estão "DTF pronto" e "Pago" ao
              mesmo tempo. Você pode abrir essa revisão agora:
            </p>
            <Botao
              tamanho="sm"
              variante="secundario"
              icone={BellRing}
              onClick={async () => {
                await salvarConfig({ revisao_ultima_em: null })
                avisar('Abrindo a revisão de pedidos pendentes...')
                onFechar()
              }}
            >
              Revisar pedidos incompletos agora
            </Botao>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-900">
              <Sparkles className="h-4 w-4" /> Dados de teste
            </p>
            <p className="mb-3 text-xs text-amber-800">
              Carregue pedidos de exemplo para conhecer o sistema, ou apague tudo para começar a usar de verdade.
              {nuvem ? ' Atenção: isto afeta o banco na nuvem de todos os usuários!' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao
                tamanho="sm"
                variante="secundario"
                icone={RefreshCw}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: 'Substituir tudo pelos dados de demonstração?',
                    mensagem: 'Os pedidos, clientes e vendedores atuais serão apagados e substituídos por dados de exemplo.',
                    textoBotao: 'Substituir',
                  })
                  if (ok) await carregarDemo()
                }}
              >
                Carregar demonstração
              </Botao>
              <Botao
                tamanho="sm"
                variante="perigo"
                icone={Trash2}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: 'Apagar todos os dados?',
                    mensagem: 'Pedidos, clientes, vendedores e arquivos serão apagados definitivamente.',
                    textoBotao: 'Apagar tudo',
                  })
                  if (ok) await resetarDados()
                }}
              >
                Apagar todos os dados
              </Botao>
            </div>
          </div>
        </div>
      </Modal>
      {dialog}
    </>
  )
}
