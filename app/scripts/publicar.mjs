/**
 * Gera a pasta ../publicar com o site prontinho para jogar no Netlify Drop.
 *
 * Uso:  npm run publicar
 *
 * A pasta sai com:
 *   index.html, assets/...   (o site compilado)
 *   _redirects               (regra do Netlify para o sistema funcionar em qualquer endereço)
 *   LEIA-ME.txt              (passo a passo de como subir)
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

const pacote = JSON.parse(await readFile(resolve(app, 'package.json'), 'utf8'))
await writeFile(
  resolve(destino, 'LEIA-ME.txt'),
  [
    `Altoprints — Sistema de Pedidos DTF  (versão ${pacote.version})`,
    '',
    'COMO PUBLICAR (Netlify Drop):',
    '  1. Abra https://app.netlify.com/drop',
    '  2. Arraste ESTA PASTA inteira (a pasta "publicar") para a área pontilhada',
    '  3. Espere o "Deploy" terminar e clique em CLAIM SITE (reivindicar) para o site virar seu',
    '  4. Pronto: o endereço aparece no topo da página',
    '',
    'COMO ATUALIZAR DEPOIS:',
    '  - Rode de novo:  npm run publicar',
    '  - Arraste a pasta "publicar" de novo na página do site (Deploys → Drag and drop)',
    '',
    'PRIMEIRO ACESSO (proprietário):',
    '  - Endereço:   .../#/administracao   (salve na tela de início do celular)',
    '  - Alternativa: 5 toques no logo, ou Ctrl + Alt + D no computador',
    '  - Essa tela cria o acesso do proprietário (na primeira vez).',
    '',
    'CONECTAR A EQUIPE (banco na nuvem) — 3 passos, com o sistema aberto:',
    '  - Configurações → Nuvem → siga o assistente: cria o projeto do Supabase,',
    '    copia o SQL (1 clique), cola a URL e a chave, conecta.',
    '  - Depois clique em "Copiar link" e mande o link no grupo: quem abrir uma vez',
    '    fica conectado naquele aparelho.',
    '  - Guia completo: app/CONECTAR-NUVEM.md',
    '',
    'IMPORTANTE:',
    '  - Sem a nuvem conectada, cada aparelho guarda a própria lista de pedidos.',
    '  - Faça backup de vez em quando (Configurações → Dados → Baixar backup).',
    '',
  ].join('\n'),
)

console.log('✅ Pasta pronta:', destino)
console.log('   Arraste essa pasta em https://app.netlify.com/drop\n')
