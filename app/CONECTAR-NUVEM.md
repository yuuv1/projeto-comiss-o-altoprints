# Conectar a nuvem em 3 passos (≈8 minutos)

> O sistema faz quase tudo sozinho. Você só precisa de **uma conta grátis no Supabase**
> (empresa que guarda o banco de dados). Não precisa mexer em arquivo, não precisa
> reinstalar nada, não precisa reenviar o site.
>
> **Sem isso:** cada celular/PC guarda a própria lista de pedidos (modo local).
> **Com isso:** todos veem os mesmos pedidos, de qualquer aparelho.

---

## Passo 1 — Criar o projeto (≈3 min)

1. Abra **<https://supabase.com>** → **Start your project** (grátis, sem cartão).
   Entre com GitHub ou e-mail.
2. Clique em **New project** e preencha:
   - **Name:** `altoprints`
   - **Database Password:** clique em **Generate a password** e depois em **Copy**
     → guarde essa senha no seu gerenciador de senhas (você quase não vai usá-la, é a
     senha técnica do banco).
   - **Region:** **South America (São Paulo)**
   - **Plan:** Free
3. Clique em **Create new project** e espere ~2 minutos.

## Passo 2 — Colar o SQL (≈1 min)

1. No painel do projeto, abra **SQL Editor** → **New query**.
2. No **sistema Altoprints** (no seu computador), entre como proprietário e abra
   **Configurações → Nuvem**.
3. Clique em **“Copiar o SQL”**.
4. Volte ao Supabase, cole na janela (Ctrl+V) e clique em **Run**.
5. Tem que aparecer a mensagem verde **“Success. No rows returned”**.

> Esse passo cria as tabelas **e** o espaço das artes — não precisa fazer nada em
> *Storage* na mão. Pode rodar de novo quantas vezes quiser: não apaga dados.

## Passo 3 — Colar 2 informações e conectar (≈2 min)

1. No Supabase, clique em **Connect** (botão no topo do projeto). A janela mostra a
   **Project URL** e a chave pública.
   - A chave se chama **publishable** (`sb_publishable_...`) nos projetos novos. Nos
     antigos ela aparece como **anon** (começa com `eyJ`). **As duas funcionam.**
   - 🚫 **Nunca** use a chave `secret` / `service_role`.
2. Volte em **Configurações → Nuvem** no sistema, cole a **URL** e a **chave** e clique
   em **Conectar à nuvem**.
3. Deve aparecer “Banco na nuvem conectado” e um aviso de que o banco respondeu.
   - Em **Configurações → Empresa** também aparece a etiqueta verde
     **“Banco na nuvem (Supabase) conectado”**.

**Pronto.** O sistema agora está na nuvem.

---

## Passo 4 (o melhor) — Conectar os aparelhos da equipe

Em **Configurações → Nuvem** aparece o cartão **“Conectar os aparelhos da equipe”**:

1. Clique em **Copiar link**.
2. Mande no grupo do WhatsApp: *“Abram este link uma vez para o sistema ficar conectado.”*
3. Quem abrir o link já fica conectado naquele celular — não precisa digitar nada.

Alternativas, se o link não abrir em algum aparelho:
- Envie o **código** (botão *Copiar código*): na tela de login há
  **“Conectar este aparelho ao banco da empresa”** — cola o código e pronto.
- Ou mande a **URL** e a **chave pública** para quem for configurar manualmente.

> Se você cadastrou pedidos antes de conectar (modo local), use o botão
> **“Enviar dados deste aparelho para a nuvem”** para levá-los junto.

---

## Conferindo que deu tudo certo

- [ ] **Configurações → Empresa**: etiqueta verde “Banco na nuvem (Supabase) conectado”
- [ ] Criou um pedido de teste no computador e ele aparece no celular (ou vice-versa)
- [ ] Enviou um arquivo de arte em um pedido (testa o espaço das artes)
- [ ] Um aparelho da equipe abriu o link e entrou com a senha dele
- [ ] **Configurações → Dados → Baixar backup** funcionou (guarde o arquivo)

---

## Três avisos importantes sobre o plano grátis

1. **Ele dorme depois de 1 semana sem uso.** No dia a dia da loja não acontece; em
   períodos parados, entre em <https://supabase.com/dashboard>, abra o projeto e clique
   em **Restore project**. Nada é perdido.
2. **Não tem backup automático.** Por isso existe **Configurações → Dados → Baixar
   backup**: faça uma vez por semana e guarde o arquivo.
3. **Limites generosos para uma loja:** 500 MB de banco (centenas de milhares de pedidos)
   e 1 GB de artes. Se um dia apertar, o caminho é apagar artes antigas ou o plano Pro
   (US$ 25/mês).

---

## Se algo der errado

| O que aparece | Como resolver |
| --- | --- |
| “as tabelas ainda não foram criadas no Supabase” | o Passo 2 não foi feito (ou o Run não terminou) |
| “não foi possível falar com o banco na nuvem” | internet caiu **ou** o projeto está dormindo → **Restore project** |
| “a chave do Supabase parece inválida” | chave errada, incompleta ou secreta → refaça o Passo 3 |
| “Falha ao enviar o arquivo” | o SQL não foi rodado por completo → rode o Passo 2 de novo |
| Quero trocar de projeto | **Configurações → Nuvem → Desconectar** e conecte com os novos dados |

---

<details>
<summary><b>Modo avançado (opcional): configurar pelo arquivo <code>.env</code></b></summary>

Se você preferir (ou usar Netlify conectado ao GitHub), dá para fixar a conexão no
próprio site, sem depender de ninguém colar nada:

1. Crie o arquivo **`app/.env`** com:
   ```
   VITE_SUPABASE_URL=https://seuprojeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   (ou `VITE_SUPABASE_ANON_KEY=` com a chave antiga)
2. Rode `npm run publicar` e arraste a pasta `publicar` no Netlify.

Assim todo mundo que abrir o site já está conectado. Nesse modo a tela Nuvem fica só
informativa (não deixa desconectar).
</details>
