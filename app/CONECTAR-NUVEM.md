# Conexão online do Altoprints

O site oficial usa **um único projeto Supabase**. A conexão é inserida durante a publicação,
por isso não se cola URL, chave, código ou link em cada aparelho. Se a configuração central
faltar, o site bloqueia o acesso em vez de entrar em modo local.

## Configurar a conexão central

1. No Supabase, abra **Project Settings → API**.
2. Copie a **Project URL** e uma chave pública:
   - atual: `sb_publishable_...`;
   - legada: chave `anon` (JWT que começa com `eyJ`).
3. No host do site, configure as variáveis:
   - `VITE_SUPABASE_URL`;
   - `VITE_SUPABASE_PUBLISHABLE_KEY` **ou** `VITE_SUPABASE_ANON_KEY`.
4. Publique novamente. O workflow valida as variáveis e o pacote final antes do deploy.
5. Abra o mesmo endereço oficial nos aparelhos. Em **Configurações → Nuvem**, confira que
   aparece **Banco na nuvem (Supabase) conectado** e que o endereço do projeto é o esperado.

### Onde definir as variáveis

- **GitHub Pages:** repositório → **Settings → Secrets and variables → Actions**. O workflow
  aceita Repository Secrets ou Repository Variables.
- **Netlify:** **Site configuration → Environment variables**.
- **Vercel:** **Project → Settings → Environment Variables**.

Use somente a chave pública. Nunca coloque a senha do banco, `service_role` ou `sb_secret_`
no site ou no repositório.

## Se a publicação estiver sem conexão

- O workflow falha antes de publicar se URL/chave estiverem ausentes, inválidas ou secretas.
- Um build publicado sem a conexão central mostra **“Conexão com o banco online necessária”**
  e não lê nem grava dados operacionais no navegador.
- Atualize as variáveis do host e publique novamente. Não conecte cada aparelho por códigos
  diferentes: isso permitiria apontar aparelhos para bancos diferentes.

## Confirmação de sincronização

Crie um pedido de teste em um aparelho e confira o mesmo pedido em outro, usando o mesmo
endereço do site. As atualizações aparecem pelo Supabase Realtime e por uma verificação
periódica. Apague o pedido de teste pelo próprio sistema depois da conferência.
