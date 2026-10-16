/**
 * Gera a pasta ../publicar com o site prontinho para jogar no Netlify Drop.
 *
 * Uso:  npm run publicar
 *
 * A pasta sai com:
 *   index.html, assets/...   (o site compilado, para hospedar)
 *   Altoprints.html          (ARQUIVO ÚNICO: abre com dois cliques, sem servidor)
 *   _redirects               (regra do Netlify para o sistema funcionar em qualquer endereço)
 *   LEIA-ME.txt              (passo a passo de como subir)
 *
 * Por que o arquivo único: quando o index.html é aberto direto do computador
 * (endereço começando com "file://"), o navegador bloqueia o carregamento dos
 * arquivos da pasta "assets" (política de segurança) e a tela fica em branco.
 * No Altoprints.html o programa e o visual vão embutidos no próprio arquivo,
 * então ele funciona com dois cliques, sem internet e sem instalar nada.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const app = resolve(aqui, '..')
const destino = resolve(app, '..', 'publicar')

console.log('\n➡️  Compilando o site...\n')
const r = spawnSync('npx', ['vite', 'build'], { cwd: app, stdio: 'inherit', shell: process.platform === 'win32' })
if (r.status !== 0) process.exit(r.status ?? 1)

console.log('\n➡️  Montando a pasta "publicar"...\n')
await rm(destino, { recursive: true, force: true })
await mkdir(destino, { recursive: true })
await cp(resolve(app, 'dist'), destino, { recursive: true })

await writeFile(
  resolve(destino, '_redirects'),
  '# mantém o endereço funcionando em qualquer caminho (SPA)\n/*  /index.html  200\n',
)

/* ------------------------- arquivo único (offline) ------------------------ */
// Junta o HTML + o CSS + o programa num só arquivo, para abrir com dois cliques.
console.log('➡️  Montando o arquivo único (Abrir no computador)...')

const lerAssets = async (html) => {
  let saida = html

  // <script type="module" src="./assets/..."></script>  ->  <script type="module">...</script>
  const scripts = [...saida.matchAll(/<script[^>]*\ssrc="(\.\/assets\/[^"]+)"[^>]*><\/script>/g)]
  for (const [tag, caminho] of scripts) {
    const js = await readFile(resolve(destino, caminho), 'utf8')
    // "</script" dentro de um texto do programa fecharia a etiqueta antes da hora
    const seguro = js.replace(/<\/script/gi, '<\\/script')
    // substituição por FUNÇÃO: com texto, os "$" do programa viram comandos e embaralham tudo
    saida = saida.replace(tag, () => `<script type="module">\n${seguro}\n</script>`)
  }

  // <link rel="stylesheet" href="./assets/...">  ->  <style>...</style>
  const estilos = [...saida.matchAll(/<link[^>]*href="(\.\/assets\/[^"]+\.css)"[^>]*>/g)]
  for (const [tag, caminho] of estilos) {
    const css = await readFile(resolve(destino, caminho), 'utf8')
    saida = saida.replace(tag, () => `<style>\n${css}\n</style>`)
  }

  // tira o que sobrou apontando para a pasta assets (preloads, por exemplo)
  saida = saida
    .replace(/<link[^>]*rel="modulepreload"[^>]*>\s*/g, '')
    .replace(/ crossorigin/g, '')

  return saida
}

const htmlDist = await readFile(resolve(destino, 'index.html'), 'utf8')
const htmlUnico = await lerAssets(htmlDist)

// conferência: o arquivo único não pode depender da pasta assets nem ter HTML duplicado
const problemas = []
if (/(src|href)="\.\/assets\//.test(htmlUnico)) problemas.push('ainda aponta para a pasta assets')
if ((htmlUnico.match(/<div id="root">/g) ?? []).length !== 1) problemas.push('o HTML saiu duplicado')
if (htmlUnico.includes('<script type="module" src=')) problemas.push('o programa não foi embutido')
if (htmlUnico.length < 600_000) problemas.push('o arquivo saiu pequeno demais')
if (problemas.length) {
  console.log(`   ❌ O arquivo único saiu com problema: ${problemas.join('; ')}`)
  process.exit(1)
}
await writeFile(resolve(destino, 'Altoprints.html'), htmlUnico)

const pacote = JSON.parse(await readFile(resolve(app, 'package.json'), 'utf8'))
await writeFile(
  resolve(destino, 'LEIA-ME.txt'),
  [
    `Altoprints — Sistema de Pedidos DTF  (versão ${pacote.version})`,
    '',
    'O SISTEMA COMEÇA VAZIO, DO ZERO:',
    '  - Nenhum pedido, cliente ou impressão vem pronto.',
    '  - JESSICA, RAISSA e ANDREIA já vêm cadastradas na tela inicial: cada uma',
    '    entra TOCANDO NO PRÓPRIO NOME (sem senha).',
    '  - Só o PROPRIETÁRIO usa senha: o primeiro acesso de proprietário é criado',
    '    por você, na hora (veja "PRIMEIRO ACESSO" abaixo).',
    '  - Exemplos para treinar a equipe são opcionais e fictícios: entram só se você',
    '    pedir em Configurações → Dados → "Carregar demonstração" (e a tela fica com',
    '    um aviso amarelo de "dados de exemplo" até você apagar).',
    '',
    'DUAS FORMAS DE USAR:',
    '',
    '  A) NO COMPUTADOR, SEM INTERNET (jeito mais rápido de ver o sistema):',
    '     - Clique DUAS VEZES no arquivo  Altoprints.html  (está nesta pasta)',
    '     - Ele abre no navegador já funcionando; os dados ficam salvos nesse computador',
    '     - NÃO abra o "index.html" com dois cliques: ele fica em branco (é só para hospedar)',
    '',
    '  B) NO AR, PARA A EQUIPE TODA (Netlify Drop):',
    '     1. Abra https://app.netlify.com/drop',
    '     2. Arraste ESTA PASTA inteira (a pasta "publicar") para a área pontilhada',
    '     3. Espere o "Deploy" terminar e clique em CLAIM SITE (reivindicar) para o site virar seu',
    '     4. Pronto: o endereço aparece no topo da página',
    '',
    'COMO ATUALIZAR DEPOIS:',
    '  - Rode de novo:  npm run publicar',
    '  - Arraste a pasta "publicar" de novo na página do site (Deploys → Drag and drop)',
    '  - O arquivo Altoprints.html é gerado de novo junto (é só clicar duas vezes nele)',
    '',
    'PRIMEIRO ACESSO (criar o dono do sistema):',
    `  1. Abra o sistema e vá no endereço  .../#/administracao`,
    '     (alternativas: 5 toques seguidos no logo, ou Ctrl + Alt + D no computador)',
    '  2. Como ainda não existe proprietário, a tela oferece "Criar acesso do proprietário":',
    '     digite o seu nome, o usuário e uma SENHA FORTE (guarde-a bem).',
    '  3. Salve esse endereço como ícone na tela de início do celular: entra com 1 toque.',
    '  4. Quer um segundo login de dono (sócio, gerente, escritório)?',
    '     Equipe → Nova conta → Tipo de acesso: "Proprietário — vê tudo (com senha)".',
    '  5. Contas da equipe: JESSICA, RAISSA e ANDREIA já aparecem na tela inicial',
    '     (entram pelo nome, sem senha). Para adicionar mais alguém: Equipe → Nova',
    '     conta, ou a própria pessoa toca em "Sou funcionário novo — criar meu acesso".',
    '',
    'ONDE OS DADOS FICAM (importante):',
    '  - Neste aparelho, os dados ficam guardados no próprio navegador, num espaço',
    '    grande (IndexedDB) — o registro de impressões, pedidos e clientes não',
    '    esbarra mais no limite pequeno do navegador.',
    '  - SEM A NUVEM, CADA APARELHO TEM OS PRÓPRIOS DADOS: o celular do vendedor não',
    '    vê os pedidos do computador. Para a equipe trabalhar junta, conecte a nuvem',
    '    (Configurações → Nuvem) — leva uns 8 minutos e é grátis.',
    '',
    'CONECTAR A EQUIPE (banco na nuvem) — 3 passos, com o sistema aberto:',
    '  - Configurações → Nuvem → siga o assistente: cria o projeto do Supabase,',
    '    copia o SQL (1 clique), cola a URL e a chave, conecta.',
    '  - Depois clique em "Copiar link" e mande o link no grupo: quem abrir uma vez',
    '    fica conectado naquele aparelho.',
    '  - Guia completo: app/CONECTAR-NUVEM.md',
    '',
    'ANTES DE COMEÇAR A USAR DE VERDADE:',
    '  - Se carregou os exemplos para treinar: Configurações → Dados →',
    '    "Apagar todos os dados" (o seu acesso de proprietário é mantido).',
    '  - Confira as comissões e os preços em Configurações.',
    '  - Envie o logo da empresa em Configurações → Empresa.',
    '  - Faça backup de vez em quando (Configurações → Dados → Baixar backup).',
    '',
    'SE APARECER UM ERRO DE "SEM ESPAÇO" OU NADA FOR SALVO:',
    '  - Confira se a janela do navegador não está ANÔNIMA/PRIVADA: nesse modo o',
    '    navegador não deixa o sistema salvar nada. Abra numa janela normal.',
    `  - A tela de login avisa quando isso está acontecendo e mostra a versão do`,
    `    sistema no rodapé (ex.: "versão ${pacote.version}").`,
    '  - Em Configurações → Dados existe o bloco "Onde os dados ficam neste aparelho",',
    '    com o botão "Liberar espaço" quando o armazenamento antigo estiver cheio.',
    '',
    'ESQUECI A SENHA DO PROPRIETÁRIO:',
    '  - O caminho está em app/DEPLOY.md (título "Esqueci a senha").',
    '',
  ].join('\n'),
)

/* --------------------- conferência antes de entregar -------------------- */
// Nada de credencial de exemplo ou dado de pessoa real pode ir para o ar: o
// guarda roda sozinho aqui e também pelo "npm run checar".
console.log('➡️  Conferindo o pacote (credenciais, dados pessoais e estrutura)...')
const checagem = spawnSync(process.execPath, [resolve(aqui, 'checar-publicacao.mjs')], {
  cwd: app,
  stdio: 'inherit',
})
if (checagem.status !== 0) {
  console.log('❌ Publicação cancelada: resolva os problemas acima e rode de novo.\n')
  process.exit(checagem.status ?? 1)
}

console.log('✅ Pasta pronta:', destino)
console.log('   Arquivo único (dois cliques):', resolve(destino, 'Altoprints.html'))
console.log('   Arraste a pasta em https://app.netlify.com/drop\n')

