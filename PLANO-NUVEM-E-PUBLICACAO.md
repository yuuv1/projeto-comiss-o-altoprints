# Plano — conectar o Supabase e deixar o site no ar
### o que falta para a equipe toda usar o sistema de verdade

**Situação em 30/10/2026:** o site está no ar pelo **GitHub Pages**
(<https://yuuv1.github.io/projeto-comiss-o-altoprints/>) na **versão 1.3.0**,
mas ainda em **modo local** — cada celular/computador guarda os próprios dados.
Até a nuvem ser conectada, o pedido criado no computador da loja **não aparece**
no celular da vendedora.

| O que já está pronto | O que falta |
| --- | --- |
| Site publicado e atualizando sozinho a cada envio na `main` (roda testes, build e conferência de segurança) | Criar o projeto no **Supabase** e rodar o SQL |
| Tela **Configurações → Nuvem** com o assistente em 3 passos (colar código, testar, conectar) | Conectar o banco (pelo sistema ou pelas *Secrets* do GitHub) |
| `app/supabase/schema.sql` (tabelas, bucket das artes, índices) | Criar as contas da equipe **já dentro da nuvem** |
| Backup e restauração em *Configurações → Dados* | Testar em 2 aparelhos e combinar o backup semanal |

---

## 1. Publicação — qual caminho seguir

| Caminho | Como funciona | Vantagens | Quando usar |
| --- | --- | --- | --- |
| **GitHub Pages** (é o que está no ar) | todo envio na `main` dispara o robô: testes → build → publicação | zero manutenção, endereço estável, já ligado | **recomendado** — manter este |
| **Netlify Drop** | arrastar a pasta `publicar/` em <https://app.netlify.com/drop> | domínio próprio fácil, funciona em repositório privado | reserva, ou se quiser `www.seudominio.com.br` |
| **`Altoprints.html`** | arquivo único, abre com dois cliques, sem internet | bom para treinar/testar num PC | treino e demonstração |

> **Decisão sugerida:** continuar no **GitHub Pages** e só pensar em domínio próprio
> quando o sistema já estiver com a nuvem funcionando. O Netlify continua documentado
> como plano B (o robô do GitHub também gera a pasta pronta e o artefato
> `Altoprints-pronto-para-publicar` a cada execução).

---

## 2. Supabase — passo a passo (≈10 min)

1. **Criar o projeto** em <https://supabase.com> (grátis, sem cartão): nome `altoprints`,
   **Region: South America (São Paulo)**, senha do banco gerada e guardada.
2. **Rodar o SQL**: *SQL Editor → New query* → cole o conteúdo de
   [`app/supabase/schema.sql`](app/supabase/schema.sql) (ou use *Configurações → Nuvem →
   Copiar o SQL* depois de entrar como proprietário) → **Run**. Tem que aparecer
   *“Success. No rows returned”*. Pode rodar de novo sempre que quiser: só completa o
   que falta, nunca apaga.
3. **Pegar a chave pública**: *Project Settings → API Keys* → **publishable**
   (`sb_publishable_…`; em projeto antigo, a **anon**). **Nunca** use a `secret`/`service_role`.
4. **Conectar** — duas formas, e dá para fazer as duas:
   - **Pelo sistema (mais simples):** entre como proprietário → *Configurações → Nuvem* →
     cole o endereço `https://xxxx.supabase.co` + a chave (ou o “código de conexão”
     gerado ali mesmo) → **Testar e conectar**.
   - **Pelo GitHub (para todo mundo já nascer conectado):** *Settings → Secrets and
     variables → Actions* → criar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` →
     rodar o workflow *Publicar sistema* de novo. Aí cada aparelho abre já ligado ao banco
     da empresa (sem ninguém colar chave).
5. **Conferir:** *Configurações → Nuvem* mostra **“Banco na nuvem conectado”** e a tela de
   entrada troca o aviso de “modo local”.

---

## 3. Ordem que eu recomendo (para não fazer conta em dobro)

1. **Publicar esta versão (1.3.0)** na `main` — o site já sai com o Painel novo, a busca
   `Ctrl + K` e o checklist de primeiros passos.
2. **Criar o Supabase** e rodar o SQL.
3. **Conectar a nuvem** (pelo sistema ou pelas *Secrets*) e conferir com **dois aparelhos**:
   criar um pedido no computador e ver aparecer no celular (e vice-versa).
4. **Criar as contas da equipe** com a nuvem já ligada — assim elas nascem no banco da
   empresa e o `sem senha` (tocar no nome) funciona em qualquer aparelho.
5. **Baixar o primeiro backup** (*Configurações → Dados*) e combinar o hábito semanal.

> Se as contas forem criadas **antes** da nuvem, elas ficam só naquele navegador. Não é
> problema: dá para recriar em *Equipe → Nova conta* (ou repetir os passos com a nuvem ligada).

---

## 4. Cuidados que valem combinar agora

| Assunto | Situação | O que fazer |
| --- | --- | --- |
| **Plano grátis do Supabase** | o projeto “dorme” depois de ~1 semana sem uso | abrir o painel e clicar **Restore project**; nada se perde |
| **Backup** | o plano grátis não tem backup automático | *Configurações → Dados → Baixar backup* toda semana (ou depois de um dia cheio) |
| **Chave secreta** | nunca deve ir para o site | o robô (`npm run checar`) bloqueia publicação com `sb_secret_`/`service_role` |
| **Quem entra sem senha** | JESSICA, RAISSA e ANDREIA tocam no nome | manter; se um celular for perdido, *Equipe → Desativar* o acesso |
| **Sigilo dos dados** | o banco usa a chave pública com leitura/escrita liberada (RLS “aberto”) — é um sistema **interno** | manter o link fora de grupos abertos; se quiser trancar de verdade, o próximo passo é **Supabase Auth + políticas por usuário** (não muda as telas) |
| **Esqueci a senha do dono** | — | `app/DEPLOY.md` → seção “Esqueci a senha” (uma linha de SQL resolve) |

---

## 5. O que eu preciso decidir com você antes de executar

1. **Onde publicar:** manter o **GitHub Pages** (recomendo) ou ir para o **Netlify**?
2. **Como conectar:** pelo próprio sistema (*Configurações → Nuvem*) ou pelas **Secrets**
   do GitHub (todo aparelho já abre conectado)?
3. **Quem pode ver o quê:** seguimos com o login do sistema (senha só para o dono) ou
   você quer que eu prepare o **Supabase Auth + RLS** para trancar o banco por acesso?
4. **Domínio:** usamos o endereço do GitHub Pages mesmo ou você quer um
   `www.altoprints.com.br` (compra à parte)?

---

## 6. Checklist de aceite (quando a nuvem estiver ligada)

- [ ] *Configurações → Nuvem* mostra **“Banco na nuvem conectado”**
- [ ] Pedido criado no computador aparece no celular em segundos
- [ ] Marcar **pago/concluído** num aparelho aparece no outro
- [ ] Foto de arte enviada num aparelho abre no outro
- [ ] JESSICA, RAISSA e ANDREIA entram pelo nome em **qualquer** aparelho
- [ ] Relatório do mês mostra os mesmos números nos dois aparelhos
- [ ] Primeiro backup baixado e guardado
- [ ] Site mostra **versão 1.3.0** no rodapé da tela de entrada
