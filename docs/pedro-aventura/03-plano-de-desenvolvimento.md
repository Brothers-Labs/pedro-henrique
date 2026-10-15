# Pedro Aventura: Temporada do Pedro 3D — Plano de desenvolvimento

Plano de execução, do começo ao fim, do jogo em `/pedro-aventura`. As decisões que levaram a este plano estão em [01-analise.md](01-analise.md), e a fila executável em [CLAUDE_QUEUE.md](CLAUDE_QUEUE.md).

---

## 1. Objetivo do produto

Um jogo 3D de corrida e parkour com o Pedro e o cachorro dele. A criança:

1. abre o lobby;
2. escolhe uma fase no mapa de seis regiões;
3. corre desviando, pulando, derrapando e quebrando caixas;
4. pega moedas, corações e coroas;
5. cumpre missões, sobe no passe de temporada e resgata prêmios que aparecem no personagem, no cachorro e no carro do lobby.

O progresso fica salvo no aparelho.

**Jornada principal (smoke):** Lobby → Mapa → Fase → Vitória → XP → Missão → Recompensa → Persistência → Retorno ao jogo.

## 2. Arquitetura

### 2.1 Camadas

```text
features/pedro-aventura/
├── pedro-aventura.routes.ts   rotas filhas, todas lazy
├── config/                    dados de design: regiões, fases, temporada, missões, cosméticos, economia
├── models/                    tipos: estado salvo, fases, temporada, missões, cosméticos, partida
├── rules/                     regras PURAS da economia e da progressão (testadas)
├── simulation/                gerador de fases e simulação da corrida, PUROS (testados, sem three)
├── engine/                    three.js: palco, modelos procedurais, cenas (lobby, mapa, corrida), entrada
├── services/                  estado reativo (signals), persistência e áudio
├── shell/                     moldura do jogo: barra superior, carteira, navegação
├── components/                peças de interface: painel, controles de toque, cartões, trilha do passe
└── pages/                     lobby, mapa, fase, missões, passe, loja, personagem, ranking, configurações
```

**Regra de dependência:** `pages → components → services → rules/simulation → config/models`.

- `engine` só é importado por `import()` dinâmico, para que o three.js nunca entre no bundle inicial.
- `simulation` não conhece three.js nem Angular.
- `rules` não conhece navegador nem relógio: recebe `now` como parâmetro.

### 2.2 Separação pedida no prompt

| Preocupação | Onde mora |
| --- | --- |
| Rendering | `engine/aventura-stage.ts`, `engine/*-scene.ts` |
| Game state | `services/aventura-store.service.ts` (um signal com o estado inteiro) |
| Gameplay | `simulation/run-simulation.ts` |
| Input | `engine/run-input.ts` (teclado, gamepad, toque e gestos) |
| Physics | `simulation/run-simulation.ts` (passo fixo de 1/60 s, caixas de colisão por faixa) |
| UI | `shell/`, `components/`, `pages/` |
| Audio | `services/aventura-audio.service.ts` (Web Audio sintetizado, sem música licenciada) |
| Progression | `rules/campaign.ts`, `rules/season-pass.ts` |
| Economy | `rules/wallet.ts`, `rules/inventory.ts`, `config/economy.config.ts` |
| Persistence | `services/aventura-repository.ts` (contrato) e a implementação em `localStorage` |
| Networking | O contrato `AventuraRepository` é o ponto de troca para uma API (AV-012) |

### 2.3 Reaproveitamento consciente

São importados utilitários de motor já testados, sem estado de jogo:

- `GameLoop`;
- `QUALITY`, `FrameBudgetMonitor` e `initialQualityTier`;
- `disposeTree`;
- `SeededRandom` e `seedFromText`.

Também é usado o `MotionPreferenceService` do núcleo. **Nada** do estado, dos serviços ou das telas do Maker, do Kart, do Flash ou do mascote é usado nem alterado.

### 2.4 Tela cheia

- A rota tem `data: { immersive: true }`.
- O `App` lê esse dado ao fim de cada navegação e esconde o cabeçalho, os menus, o rodapé e a barra inferior do site.
- O `<router-outlet>` continua o mesmo, então nenhum componente é recriado à toa.

## 3. Estado salvo (contrato de persistência)

Chave: `pedro-henrique:pedro-aventura:v1`. A versão do esquema fica no próprio documento.

```ts
AventuraState {
  version: 1
  profile:   { createdAt, totalRuns, totalWins, bestScoreByLevel... }
  wallet:    { coins, diamonds, transactions: WalletTransaction[] }   // últimas N, id idempotente
  campaign:  { levels: Record<levelId, PlayerLevelProgress> }         // estrelas, recorde, tentativas
  season:    { seasonId, xp, passes[], claimedRewards[], history[] }  // RewardClaim por chave nível:faixa
  missions:  { progress: Record<missionId, MissionProgress> }         // valor, período, resgatada
  inventory: { owned: CosmeticId[], equipped: { outfit, dog, vehicle } }
  settings:  { quality, musicVolume, effectsVolume, touchControls }
}
```

Equivalência com os modelos do prompt:

| Modelo do prompt | Onde fica no estado salvo |
| --- | --- |
| Wallet / WalletTransaction | `wallet` |
| SeasonPass / RewardClaim | `season.passes` / `season.claimedRewards` |
| Mission / MissionProgress | `config` / `missions.progress` |
| World / GameLevel | `config/regions` |
| PlayerLevelProgress | `campaign.levels` |
| LevelAttempt | id de tentativa idempotente na transação |
| Cosmetic / EquippedCosmetic / Inventory | `config/cosmetics` / `inventory` |
| Season / SeasonLevel / Reward | `config/season` |

**Garantias:**

- Cada concessão de moeda ou diamante é uma `WalletTransaction` com id único. Repetir o mesmo id não muda o saldo.
- Saldo negativo é recusado.
- Resgate repetido de prêmio é recusado pela chave `nível:faixa`.
- O resultado de uma partida carrega um `attemptId`. Enviar duas vezes não paga duas vezes.
- Ao carregar, o estado é saneado campo a campo: ids desconhecidos saem, números inválidos voltam a zero e um dado corrompido recomeça do zero sem quebrar.

## 4. Gameplay: corrida 3D em terceira pessoa

### 4.1 Estados formais

`LOADING → READY → PLAYING ⇄ PAUSED → VICTORY | DEFEAT`, mais o estado `ERROR`.

### 4.2 Mecânicas

- **Faixas:** três. O Pedro corre sozinho para a frente, com velocidade definida pela região, e acelera aos poucos.
- **Trocar de faixa:** ◀ ▶, A/D, setas ou deslizar o dedo.
- **Pular:** Espaço, W ou ↑. A física é balística, com gravidade.
- **Derrapar:** S ou ↓. Abaixa o corpo por 0,7 s e passa por baixo de barras.
- **Atacar:** E ou F. Quebra caixas à frente.
- **Gamepad:** direcional ou analógico, A pula, B derrapa, X ataca e Start pausa.

**Obstáculos:**

| Obstáculo | Como passar |
| --- | --- |
| Barreira | Pular ou trocar de faixa |
| Barra alta | Derrapar |
| Caixa | Atacar, pular ou trocar de faixa |
| Cone | Pular |
| Carro parado | Trocar de faixa |
| Carro em movimento (trânsito) | Trocar de faixa |
| Barreira que varre as faixas (deserto) | Esperar a abertura ou pular |

**Rampas:** lançam o Pedro alto e contam para as missões.

**Coletáveis:**

| Coletável | Efeito |
| --- | --- |
| Moeda | Vai para a carteira ao vencer |
| Coração | +1 vida, até o máximo |
| Coroa | Item especial, 3 por fase |

**Vidas, checkpoints e derrota:**

- O Pedro tem 3 corações. Cada batida tira um coração e dá 1,5 s de invencibilidade.
- Os checkpoints ficam em 1/3 e em 2/3 da pista.
- Com zero corações vem a **DERROTA**, com duas opções: "Continuar do checkpoint" (corações cheios, moedas da tentativa mantidas) e "Reiniciar fase".

**Objetivos da fase:**

1. Completar o percurso.
2. Coletar N moedas.
3. Saltar N rampas.
4. Chegar antes do tempo-alvo.

As estrelas saem dos objetivos: só completar dá 1; completar e cumprir mais algum dá 2; cumprir todos dá 3.

**Cronômetro e progresso:** o cronômetro tem precisão de centésimos. A barra de progresso do percurso fica no painel.

### 4.3 Geração de fases

Cada fase é um registro de dados (região, número, comprimento, velocidade, densidade, tipos de obstáculo, tempo-alvo e metas). O gerador transforma esse registro numa pista de forma **determinística**, por semente.

- **Regra de segurança:** toda fileira de obstáculos deixa pelo menos uma faixa livre ou uma forma de passar (pular, derrapar ou atacar). Um teste percorre todas as fases do jogo e confere isso.
- **Fases novas:** acrescentar uma região é acrescentar dados, sem tocar no motor.

## 5. Mapa e campanha

| Região | Fases | Identidade | Desbloqueio |
| --- | --- | --- | --- |
| 1. Ilha Inicial | 5 | Praia, palmeiras, tutoriais | Aberta |
| 2. Zona Urbana | 5 | Asfalto, prédios, trânsito | 8 estrelas na Ilha |
| 3. Montanha Radical | 5 | Pedra, neve, rampas, precisão | 8 estrelas na Zona Urbana |
| 4. Cidade do Luxo | 5 | Neon dourado, carros especiais | 8 estrelas na Montanha |
| 5. Deserto Xtreme | 5 | Dunas, barreiras que varrem | 8 estrelas na Cidade |
| 6. Eventos Especiais | 3 | "Corrida Noturna", por tempo limitado | Janela de datas do evento e Ilha concluída |

- Dentro da região, as fases abrem em sequência: vencer a fase N abre a N+1.
- O mapa é uma cena 3D (ilhas no oceano, cada região com cor e marco próprios), com clique ou toque na ilha.
- Uma faixa de cartões acessível, com teclado e leitor de tela, mostra as mesmas regiões, com estrelas, cadeado e condição de desbloqueio.

## 6. Temporada, missões, passe e economia

### 6.1 Temporada

- **Datas e nível:** começo e fim configuráveis. O nível de temporada vai de 1 a 20, e o XP pedido sobe a cada nível.
- **Encerramento:** passado o fim, o XP para de subir e os prêmios já alcançados continuam resgatáveis. A temporada vai para o histórico.
- **Nova temporada:** criar uma é acrescentar dados.

### 6.2 Missões (orientadas a eventos da partida)

| Categoria | Período | Exemplos |
| --- | --- | --- |
| Diárias | Zeram no dia seguinte | Completar 1 fase; coletar 10 corações; saltar 5 rampas |
| Semanais | Zeram na segunda-feira | Completar 10 fases; coletar 100 moedas; fase sem perder vidas |
| Temporada | Até o fim da temporada | Desbloquear uma nova região; terminar abaixo do tempo-alvo 5 vezes |
| Especiais | Janela do evento | Vencer a Corrida Noturna |

**O que cada missão define:** id, categoria, métrica, meta, recompensa e período, que serve de chave de expiração.

**Como o progresso anda:** ele só avança a partir de eventos da partida (`run-finished`, `region-unlocked`). Nenhum valor é digitado pela interface.

**Resgate:** é feito por toque e é idempotente.

### 6.3 Passe

| Faixa | Como libera | Conteúdo |
| --- | --- | --- |
| Gratuito | Sempre | Moedas, diamantes e cosméticos básicos |
| VIP | 199 💎 | Skins especiais, baús e veículos |
| Luxo | 490 💎 (inclui o VIP; quem já tem o VIP paga a diferença) | Skin lendária "Pedro Elite", "Rex Gold" e "Lambo Gold" |

- **Comprar níveis:** troca diamantes por XP de temporada.
- **Baú:** o conteúdo é fixo e aparece antes de abrir. Não é loot box.
- **Preços em reais:** os valores de referência (R$ 1,99 e R$ 4,90) ficam na configuração, com `isRealPaymentEnabled: false`.

### 6.4 Economia

- **De onde vêm as moedas:** pegas na fase (creditadas só na vitória) e dadas pelas missões e pelo passe.
- **De onde vêm os diamantes:** primeira vitória de cada fase, missões e passe.
- **Loja:** troca moedas ou diamantes por cosméticos.
- **Carteira:** é um livro-caixa com transações idempotentes.

## 7. Visual, áudio e acessibilidade

- **Tema:** preto profundo, dourado metálico e azul neon, com cartões de vidro translúcido (tokens próprios da feature).
- **Qualidade:** Automática, Alta, Média e Baixa. A automática começa pelo aparelho e desce se os quadros engasgarem.
  - Sombra e antialias saem na Baixa.
  - O pixel ratio tem teto por nível de qualidade.
- **Movimento reduzido e modo calmo:** desligam a órbita da câmera do lobby, o balanço da câmera, as partículas extras e as animações de interface.
- **Áudio sintetizado com Web Audio, sem licença de terceiros:**
  - música do lobby e da corrida;
  - efeitos de moeda, pulo, batida, vitória, derrota, desbloqueio e resgate.
  - O som só começa depois do primeiro toque, por causa da política de reprodução automática.
  - Volumes separados para música e efeitos.
- **Acessibilidade:**
  - todo botão tem nome acessível e foco visível;
  - os diálogos são `<dialog>` nativos;
  - a informação nunca depende só de cor;
  - o painel tem região `aria-live` para vida perdida e vitória.
- **Celular:** layout a partir de 360 px, alvos de toque de 56 px ou mais, controles de toque automáticos ou forçados nas configurações.

## 8. Desempenho

- **Metas iniciais:** 60 FPS em desktop de referência e 30 FPS ou mais em tablet compatível. **Só valem depois de medidas** (AV-015).
- **Técnicas:**
  - materiais compartilhados por cor;
  - `InstancedMesh` para moedas e palmeiras;
  - reaproveitamento (pooling) das peças da pista conforme o Pedro avança, para manter só a janela visível;
  - `disposeTree` ao sair;
  - `ResizeObserver` desconectado;
  - rAF cancelado;
  - pausa no `visibilitychange`.
- **Carregamento:** o three.js e o motor só baixam ao abrir o lobby, o mapa ou a fase, pelo chunk lazy da rota.
- **Perda de contexto WebGL:** pausa e mostra uma mensagem. Na restauração, recria a cena.

## 9. Testes

| Camada | O que é testado |
| --- | --- |
| `rules/wallet` | crédito, débito, idempotência, saldo negativo recusado, limite do livro-caixa |
| `rules/campaign` | estrelas por objetivo, desbloqueio de fase e de região, recordes |
| `rules/missions` | progresso por evento, períodos diário e semanal, resgate único |
| `rules/season-pass` | XP para nível, elegibilidade por faixa, resgate duplicado recusado, VIP→Luxo pela diferença, encerramento |
| `rules/inventory` | compra com saldo, compra repetida recusada, equipar só o que tem |
| `rules/apply-run` | uma partida aplica moedas, XP, missões e desbloqueios de uma vez; o mesmo `attemptId` não paga duas vezes |
| `rules/sanitize` | estado corrompido ou parcial carregado sem quebrar |
| `simulation/level-generator` | determinismo; toda fase do jogo é passável |
| `simulation/run-simulation` | estados, pulo, derrapar, colisão, vidas, checkpoint, vitória, derrota, coleta, rampas |
| `services/aventura-store` | integração da jornada: vitória → XP → missão → resgate → recarregar o serviço → estado preservado |
| `App` | modo imersivo esconde a moldura do site só em `/pedro-aventura` |

E2E com Playwright fica para depois (AV-014): é uma dependência nova e precisa de aprovação.

## 10. Marcos e fila

| Marco | Demandas | Saída verificável |
| --- | --- | --- |
| 1. Fundação | AV-001 rota e tela cheia · AV-002 estado e persistência · AV-003 regras puras | `/pedro-aventura` abre sem a moldura do site; testes de regras verdes |
| 2. Vertical slice | AV-004 gerador e simulação · AV-005 motor 3D e cena da corrida · AV-006 fase jogável (painel, controles, resultado) | Uma fase completa jogável no desktop e no celular, com progresso salvo |
| 3. Mapa e campanha | AV-007 seis regiões, mapa 3D, desbloqueio | Fluxo mapa → fase → próxima fase |
| 4. Temporada | AV-008 missões · AV-009 passe · AV-010 loja, inventário e personagem | Jornada smoke completa |
| 5. Polimento | AV-011 lobby 3D, áudio, configurações e qualidade | Lobby com Pedro e o cachorro animados; volumes; qualidade |
| 6. Produção | AV-012 backend (BLOCKED) · AV-013 CI (precisa de aprovação) · AV-014 E2E e lint (precisa de aprovação) · AV-015 benchmarks em aparelho real | Depende de infraestrutura e de decisão humana |

## 11. Definição de pronto (por demanda)

Uma demanda está pronta quando:

- os critérios de aceite estão atendidos;
- `npm run build` passou;
- `npx ng test --watch=false --browsers=ChromeHeadless` passou;
- o texto em pt-BR está acentuado e sem mojibake;
- o diff foi revisado;
- o commit foi integrado à `staging` atualizada, com push.

Sem GitHub Actions no repositório, a etapa de CI fica registrada como **não aplicável**, não como aprovada.

## 12. Como reverter

O jogo inteiro mora em `features/pedro-aventura/` mais quatro pontos de integração:

- a rota em `app.routes.ts`;
- o modo imersivo em `app.ts`, `app.html` e `app.scss`;
- a fila e os documentos em `docs/pedro-aventura/`;
- a seção no `README.md`.

Para reverter, basta tirar a rota e o modo imersivo. O resto do site não depende de nada dele.
