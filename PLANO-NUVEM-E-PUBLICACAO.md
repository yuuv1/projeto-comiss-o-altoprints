# Nuvem e publicação — situação atual

> Este arquivo substitui o plano antigo, que permitia publicar sem banco e conectar cada
> aparelho separadamente. **Esse procedimento não vale mais.** Leia [`LANCAMENTO.md`](LANCAMENTO.md)
> para o passo a passo atualizado.

## Regra da publicação oficial

O site oficial usa **um único Supabase central**. O workflow exige `VITE_SUPABASE_URL` e
uma chave pública (`VITE_SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_ANON_KEY`), valida que
são válidas e confere que foram incluídas no pacote. Se faltarem, o deploy para e o site
não entra em modo local. O runtime também ignora conexão antiga salva no aparelho e códigos
`?nuvem=` diferentes.

O valor da chave pública não é uma senha; nunca use `service_role`, `sb_secret_` ou a senha
do banco. As variáveis precisam apontar para o mesmo projeto Supabase oficial.

## Confirmar a configuração do GitHub

No repositório, acesse **Settings → Secrets and variables → Actions**. Confirme que estão
definidos:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY` (recomendado) ou `VITE_SUPABASE_ANON_KEY` (legado).

O workflow aceita Secrets ou Variables, não imprime os valores e bloqueia o deploy se
estiverem ausentes/incorretos. A configuração real deve ser conferida no GitHub Actions; os
valores nunca são guardados no código.

## Dados e implantação

- Pedidos, clientes, acessos, configurações e arquivos operacionais usam o Supabase central.
- O app não migra nem apaga automaticamente dados antigos que possam estar salvos num
  navegador; eles não são lidos como fonte de produção.
- Todos os aparelhos abrem o mesmo endereço oficial; não precisam de códigos de conexão.
- Para atualizar, envie a alteração à `main`; o GitHub Actions testa, gera o pacote e
  publica. Se Pages estiver indisponível, use o artefato online produzido por uma execução
  bem-sucedida no Netlify Drop.
- Se houver falha de internet/Supabase, o app não grava uma cópia local. Aguarde a conexão
  voltar e tente novamente.

Consulte [`app/DEPLOY.md`](app/DEPLOY.md) para os hosts, variáveis e recuperação de acesso.
