# Supabase do Altoprints — configuração passo a passo

> **Importante:** o site oficial funciona somente online e usa um único projeto Supabase.
> Não há modo local de produção nem configuração por aparelho. Se o build não tiver a
> conexão central, a publicação é bloqueada.

## 1. Criar o projeto e as tabelas

1. Em <https://supabase.com>, crie/abra o projeto oficial `altoprints` na região South
   America (São Paulo).
2. No menu, entre em **SQL Editor → New query**.
3. Abra [`supabase/schema.sql`](supabase/schema.sql), copie o conteúdo inteiro, cole no
   editor e clique **Run**. O script é idempotente: completa o esquema e não apaga pedidos.
4. Confirme **Success. No rows returned**.

## 2. Copiar somente os dados públicos da API

Em **Project Settings → API**, copie:

- **Project URL**;
- a chave pública `publishable` (`sb_publishable_...`) ou, em projeto antigo, a chave
  pública `anon` (JWT que começa com `eyJ`).

**Nunca** copie `sb_secret_`, `service_role` ou a senha do banco para o site. O pacote de
produção recusa chaves secretas.

## 3. Configurar a publicação

No repositório GitHub, acesse **Settings → Secrets and variables → Actions** e defina estes
nomes com os valores do mesmo projeto:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY` (recomendado), ou `VITE_SUPABASE_ANON_KEY` (legado).

Podem ser Repository Secrets ou Repository Variables. Depois, execute o workflow
**Actions → Publicar sistema (GitHub Pages)**. O workflow valida a configuração antes do
build e verifica que URL e chave pública foram embutidas no pacote. Se faltar qualquer
valor, não publica uma versão sem conexão.

Para Netlify/Vercel, configure os mesmos nomes em **Environment Variables** e faça um novo
deploy. Para gerar um pacote manual, use `npm run publicar` com as variáveis presentes.

## 4. Confirmar que todos usam o mesmo banco

1. Abra o endereço oficial e confira **Configurações → Nuvem → Banco na nuvem (Supabase)
   conectado**.
2. Compare o domínio do projeto e a hora da última leitura entre aparelhos.
3. Cadastre um pedido de teste num aparelho e confirme que aparece no outro; depois apague
o teste.
4. Compartilhe apenas o mesmo endereço oficial. Não envie códigos de conexão diferentes.

## Se o banco não conectar

- **Workflow bloqueou:** confira URL e chave pública nas Secrets/Variables; nunca coloque
  uma chave secreta.
- **Site mostra “Conexão com o banco online necessária”:** o build publicado não recebeu
  as variáveis centrais; configure-as e publique de novo. O app não usará armazenamento local para dados operacionais.
- **Tabelas ausentes:** rode `supabase/schema.sql` no SQL Editor do projeto correto.
- **Projeto pausado:** abra o painel Supabase e restaure o projeto. O app tentará novamente
  quando o serviço voltar.

Veja também [`DEPLOY.md`](DEPLOY.md) para publicação e recuperação de senha e
[`CONECTAR-NUVEM.md`](CONECTAR-NUVEM.md) para um resumo curto.
