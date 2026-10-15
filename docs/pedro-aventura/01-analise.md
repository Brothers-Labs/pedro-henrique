# Pedro Aventura: Temporada do Pedro 3D — Análise

Data: 14/10/2026 · Repositório: `Brothers-Labs/pedro-henrique` · Branch: `staging`

Documentos relacionados:
- [02-prompt-mestre.md](02-prompt-mestre.md): o pedido original, guardado sem alterações.
- [03-plano-de-desenvolvimento.md](03-plano-de-desenvolvimento.md): arquitetura, marcos e critérios de aceite.
- [04-relatorio-final.md](04-relatorio-final.md): o que foi entregue.
- [CLAUDE_QUEUE.md](CLAUDE_QUEUE.md): a fila de demandas.

## 1. O pedido

Criar a **Temporada do Pedro 3D**, um jogo 3D de verdade para o navegador, a partir de quatro mocks:

1. Lobby.
2. Mapa com seis regiões.
3. Gameplay de corrida com obstáculos.
4. Passe de temporada Gratuito, VIP e Luxo.

O jogo abre em uma rota própria (`/pedro-aventura`) e em tela própria. O site atual continua como está: Pedro Maker, Kart, Flash, Aventura, mascote e prancha de falar.

## 2. Estado do repositório (verificado)

| Item | Situação |
| --- | --- |
| Stack | Angular 20.3: componentes standalone, signals, OnPush, TypeScript strict |
| 3D | `three@0.186` já instalado e usado pelo Pedro Maker, Kart e Flash. Carrega sob demanda, fora do bundle inicial |
| Utilitários 3D existentes | `GameLoop` (física em passo fixo), `QUALITY`, `FrameBudgetMonitor` e `initialQualityTier` (qualidade automática), `disposeTree` (liberação de GPU) e `SeededRandom` (geração determinística) |
| Preferências globais | `MotionPreferenceService` e `CalmModeService` (modo calmo e movimento reduzido) |
| Persistência | `localStorage` com chave versionada e saneamento campo a campo. IndexedDB para conteúdo grande |
| Backend | **Não existe.** `environment.apiUrl` é `null`. Não há banco, migrações nem API de jogo |
| Autenticação | Há telas e serviço (`AuthService`), mas sem servidor configurado |
| Pagamentos | Fluxo de Pix por comprovante manual, documentado e sem servidor. Não existe registro de "quem comprou o quê" |
| Testes | Karma + Jasmine: 736 testes passando antes desta demanda |
| Lint, E2E, verify e vtest | Não há ESLint, Playwright nem scripts `verify` ou `vtest` no `package.json` |
| CI | Não existe pasta `.github`: o repositório não tem GitHub Actions |
| Deploy | Vercel (`vercel.json`). Rotas fora do pré-render caem no `index.csr.html` |
| Layout do site | `App` sempre desenha cabeçalho, menu lateral, rodapé e barra inferior. Hoje não há rota em tela cheia |
| Fila `CLAUDE_QUEUE.md` | Não existia. Foi criada nesta demanda |

## 3. Leitura dos mocks

| Mock | O que pede | Observações |
| --- | --- | --- |
| Lobby | Pedro e o cachorro em 3D, cenário noturno de luxo, carro, nível e XP, moedas e diamantes, contagem regressiva, missões diárias, evento especial, Jogar Agora, Explorar Mapa e os passes | O menu lateral tem Mapa, Missões, Passe, Loja, Personagem, Veículos, Conquistas e Ranking |
| Mapa | Ilha 3D com seis regiões, cadeado, estrelas (`20/20`), faixa de cartões das regiões e "próxima recompensa" | O mapa precisa servir também como seletor de fases |
| Gameplay | Corrida em terceira pessoa com o cachorro ao lado. Painel com fase, corações, cronômetro, coletáveis, moedas e XP. Objetivos da fase, rampas, minimapa, barra de progresso e os botões Pular, Derrapar e Atacar | O direcional virtual vale para o celular |
| Passe | Trilha por nível em três faixas, "comprar níveis", destaques do nível 20 e atalhos para missões, eventos, conquistas e loja | Mostra preço em R$ |

## 4. Restrições e decisões

| # | Decisão | Motivo |
| --- | --- | --- |
| D1 | **Three.js, não Babylon.js** | O prompt manda preservar a stack existente. O Three.js já está no projeto, com utilitários testados. Duas engines 3D dobrariam o peso e a manutenção |
| D2 | **Jogo isolado em `features/pedro-aventura/`** | Não importa estado nem serviço do Maker, Kart, Flash ou mascote. Reaproveita só utilitários genéricos de motor (relógio, qualidade, descarte e aleatório com semente), do mesmo jeito que o Flash já faz |
| D3 | **Tela cheia por dado da rota (`data.immersive`)** | O `App` esconde o cabeçalho e as navegações do site nessa rota. O resto do site não muda |
| D4 | **Passes trocados por diamantes do jogo, sem dinheiro real** | Decisão do Pedro Felipe nesta sessão. Não há gateway de pagamento, o público é uma criança e o prompt proíbe cobrança real sem aprovação. Os valores de referência (R$ 1,99 e R$ 4,90) ficam na configuração |
| D5 | **Persistência local, com um repositório trocável por API** | Não existe backend. Toda regra de economia é pura, idempotente e testada, pronta para rodar no servidor quando ele existir |
| D6 | **Baús com conteúdo mostrado antes de abrir** | Nada de sorteio pago (loot box) num jogo infantil. O baú é um pacote fixo e conhecido |
| D7 | **Ranking honesto** | Sem servidor não existe ranking online. A tela mostra recordes pessoais reais e diz que o ranking entre jogadores depende do servidor. Dados de outros jogadores não são inventados |
| D8 | **Arte 3D procedural, feita em código** | Os modelos são gerados por geometria e textura em canvas. Assim não há risco de licença nem de personagem protegido de terceiros |
| D9 | **Modo calmo e movimento reduzido respeitados** | O site é usado por uma criança autista. Clarões, tremor de câmera e órbita automática desligam quando o sistema ou o modo calmo pedem |

## 5. Riscos

| Risco | Gravidade | Mitigação |
| --- | --- | --- |
| Economia validada só no aparelho (dá para editar o `localStorage`) | Média: o jogo é local, sem dinheiro e sem disputa entre jogadores | Saneamento rigoroso ao carregar, idempotência por id de transação, regras puras prontas para o servidor (marco 6) |
| Desempenho em tablet fraco | Alta para a experiência | Qualidade automática que só desce, materiais compartilhados, peças instanciadas, sombras desligadas na qualidade baixa, pixel ratio limitado |
| Perda de contexto WebGL | Média | Tratamento de `webglcontextlost`: pausa e mensagem; `restored` recria a cena |
| Escopo gigante (backend, E2E, CI) | Alta | Entrega em marcos verticais. Backend, Playwright e CI ficam como demandas bloqueadas ou pendentes na fila, nunca como "feito" |
| Hidratação e pré-render | Baixa | A rota é renderizada só no navegador (`RenderMode.Client`), como os outros jogos |

## 6. Itens do prompt que não cabem nesta entrega, com o motivo

- **Backend com Node, Prisma e PostgreSQL, autenticação, validação no servidor e auditoria:** não há servidor, credenciais nem infraestrutura. Fica **BLOCKED** até existir o projeto de API (veja AV-012 na fila).
- **GitHub Actions:** o repositório não tem workflows. A criação foi planejada (AV-013), mas mexe no pipeline do site inteiro e precisa de aprovação.
- **Playwright E2E e ESLint:** são dependências novas e precisam de aprovação (AV-014). A jornada é coberta hoje por testes de unidade e de integração dos serviços em Karma.
- **Pagamento real:** fora de escopo por decisão explícita.
